# Nila Extensibility

## Context: what this plan is and when to use it

This plan describes how to add extensibility to Nila via file-based artifacts loaded into agent context.

- **When you want this**: You want reusable, version-controlled workflows that live in the repo
- **What it enables**:
  - **Commands**: Prompt-only extensions invoked via `/command-name`
  - **Skills**: Commands with colocated scripts the agent can execute
  - **Registry**: Auto-indexed discovery of available skills
  - **Implicit execution**: Agent auto-selects and runs skills based on user intent

The core primitive is file-read-based instruction loading. Extensions live under `.nila/` in the project root.

```
.nila/
  commands/
    makepr.md
    release-notes.md
  skills/
    qr-code/
      skill.md
      generate_qr.py
    codemod-logging/
      skill.md
      migrate_logging.py
  cache/
    skills_index.json
```

This plan follows TDD: write tests first, then implement to make them pass.

## Test patterns in this repo

Based on existing tests:

- **Location**: `tests/` mirrors `src/` structure
- **Framework**: `bun:test` with `describe`, `it`, `expect`, `mock`, `beforeEach`
- **Mocking**: Use `mock<FunctionType>()` for typed mocks
- **Factories**: Create helper functions like `createMockResponse()` for test data
- **File system**: Use temp directories or mock `fs` functions
- **Components**: Test with `render()` from `ink-testing-library` (see `tests/components/`)

## Where to start in this repo

- **User input handling**: `src/components/App.tsx` (where `/` prefix will be intercepted)
- **Agent system prompt**: `src/agent/agent.ts` (`getSystemPrompt()` function)
- **Tool execution**: `src/tools/run-command.ts` (used for skill scripts)
- **Types**: `src/shared/types.ts` (will need command/skill types)

---

## Phase 1: Commands v1 — Prompt-Based Extensions

The simplest form of extensibility. Commands are markdown files that get loaded into context when invoked.

### Overview

- Commands live in `.nila/commands/*.md`
- Invoked via `/command-name` (e.g., `/makepr`)
- Arguments are the raw string after the command name
- Command content is prepended to the user's message before sending to agent

### What changes

- **Add**: `src/commands/loader.ts`
  - `loadCommand(name: string): string | null` — reads command file
  - `listCommands(): CommandEntry[]` — lists available commands
  - `parseCommandInput(input: string): { command: string; args: string } | null`

- **Add**: `src/commands/types.ts`
  - `CommandEntry` type with name, description, path

- **Modify**: `src/components/App.tsx`
  - Parse user input for `/` prefix before calling `agent.chat()`
  - Extract command name and arguments
  - Load command file from `.nila/commands/{name}.md`
  - Prepend command content to user message

### Tests to write first

**File**: `tests/commands/loader.test.ts`

Unit tests for command parsing and loading (similar pattern to `tests/tools/read-file.test.ts`):

- [ ] `parseCommandInput` extracts command name from `/makepr`
- [ ] `parseCommandInput` extracts args from `/makepr fix auth bug`
- [ ] `parseCommandInput` returns null for input without `/` prefix
- [ ] `parseCommandInput` returns null for `/` alone
- [ ] `parseCommandInput` handles command with no args
- [ ] `loadCommand` returns file content when command exists
- [ ] `loadCommand` returns null when command file missing
- [ ] `loadCommand` handles missing `.nila/commands/` directory
- [ ] `listCommands` returns all `.md` files in commands directory
- [ ] `listCommands` extracts description from first line of each file
- [ ] `listCommands` returns empty array when no commands exist

**File**: `tests/commands/integration.test.ts`

Integration tests with temp directory fixtures:

- [ ] Full flow: parse input → load command → format message
- [ ] `/help` returns formatted list of commands

### Implementation checklist

- [ ] **1) Create types**
  - Add `src/commands/types.ts` with `CommandEntry`, `ParsedCommand`

- [ ] **2) Implement `parseCommandInput`**
  - Detect `/` prefix in user input
  - Extract command name (first word after `/`)
  - Extract args (everything after command name)
  - Return null for edge cases

- [ ] **3) Implement `loadCommand`**
  - Read `.nila/commands/{name}.md` from cwd
  - Return null if file doesn't exist
  - Handle missing directory gracefully

- [ ] **4) Implement `listCommands`**
  - List all `.md` files in commands directory
  - Extract description from first non-empty line
  - Return `CommandEntry[]`

- [ ] **5) Integrate into App.tsx**
  - Before calling `agent.chat()`, check for command
  - If command found, prepend its content to user message
  - Format: `{command content}\n\n---\n\nUser request: {args}`
  - If command not found, show error in transcript

- [ ] **6) Add `/help` built-in**
  - Special case in App.tsx (not a file-based command)
  - Call `listCommands()` and format output

---

## Phase 2: Skills v1 — Prompt + Script Extensions

Skills extend commands by adding colocated scripts the agent can execute.

### Overview

- Skills live in `.nila/skills/{skill-name}/`
- Each skill has a `skill.md` file describing behavior
- Scripts are colocated in the same directory
- Agent uses `run_command` to execute scripts
- Initially invoked explicitly via `/skill-name`

### What changes

- **Add**: `src/skills/loader.ts`
  - `loadSkill(name: string): Skill | null`
  - Return skill metadata including script paths

- **Add**: `src/skills/types.ts`
  - `Skill` type with name, description, path, scripts[], content

- **Modify**: `src/components/App.tsx`
  - Check for skill before command
  - Include script paths in context so agent knows what's available

### Tests to write first

**File**: `tests/skills/loader.test.ts`

Unit tests for skill loading (similar pattern to `tests/tools/list-files.test.ts`):

- [ ] `loadSkill` returns skill when `skill.md` exists
- [ ] `loadSkill` returns null when skill directory missing
- [ ] `loadSkill` returns null when `skill.md` missing in directory
- [ ] `loadSkill` includes all script files (*.py, *.sh, *.ts, *.js)
- [ ] `loadSkill` extracts description from first line of skill.md
- [ ] `loadSkill` returns full content of skill.md
- [ ] Script paths are absolute (ready for `run_command`)

**File**: `tests/skills/integration.test.ts`

Integration tests:

- [ ] Skill takes precedence over command with same name
- [ ] Skill context includes formatted script list
- [ ] Format matches: `{skill.md}\n\nAvailable scripts:\n- {path1}\n- {path2}`

### Implementation checklist

- [ ] **1) Create types**
  - Add `src/skills/types.ts` with `Skill` type

- [ ] **2) Implement `loadSkill`**
  - Read `.nila/skills/{name}/skill.md`
  - Scan directory for script files
  - Build absolute paths for scripts
  - Return null if skill.md doesn't exist

- [ ] **3) Update App.tsx input handling**
  - Check skills first (via `loadSkill`)
  - If skill found, format context with scripts
  - Fall back to command lookup
  - Fall back to regular chat

- [ ] **4) Format skill context**
  - Include full skill.md content
  - Append "Available scripts:" section
  - List each script with full path

---

## Phase 3: Skill Registry / Index

Auto-generate an index of available skills for efficient discovery.

### Overview

- Registry is generated on startup by scanning `.nila/skills/`
- Cached in `.nila/cache/skills_index.json`
- Contains lightweight metadata (no full content)
- Used for listing and implicit execution

### What changes

- **Add**: `src/skills/registry.ts`
  - `buildRegistry(basePath: string): SkillRegistry`
  - `saveRegistry(registry: SkillRegistry, cachePath: string): void`
  - `loadRegistry(cachePath: string): SkillRegistry | null`

- **Add to**: `src/skills/types.ts`
  - `SkillEntry` type (name, description, path)
  - `SkillRegistry` type (entries[], generatedAt)

- **Modify**: `src/components/App.tsx`
  - Build registry on mount (useEffect)
  - Store in state for `/help`

### Tests to write first

**File**: `tests/skills/registry.test.ts`

Unit tests for registry building:

- [ ] `buildRegistry` scans `.nila/skills/*/skill.md`
- [ ] `buildRegistry` extracts name from directory name
- [ ] `buildRegistry` extracts description from first line
- [ ] `buildRegistry` returns empty entries when no skills exist
- [ ] `buildRegistry` handles missing `.nila/skills/` directory
- [ ] `buildRegistry` includes `generatedAt` timestamp
- [ ] `saveRegistry` writes JSON to cache path
- [ ] `saveRegistry` creates cache directory if missing
- [ ] `loadRegistry` reads from cache file
- [ ] `loadRegistry` returns null if cache missing

**File**: `tests/skills/registry-integration.test.ts`

Integration with temp fixtures:

- [ ] Full cycle: build → save → load returns same data
- [ ] Registry includes all skills from fixture directory

### Implementation checklist

- [ ] **1) Add registry types**
  - `SkillEntry`: { name, description, path }
  - `SkillRegistry`: { entries: SkillEntry[], generatedAt: number }

- [ ] **2) Implement `buildRegistry`**
  - Scan `.nila/skills/*/skill.md`
  - Extract description from first line
  - Return registry object with timestamp

- [ ] **3) Implement cache read/write**
  - `saveRegistry` writes to `.nila/cache/skills_index.json`
  - `loadRegistry` reads from cache
  - Create cache directory if needed

- [ ] **4) Integrate into App.tsx**
  - Build registry on mount
  - Store in state
  - Update `/help` to include skills from registry

---

## Phase 4: Implicit Skill Selection & Execution

Enable the agent to auto-select and run skills based on user intent.

### Overview

- Registry summaries are injected into agent context
- Agent can decide to use a skill without explicit `/` invocation
- Agent uses `invoke_skill` tool to load skill content
- User can still use `/skill-name` to force a specific skill

### What changes

- **Add**: `src/tools/invoke-skill.ts`
  - New tool that loads skill content by name
  - Returns skill.md content + script paths

- **Modify**: `src/tools/index.ts`
  - Add `invoke_skill` to tools array and executeTool

- **Modify**: `src/agent/agent.ts`
  - Accept registry in options
  - Include skill summaries in system prompt

- **Add to**: `src/agent/types.ts`
  - Update `AgentOptions` to include `skillRegistry`

### Tests to write first

**File**: `tests/tools/invoke-skill.test.ts`

Unit tests for the new tool (follow pattern from `tests/tools/read-file.test.ts`):

- [ ] `invokeSkill` returns skill content when skill exists
- [ ] `invokeSkill` returns error string when skill not found
- [ ] `invokeSkill` includes script paths in output
- [ ] Output format matches expected structure

**File**: `tests/agent/agent-skills.test.ts`

Agent integration tests (follow pattern from `tests/agent/agent.test.ts`):

- [ ] System prompt includes skill summaries when registry provided
- [ ] System prompt excludes skills section when no registry
- [ ] Agent can call `invoke_skill` tool
- [ ] Tool result includes skill content

### Implementation checklist

- [ ] **1) Create `invoke_skill` tool**
  - Add `src/tools/invoke-skill.ts`
  - Input: `{ skill_name: string }`
  - Output: skill content + scripts or error

- [ ] **2) Register tool**
  - Add to `tools` array in `src/tools/index.ts`
  - Add case to `executeTool` switch
  - Add `INVOKE_SKILL` to `ToolName` enum

- [ ] **3) Update system prompt**
  - Modify `getSystemPrompt` to accept registry
  - Add "Available Skills" section with name/description
  - Add instruction for when to use skills

- [ ] **4) Update Agent constructor**
  - Add `skillRegistry` to `AgentOptions`
  - Pass to `getSystemPrompt`

- [ ] **5) Update App.tsx**
  - Pass registry to Agent constructor

---

## Phase 5: Multi-Scope Extensions (Future)

Support personal/global extensions in addition to project-level.

### Overview

- Personal skills in `~/.nila/skills/`
- Project skills in `.nila/skills/`
- Project takes precedence over personal
- Registries are merged at startup

### What changes

- **Modify**: `src/skills/registry.ts`
  - Support multiple source directories
  - Merge registries with precedence rules

- **Modify**: `src/skills/loader.ts`
  - Search multiple paths when loading skill

### Tests to write first

**File**: `tests/skills/multi-scope.test.ts`

Unit tests for scope handling:

- [ ] `buildRegistry` accepts array of paths
- [ ] Entries include `scope` field (project | personal)
- [ ] Project skill overrides personal with same name
- [ ] Both scopes appear when names differ
- [ ] `loadSkill` searches project path first
- [ ] `loadSkill` falls back to personal path
- [ ] Handles missing personal directory gracefully

### Implementation checklist

- [ ] **1) Update `SkillEntry` type**
  - Add `scope: 'project' | 'personal'`

- [ ] **2) Update `buildRegistry`**
  - Accept `paths: { path: string; scope: Scope }[]`
  - Merge entries, project wins on conflict

- [ ] **3) Update `loadSkill`**
  - Accept array of base paths
  - Search in order, return first match

- [ ] **4) Update App.tsx**
  - Include `~/.nila/` as personal path
  - Pass both paths to registry/loader

- [ ] **5) Update `/help`**
  - Show `[project]` or `[personal]` indicator

---

## Suggested implementation order

1. **Phase 1: Commands** — Foundation, immediate value
2. **Phase 2: Skills** — Builds on commands, adds scripts
3. **Phase 3: Registry** — Required for implicit execution
4. **Phase 4: Implicit** — The magic, requires registry
5. **Phase 5: Multi-scope** — Nice to have, can defer

---

## Definition of done

### Phase 1 (Commands)

- [ ] All `tests/commands/loader.test.ts` tests pass
- [ ] All `tests/commands/integration.test.ts` tests pass
- [ ] `/command-name` loads and executes command
- [ ] Arguments passed as raw string
- [ ] `/help` lists available commands
- [ ] Unknown commands show clear error

### Phase 2 (Skills)

- [ ] All `tests/skills/loader.test.ts` tests pass
- [ ] All `tests/skills/integration.test.ts` tests pass
- [ ] `/skill-name` loads skill with scripts
- [ ] Agent can execute skill scripts
- [ ] Skills take precedence over commands

### Phase 3 (Registry)

- [ ] All `tests/skills/registry.test.ts` tests pass
- [ ] All `tests/skills/registry-integration.test.ts` tests pass
- [ ] Registry auto-generated on startup
- [ ] Cached in `.nila/cache/`
- [ ] `/help` shows all skills

### Phase 4 (Implicit)

- [ ] All `tests/tools/invoke-skill.test.ts` tests pass
- [ ] All `tests/agent/agent-skills.test.ts` tests pass
- [ ] Agent sees skill summaries
- [ ] Agent can auto-invoke matching skill
- [ ] Works without explicit `/` prefix

### Phase 5 (Multi-scope)

- [ ] All `tests/skills/multi-scope.test.ts` tests pass
- [ ] Personal skills from `~/.nila/`
- [ ] Project overrides personal
- [ ] Scopes visible in `/help`
