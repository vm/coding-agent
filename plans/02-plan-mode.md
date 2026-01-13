# Plan Mode

## Context: what this plan is and when to use it

This plan describes a **read-only "planning" mode** for the agent: the agent can inspect the repo (read/list/run safe commands) but **cannot edit files**.

- **When you want this**: you want an implementation plan first (file list + steps), without any modifications happening automatically.
- **What it enables**:
  - safer exploration (no accidental edits)
  - structured output you can review before applying changes
- **How you'd use it in this repo**:
  - run the agent in plan mode to produce a plan document you can paste into an issue/PR description
  - optionally serialize the plan to a file via a CLI flag

This plan intentionally avoids implementation-sized code blocks. The source of truth should live in `src/` and be validated by `tests/`.

## How you'd run it (intended UX)

- **Interactive**: `bun run start`
- **Plan mode**: `bun run start plan "your request here"`
- **Plan mode to file**: `bun run start plan "your request here" --output plan.md`

## Tool availability (what plan mode allows)

Plan mode should make it impossible (or at least very hard) for the model to mutate the repo.

Minimum allowed tools:

- [x] `read_file`
- [x] `list_files`
- [ ] `edit_file` (blocked)
- [ ] `run_command` (blocked — see rationale below)

### Why block `run_command` entirely

Prompt-only safety ("please only run read-only commands") is insufficient:
- The model can be jailbroken or confused into running destructive commands
- Allowlist enforcement is complex (need to parse shell syntax, handle pipes, etc.)
- The safest approach is to remove the capability entirely in plan mode

If you need command output in plan mode (e.g., `git status`), consider:
- Pre-running specific commands and injecting results into the system prompt
- Adding a separate `git_status` read-only tool
- Running plan mode with explicit user approval for each command (future feature)

## Concrete file/API targets

On `main`, the agent doesn't currently support plan mode. Add it by extending `AgentOptions`:

- **Modify**: `src/agent/types.ts`
  - add `AgentMode` type: `'normal' | 'plan'`
  - extend `AgentOptions` with:
    - `mode?: AgentMode`
    - `systemPrompt?: string`
    - `toolFilter?: (name: string) => boolean`
- **Modify**: `src/agent/agent.ts`
  - in `makeApiCallWithRetry`, use `system: this.options.systemPrompt ?? getSystemPrompt()`
  - filter tools based on `this.options.toolFilter` before passing to API
  - add `getToolsForMode()` helper that filters out `edit_file` and `run_command` in plan mode
- **Add**: `src/agent/plan-agent.ts`
  - exports `createPlanAgent(client?: Anthropic): Agent`
  - sets:
    - `mode: 'plan'`
    - `systemPrompt` to a "PLAN MODE" prompt
    - `toolFilter` that blocks `edit_file` and `run_command`
- **Modify**: `src/index.tsx`
  - add a `plan` subcommand that uses `createPlanAgent()` and exits after printing the response
  - support optional `--output <file>` to write the plan text

This matches the existing architecture: Agent config is passed through the constructor; tools are filtered before being sent to the model.

## Where to start in this repo

- **Entry point / argument routing**: `src/index.tsx`
- **Agent core**: `src/agent/agent.ts`, `src/agent/types.ts`
- **Existing tests to extend**: `tests/agent/agent.test.ts`, `tests/index.test.ts`

---

## Phase 1: Tests (define behavior)

### Agent tool filtering

- [ ] **Blocks editing**: in plan mode, `edit_file` is not in the tools array sent to the API
- [ ] **Blocks commands**: in plan mode, `run_command` is not in the tools array sent to the API
- [ ] **Allows reads**: `read_file` continues to work normally
- [ ] **Allows listing**: `list_files` continues to work normally

### System prompt behavior

- [ ] **Plan prompt differs**: plan mode uses a plan-specific system prompt that makes "no edits" explicit
- [ ] **Includes working directory**: prompt includes the current working directory path for grounding
- [ ] **Custom prompt override**: when `systemPrompt` is provided in options, it overrides the default

### CLI behavior

- [ ] **Subcommand detection**: `plan` is detected as a first argument
- [ ] **Prompt parsing**: the user's prompt is captured correctly (excluding flags)
- [ ] **Optional output**: `--output <file>` writes the plan response to disk
- [ ] **Exit code**: plan mode exits 0 on success, non-zero on error

### Suggested test cases (more specific)

- [ ] **Tools are filtered in plan mode**:
  - construct `new Agent(mockClient, { mode: 'plan' })`
  - call `agent.chat("...")`
  - assert `mockCreate.mock.calls[0][0].tools` does not include `edit_file` or `run_command`
  - assert `mockCreate.mock.calls[0][0].tools` includes `read_file` and `list_files`
- [ ] **Custom system prompt is used**:
  - construct agent with `systemPrompt: 'Custom prompt'`
  - call `agent.chat("...")`
  - assert `mockCreate.mock.calls[0][0].system` equals `'Custom prompt'`
- [ ] **Plan mode system prompt contains expected markers**:
  - construct plan agent via `createPlanAgent(mockClient)`
  - call `agent.chat("...")`
  - assert system prompt contains `PLAN MODE` and `do not edit`

### Test file mapping (exactly where to add things)

- **Update**: `tests/agent/agent.test.ts`
  - add test for tool filtering with `mode: 'plan'`
  - add test for custom `systemPrompt` override
- **Add**: `tests/agent/plan-agent.test.ts`
  - test `createPlanAgent()` returns correctly configured agent
- **Update**: `tests/index.test.ts`
  - allow additional CLI logic beyond just the render call

---

## Phase 2: Implementation (minimal)

### Files to add / modify (on `main`)

- [ ] **Modify**: `src/agent/types.ts` to include mode and prompt options
- [ ] **Modify**: `src/agent/agent.ts` to apply mode-specific tool filtering
- [ ] **Add**: `src/agent/plan-agent.ts` for plan agent factory
- [ ] **Modify**: `src/index.tsx` to add a `plan` CLI path (keep `render(<App />)` as the normal path)
- [ ] **Update**: `tests/index.test.ts` to allow the new CLI branching

## Implementation checklist (ordered)

- [ ] **1) Extend Agent options (`src/agent/types.ts`)**
  - Add `export type AgentMode = 'normal' | 'plan'`
  - Add to `AgentOptions`:
    - `mode?: AgentMode`
    - `systemPrompt?: string`
    - `toolFilter?: (name: string) => boolean`
  - Verify TypeScript passes existing tests unchanged

- [ ] **2) Use `systemPrompt` override in `src/agent/agent.ts`**
  - In constructor, set `this.options.systemPrompt` default to `undefined`
  - In `makeApiCallWithRetry`, pass `system: this.options.systemPrompt ?? getSystemPrompt()`
  - Verify with a unit test that the mocked API call receives the custom system prompt

- [ ] **3) Implement tool filtering in `src/agent/agent.ts`**
  - Add helper: `getFilteredTools(): Tool[]`
    - if `this.options.toolFilter` exists, filter tools through it
    - otherwise return all tools
  - In `makeApiCallWithRetry`, use `tools: this.getFilteredTools()`
  - Verify with a test that a toolFilter excluding `edit_file` results in API call without it

- [ ] **4) Add `src/agent/plan-agent.ts`**
  - Create `getPlanSystemPrompt()` that includes:
    - `PLAN MODE` marker
    - explicit "do not edit files" instruction
    - current working directory
    - instructions to output structured plan (Files/Steps/Testing/Risks)
  - Create `planToolFilter(name: string): boolean` that returns false for `edit_file` and `run_command`
  - Export `createPlanAgent(client?: Anthropic): Agent` that constructs agent with:
    - `mode: 'plan'`
    - `systemPrompt: getPlanSystemPrompt()`
    - `toolFilter: planToolFilter`
  - Verify by instantiating the plan agent in a unit test

- [ ] **5) Add CLI routing in `src/index.tsx`**
  - Parse `process.argv.slice(2)` to detect `plan` subcommand
  - If first arg is `plan`:
    - Extract prompt from remaining args (handle quoted strings)
    - Extract `--output <file>` if present
    - Create plan agent via `createPlanAgent()`
    - Call `agent.chat(prompt)`
    - Print response to stdout
    - If `--output` provided, write to file
    - Exit process
  - Else, keep the existing `render(<App />...)` path unchanged
  - Update `tests/index.test.ts` so it still asserts the render call exists but allows additional logic

### Output shape

Plan mode output should include (enforced via system prompt):

- [ ] **Files to touch**: create/modify/delete list (paths + intent)
- [ ] **Ordered steps**: a sequence of actions, each tied to a file
- [ ] **Testing**: how to validate the change (commands + key test cases)
- [ ] **Risks**: edge cases / rollback notes

## Example plan output (short)

This is the level of specificity we want (structured, but not full code):

```
Title: Add plan mode

Files:
- src/index.tsx (modify): route "plan" subcommand
- src/agent/agent.ts (modify): support tool filtering
- src/agent/plan-agent.ts (add): plan agent factory

Steps:
1) Parse CLI args to extract prompt and --output
2) Create an agent configured for plan mode (filtered tool list)
3) Print plan text; optionally write to output file

Testing:
- bun test
- verify edit_file is not available in plan mode

Risks:
- CLI arg parsing edge cases with quotes
```

---

## Phase 3+: Production hardening (optional)

- [ ] **Structured plan extraction**: enforce a plan block format and parse it for validation
- [ ] **Plan validation**: validate required fields and warn on missing details
- [ ] **JSON output**: optionally emit parsed plan JSON for automation via `--format json`
- [ ] **Interactive plan approval**: show plan, ask for confirmation, then execute in normal mode

---

## Definition of done

- [ ] In plan mode, the agent cannot make filesystem changes through tools (`edit_file` and `run_command` are filtered out)
- [ ] The plan output clearly lists files + steps + testing notes (even if brief)
- [ ] CLI parsing behavior is covered by tests
- [ ] Normal mode (`bun run start`) continues to work unchanged

---

## Step-by-step build recipe

### Step 0: Confirm baseline behavior on `main`

- `src/index.tsx` unconditionally renders the Ink UI
- `src/agent/agent.ts` always uses `tools` from `src/tools/index.ts` and `getSystemPrompt()` to build API calls

### Step 1: Add mode type to `src/agent/types.ts`

- Add `export type AgentMode = 'normal' | 'plan'`
- Extend `AgentOptions` with `mode?: AgentMode`, `systemPrompt?: string`, `toolFilter?: (name: string) => boolean`

Acceptance criteria:
- Existing code compiles with new fields omitted (defaults to normal behavior)

### Step 2: Make `Agent` use custom system prompt (`src/agent/agent.ts`)

Implementation:
- In constructor, add `systemPrompt: options?.systemPrompt` to options
- In `makeApiCallWithRetry`, change line 118 to: `system: this.options.systemPrompt ?? getSystemPrompt()`

Acceptance criteria:
- When `systemPrompt` is provided, the API call uses it
- When `systemPrompt` is omitted, behavior is unchanged

### Step 3: Define tool filtering

In `src/agent/agent.ts`:

- Add private method `getFilteredTools()`:
  - `const filter = this.options.toolFilter ?? (() => true)`
  - `return tools.filter(t => filter(t.name))`
- In `makeApiCallWithRetry`, change line 119 to: `tools: this.getFilteredTools()`

Acceptance criteria:
- When `toolFilter` excludes `edit_file`, the API call's tools array does not contain it
- When `toolFilter` is omitted, all tools are included

### Step 4: Create plan agent factory (`src/agent/plan-agent.ts`)

- Export `createPlanAgent(client?: Anthropic): Agent`
- Use filtered tools: `toolFilter: (name) => name !== ToolName.EDIT_FILE && name !== ToolName.RUN_COMMAND`
- Use plan-specific system prompt with `PLAN MODE` marker

### Step 5: Add CLI routing in `src/index.tsx`

Desired CLI UX:
- `bun run start` → starts Ink UI (current behavior)
- `bun run start plan "do X"` → runs plan mode once, prints output, exits `0`
- `bun run start plan "do X" --output plan.md` → additionally writes the output to `plan.md`

Implementation notes:
- Keep the existing `render(<App />, { exitOnCtrlC: true })` codepath intact
- Add conditional before `render` that checks `process.argv.slice(2)[0] === 'plan'`
- For plan mode, use async IIFE or top-level await

### Step 6: Update tests

#### `tests/agent/agent.test.ts`
- Add test that constructs `new Agent(mockClient, { toolFilter: (n) => n !== 'edit_file' })`
- Assert `mockCreate.mock.calls[0][0].tools` does not include `edit_file`
- Add test that sets `systemPrompt` and asserts the API call uses it

#### `tests/agent/plan-agent.test.ts`
- Test `createPlanAgent()` returns agent with correct configuration

#### `tests/index.test.ts`
- Update to allow additional CLI logic beyond just the render call
