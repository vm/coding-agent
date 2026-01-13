# File State Management

## Context: what this plan is and when to use it

This plan describes how to add **file safety + context loading** to the agent.

- **When you want this**: the agent reads a file, then later tries to edit it, but the file might have changed externally (editor autosave, git checkout, formatter, etc.). You want to avoid overwriting those changes.
- **What it enables**:
  - **Conflict detection**: block `edit_file` if the target changed since the agent last read it.
  - **agents.md injection**: automatically load directory-level instructions (`agents.md`) when the agent starts touching files in that directory.
- **How you'd use it in this repo**:
  - Run `bun test` while iterating to lock behavior down.
  - Integrate into tool implementations in `src/tools/` and the agent in `src/agent/`.

This document intentionally avoids implementation-sized code blocks. The source of truth should live in `src/` and be validated by `tests/`.

## Where to start in this repo

- **Tool implementations**: `src/tools/read-file.ts`, `src/tools/edit-file.ts`
- **Agent orchestration**: `src/agent/agent.ts`
- **Types**: `src/agent/types.ts`
- **Existing tool tests**: `tests/tools/read-file.test.ts`, `tests/tools/edit-file.test.ts`

## Concrete file/API targets

Create a tracker module and integrate it in exactly these places:

- **Add**: `src/file-tracker.ts`
  - exports `class FileTracker`
  - DO NOT use a singleton—pass the instance through `AgentOptions` for testability
- **Modify**: `src/agent/types.ts`
  - add `fileTracker?: FileTracker` to `AgentOptions`
- **Modify**: `src/tools/index.ts`
  - change `executeTool` signature to accept an optional `FileTracker` instance
- **Modify**: `src/agent/agent.ts`
  - pass `this.options.fileTracker` to `executeTool` calls
  - after a successful `read_file` tool_result, inject `agents.md` context (see below)

Target API (signatures only):

```
trackRead(path: string): void
hasBeenModifiedSinceRead(path: string): boolean
getAgentsMdIfNew(filePath: string): string | null
clearSession(): void
```

### Conflict detection strategy

Use **content hashing** instead of mtime to avoid false positives:

- On `trackRead(path)`: store `{ path, hash: sha256(content), size: content.length }`
- On `hasBeenModifiedSinceRead(path)`: recompute hash and compare
- This avoids false positives from `touch`, editor saves without changes, or filesystem mtime resolution issues

If performance becomes an issue, optimize with a fast hash (xxhash) or size+partial-hash check.

---

## Phase 1: Tests (define behavior)

## Concrete examples (what should happen)

### Example: conflict detection (happy path)

- **Given**: agent calls `read_file` on `src/tools/read-file.ts`
- **When**: nothing else changes the file
- **Then**: a later `edit_file` targeting that path is allowed

### Example: conflict detection (blocked path)

- **Given**: agent calls `read_file` on `src/tools/read-file.ts`
- **When**: the file is modified externally (editor autosave, formatter, `git checkout`, etc.)
- **Then**: `edit_file` returns an error message and does not write

Suggested error text (exact string not required, but include these pieces):

- file path
- "modified since last read"
- instruction to "read_file again"

### Example: agents.md injection

If the agent reads a file in a directory that contains an `agents.md`, the agent should receive that content as additional context once per session.

Example directory layout:

```
src/
  agents.md
  tools/
    agents.md
    read-file.ts
```

Expected behavior:

- reading `src/tools/read-file.ts` injects `src/agents.md` and `src/tools/agents.md` (order: parent before child)
- subsequent reads in the same directory do not re-inject those files until the session is cleared

### Unit tests: file modification tracking

- [ ] **Track reads**: after the agent reads a file, it is considered "tracked"
- [ ] **No conflict**: if the file hasn't changed since tracking, conflict check returns false
- [ ] **Conflict**: if the file changed since tracking, conflict check returns true
- [ ] **Untracked file**: conflict check returns false (allow edits to new files)
- [ ] **Re-track**: tracking again clears a previous conflict
- [ ] **Content-based**: touching a file without changing content does not trigger conflict

### Unit tests: agents.md loading

- [ ] **Same directory**: when `agents.md` exists next to a file, it is returned
- [ ] **Missing**: returns null when no `agents.md`
- [ ] **Session dedupe**: same `agents.md` is only returned once per session
- [ ] **Session reset**: clearing session allows the same `agents.md` to be returned again
- [ ] **Parent directories**: walking up from file path collects all agents.md files

### Integration tests (existing tool tests)

- [ ] **read_file**: reading a file should mark it tracked (when tracker is provided)
- [ ] **edit_file**: editing a previously read file should fail with a clear error if it changed since the read
- [ ] **edit_file success path**: after successful edit, tracking updates to the new version

### Suggested test cases (more specific)

- [ ] **read_file marks tracked**:
  - call `read_file(path)` once
  - immediately check "modified since read" is false
- [ ] **edit_file blocked after external modification**:
  - call `read_file(path)`
  - modify the file via normal fs write in the test
  - call `edit_file(path, old, new)` and assert it returns an error string and does not change the file
- [ ] **edit_file new file creation is allowed**:
  - if your tool supports "create new file when old_str is empty", this path should not require prior tracking
  - assert it creates the file successfully
- [ ] **agents.md injected once**:
  - read a file in a directory with `agents.md`
  - assert the agent receives the rules once
  - read another file in same directory and assert no duplicate injection
  - clear session and assert injection happens again
- [ ] **content hash avoids false positive**:
  - read a file, then touch it (update mtime without changing content)
  - assert conflict check returns false

## Agent integration details (what to do in `src/agent/agent.ts`)

The existing agent loop already captures tool results and appends them to `this.conversation`.

Add one hook point:

- When a `read_file` tool completes successfully (tool result does not start with `Error:`):
  - compute `agentsMd = this.options.fileTracker?.getAgentsMdIfNew(path)`
  - if `agentsMd` is non-null, prepend it to the next API call's system prompt (or append as a user message)

Also ensure `Agent.clearHistory()` calls `this.options.fileTracker?.clearSession()` so a new session can re-load the same `agents.md`.

### Injection strategy options

**Option A: Prepend to system prompt** (recommended)
- Cleaner conversation history
- `agents.md` content appears as part of "background knowledge"
- Requires tracking which agents.md files have been injected and including them in `getSystemPrompt()`

**Option B: Inject as user message**
- Simpler implementation
- Can feel noisy in conversation history
- Content appears as "the user told me this"

---

## Phase 2: Implementation (minimal)

### Files to add / modify

- [ ] **Add**: `src/file-tracker.ts` with `FileTracker` class
- [ ] **Modify**: `src/agent/types.ts` to add `fileTracker?: FileTracker` to `AgentOptions`
- [ ] **Modify**: `src/tools/index.ts` to accept optional tracker and pass to tools
- [ ] **Modify**: `src/tools/read-file.ts` to track reads on success (when tracker provided)
- [ ] **Modify**: `src/tools/edit-file.ts` to block edits on conflicts and to update tracking on successful writes
- [ ] **Modify**: `src/agent/agent.ts` to inject `agents.md` content after the agent touches files in a directory

## Implementation checklist (ordered)

- [ ] **1) Add `src/file-tracker.ts`**
  - Exports `FileTracker` class (NOT a singleton)
  - Implements: `trackRead`, `hasBeenModifiedSinceRead`, `getAgentsMdIfNew`, `clearSession`
  - Use content hashing (sha256 or similar) for conflict detection
  - Verify by writing/adjusting unit tests that directly exercise these methods

- [ ] **2) Extend `AgentOptions` in `src/agent/types.ts`**
  - Add `fileTracker?: FileTracker`
  - Verify TypeScript passes existing tests unchanged

- [ ] **3) Update `src/tools/index.ts`**
  - Change `executeTool(name, input)` to `executeTool(name, input, tracker?)`
  - Pass tracker to `readFile` and `editFile` calls
  - Verify via existing tool tests (they should pass without providing tracker)

- [ ] **4) Wire tracking into `src/tools/read-file.ts`**
  - Change signature to `readFile(path: string, tracker?: FileTracker)`
  - After a successful read, call `tracker?.trackRead(path)`
  - Keep existing error string behavior (`Error: Failed to read file ...`)
  - Verify via `tests/tools/read-file.test.ts` that reads still return content and no errors regress

- [ ] **5) Wire conflict checking into `src/tools/edit-file.ts`**
  - Change signature to `editFile(path, oldStr, newStr, tracker?)`
  - For updates (`oldStr !== ''`):
    - If tracker exists and `tracker.hasBeenModifiedSinceRead(path)`, return `Error:` and do not write
  - For creates (`oldStr === ''`):
    - Allow create even if untracked, then call `tracker?.trackRead(path)` after write
  - Verify via `tests/tools/edit-file.test.ts` by adding a new test that simulates "read → external write → edit blocked"

- [ ] **6) Inject `agents.md` from `src/agent/agent.ts`**
  - After a successful `read_file` tool result:
    - call `this.options.fileTracker?.getAgentsMdIfNew(path)`
    - if non-null, track it and include in next system prompt (or append as user message)
  - Update `clearHistory()` to call `this.options.fileTracker?.clearSession()`
  - Verify by adding an agent test that triggers a `read_file` tool_use and then checks a follow-up API call includes the injected content

### File tracking rules

- **Conflict definition**: content hash changed since last read
- **Error behavior**: for conflicts, return an error string telling the user to re-read the file

### agents.md injection rules

- **Scope**: when a file path is accessed (at least on `read_file`; optionally on `edit_file` too), check for `agents.md` in the same directory and all parent directories
- **Order**: parent directories before child directories
- **Dedup**: only inject a given `agents.md` once per session, unless the session is cleared

---

## Definition of done

- [ ] Tests cover the conflict/no-conflict paths and session-dedup behavior
- [ ] `edit_file` returns a clear, actionable error when a conflict is detected
- [ ] `read_file` marks successful reads as tracked (when tracker provided)
- [ ] `agents.md` content is injected at most once per session per path
- [ ] No singleton patterns—all state flows through `AgentOptions`

## Phase 3+: Production hardening (optional)

- [ ] **Performance optimization**: use xxhash or partial-hash for large files
- [ ] **Deletion handling**: detect and message clearly when a tracked file was deleted
- [ ] **Invalidation hooks**: allow explicit invalidation of tracked entries when external watchers detect changes
- [ ] **File watcher integration**: optionally clear tracking on detected external changes
