# Commands & Skills

## Context: what this plan is and when to use it

This plan describes how to add a layered extensibility system via file-based artifacts (commands and skills) that extend agent behavior without mutating the system prompt.

- **When you want this**: you want reusable, inspectable, version-controlled extensions that encode workflows or deterministic operations
- **What it enables**:
  - **Commands**: prompt-only extensions invoked via `/command` syntax
  - **Skills**: prompt + script extensions for deterministic execution
  - **Registry**: indexed discovery with metadata
  - **Implicit execution**: agent-driven skill selection
  - **Multi-scope**: project + personal extensions

## Where to start in this repo

- **Input handling**: `src/components/Input.tsx` (will intercept `/` commands)
- **App state**: `src/components/App.tsx` (will hold discovered commands)
- **Agent**: `src/agent/agent.ts` (command context injection)
- **Types**: `src/shared/types.ts` (command/skill types)
- **Tools**: `src/tools/index.ts` (skill script execution)

---

## Implementation Phase 1: Command Types & Parsing

Define the core types and parsing logic for commands.

### What changes

- **Add**: `src/commands/types.ts`
  - `Command` type: `{ name: string; description: string; path: string; content: string }`
  - `CommandInvocation` type: `{ name: string; args: string }`
  - `ParsedInput` type: `{ type: 'command'; invocation: CommandInvocation } | { type: 'message'; text: string }`

- **Add**: `src/commands/parser.ts`
  - `parseInput(input: string): ParsedInput` — detects `/command args` pattern
  - `parseCommandLine(line: string): CommandInvocation` — extracts name and args

### Tests: `tests/commands/parser.test.ts`

- `parseInput` returns `type: 'command'` for input starting with `/`
- `parseInput` returns `type: 'message'` for regular text
- `parseCommandLine` extracts command name correctly (`/makepr` → `name: 'makepr'`)
- `parseCommandLine` extracts args as single string (`/release-notes v2.1.0` → `args: 'v2.1.0'`)
- `parseCommandLine` handles no args (`/help` → `args: ''`)
- `parseCommandLine` handles multi-word args (`/pr fix auth bug` → `args: 'fix auth bug'`)
- Edge case: `/` alone returns empty name
- Edge case: whitespace-only args normalized to empty string

### Implementation checklist

- [x] **1.1) Define Command type**
- [x] **1.2) Define CommandInvocation type**
- [x] **1.3) Define ParsedInput discriminated union**
- [x] **1.4) Write parser tests**
- [x] **1.5) Implement parseInput**
- [x] **1.6) Implement parseCommandLine**

---

## Implementation Phase 2: Command Discovery

Scan `.nila/commands/` directory at startup to discover available commands.

### What changes

- **Add**: `src/commands/discovery.ts`
  - `discoverCommands(basePath: string): Command[]` — scans directory, reads `.md` files
  - `loadCommand(filePath: string): Command` — parses single command file
  - `extractDescription(content: string): string` — extracts first line or heading as description

- **Modify**: `src/shared/types.ts`
  - Export command types for use in components

### Tests: `tests/commands/discovery.test.ts`

- `discoverCommands` returns empty array when `.nila/commands/` doesn't exist
- `discoverCommands` returns empty array when directory is empty
- `discoverCommands` finds all `.md` files in directory
- `discoverCommands` ignores non-`.md` files
- `loadCommand` extracts name from filename (`makepr.md` → `name: 'makepr'`)
- `loadCommand` reads file content into `content` field
- `loadCommand` sets `path` to full file path
- `extractDescription` returns first heading text (`# Make PR` → `'Make PR'`)
- `extractDescription` returns first line if no heading
- `extractDescription` returns empty string for empty content
- Error handling: unreadable file returns error result

### Implementation checklist

- [x] **2.1) Write discovery tests with mock filesystem**
- [x] **2.2) Implement extractDescription**
- [x] **2.3) Implement loadCommand**
- [x] **2.4) Implement discoverCommands**

---

## Implementation Phase 3: Built-in `/help` Command

Hardcode the `/help` command to list available commands.

### What changes

- **Add**: `src/commands/builtins.ts`
  - `BUILTIN_COMMANDS: string[]` — list of reserved command names (`['help']`)
  - `isBuiltinCommand(name: string): boolean`
  - `executeBuiltinHelp(commands: Command[]): string` — formats help output

- **Modify**: `src/components/App.tsx`
  - Add `commands: Command[]` state
  - Call `discoverCommands()` on mount
  - Handle `/help` invocation directly in UI

### Tests: `tests/commands/builtins.test.ts`

- `isBuiltinCommand` returns true for `'help'`
- `isBuiltinCommand` returns false for non-builtins
- `executeBuiltinHelp` with empty commands shows "No commands available"
- `executeBuiltinHelp` lists each command with name and description
- `executeBuiltinHelp` output format: `/name — description` per line
- `executeBuiltinHelp` sorts commands alphabetically

### Tests: `tests/components/App.test.tsx` (additions)

- App discovers commands on mount
- `/help` input displays help output instead of sending to agent
- `/help` shows discovered commands

### Implementation checklist

- [x] **3.1) Define BUILTIN_COMMANDS constant**
- [x] **3.2) Write builtins tests**
- [x] **3.3) Implement isBuiltinCommand**
- [x] **3.4) Implement executeBuiltinHelp**
- [x] **3.5) Add commands state to App**
- [x] **3.6) Call discoverCommands on mount**
- [x] **3.7) Handle /help in App submit handler**

---

## Implementation Phase 4: Command Invocation

Wire up command invocation: parse input, load command, inject into agent context.

### What changes

- **Add**: `src/commands/invocation.ts`
  - `buildCommandContext(command: Command, args: string): string` — formats command content with args for injection
  - `formatCommandMessage(command: Command, args: string, userIntent: string): string` — builds the full user message

- **Modify**: `src/components/App.tsx`
  - In `handleSubmit`: check if input is command
  - Look up command by name
  - Build context message
  - Pass to `agent.chat()` instead of raw input

- **Modify**: `src/components/Input.tsx` (if needed)
  - No changes expected; parsing happens in App

### Tests: `tests/commands/invocation.test.ts`

- `buildCommandContext` includes command content
- `buildCommandContext` includes args when provided
- `buildCommandContext` works with empty args
- `formatCommandMessage` wraps content in clear delimiters
- `formatCommandMessage` includes user's original input for context
- Command not found returns appropriate error message

### Tests: `tests/components/App.test.tsx` (additions)

- `/makepr` invocation loads makepr.md content
- Command content injected as user message to agent
- Args passed through to command context
- Unknown command shows error message
- Command invocation shows in transcript

### Implementation checklist

- [x] **4.1) Write invocation tests**
- [x] **4.2) Implement buildCommandContext**
- [x] **4.3) Implement formatCommandMessage**
- [x] **4.4) Update App handleSubmit to detect commands**
- [x] **4.5) Implement command lookup by name**
- [x] **4.6) Pass formatted message to agent**
- [x] **4.7) Handle unknown command error**

---

## Implementation Phase 5: Skills Types & Structure

Extend the system to support skills (prompt + script).

### What changes

- **Add**: `src/skills/types.ts`
  - `Skill` type: `{ name: string; description: string; path: string; prompt: string; scripts: SkillScript[] }`
  - `SkillScript` type: `{ name: string; path: string; language: string }`
  - `SkillInvocation` type: extends `CommandInvocation` with skill-specific fields

- **Add**: `src/skills/discovery.ts`
  - `discoverSkills(basePath: string): Skill[]` — scans `.nila/skills/` directories
  - `loadSkill(dirPath: string): Skill` — reads `skill.md` and discovers scripts
  - `detectScriptLanguage(filename: string): string` — `.py` → `python`, `.ts` → `typescript`

### Directory structure

```
.nila/skills/
  qr_code/
    skill.md
    generate_qr.py
  codemod/
    skill.md
    migrate.ts
```

### Tests: `tests/skills/discovery.test.ts`

- `discoverSkills` returns empty array when `.nila/skills/` doesn't exist
- `discoverSkills` finds all skill directories
- `discoverSkills` ignores files at root level (only directories)
- `loadSkill` reads `skill.md` into `prompt` field
- `loadSkill` discovers colocated scripts
- `loadSkill` extracts name from directory name
- `detectScriptLanguage` maps extensions correctly
- Error handling: skill without `skill.md` is skipped

### Implementation checklist

- [ ] **5.1) Define Skill type**
- [ ] **5.2) Define SkillScript type**
- [ ] **5.3) Write skill discovery tests**
- [ ] **5.4) Implement detectScriptLanguage**
- [ ] **5.5) Implement loadSkill**
- [ ] **5.6) Implement discoverSkills**

---

## Implementation Phase 6: Skill Invocation & Execution

Wire up skill invocation with script execution.

### What changes

- **Add**: `src/skills/invocation.ts`
  - `buildSkillContext(skill: Skill, args: string): string` — formats skill prompt with available scripts
  - `formatScriptToolHint(script: SkillScript): string` — tells agent how to run the script

- **Modify**: `src/commands/discovery.ts`
  - Extend to also discover skills
  - Unify commands and skills under common interface

- **Modify**: `src/components/App.tsx`
  - Discover skills alongside commands on mount
  - Handle skill invocation (similar to commands)
  - Skill prompt mentions available scripts for agent to execute via `run_command`

### Tests: `tests/skills/invocation.test.ts`

- `buildSkillContext` includes skill prompt content
- `buildSkillContext` lists available scripts with paths
- `formatScriptToolHint` generates correct run_command guidance
- Skill with multiple scripts lists all of them
- Skill with no scripts still works (prompt-only mode)

### Tests: `tests/components/App.test.tsx` (additions)

- Skills discovered on mount alongside commands
- `/qr_code` invocation loads skill prompt
- Skill prompt includes script execution hints
- Agent can execute skill scripts via run_command tool

### Implementation checklist

- [ ] **6.1) Write skill invocation tests**
- [ ] **6.2) Implement buildSkillContext**
- [ ] **6.3) Implement formatScriptToolHint**
- [ ] **6.4) Update App to discover skills**
- [ ] **6.5) Unify command/skill lookup**
- [ ] **6.6) Handle skill invocation in App**

---

## Implementation Phase 7: Registry & Index

Add registry for indexed discovery with metadata caching.

### What changes

- **Add**: `src/registry/types.ts`
  - `RegistryEntry` type: `{ name: string; type: 'command' | 'skill'; description: string; path: string }`
  - `Registry` type: `{ entries: RegistryEntry[]; generatedAt: number }`

- **Add**: `src/registry/index.ts`
  - `buildRegistry(commands: Command[], skills: Skill[]): Registry`
  - `saveRegistry(registry: Registry, cachePath: string): void`
  - `loadRegistry(cachePath: string): Registry | null`
  - `isRegistryStale(registry: Registry, basePath: string): boolean` — checks if files changed

- **Add**: Cache location: `.nila/cache/registry.json`

### Tests: `tests/registry/index.test.ts`

- `buildRegistry` combines commands and skills
- `buildRegistry` sets correct `type` field
- `buildRegistry` includes generatedAt timestamp
- `saveRegistry` writes valid JSON
- `loadRegistry` returns null for missing file
- `loadRegistry` parses saved registry correctly
- `isRegistryStale` returns true when files modified after generatedAt
- `isRegistryStale` returns false when cache is fresh

### Implementation checklist

- [ ] **7.1) Define RegistryEntry type**
- [ ] **7.2) Define Registry type**
- [ ] **7.3) Write registry tests**
- [ ] **7.4) Implement buildRegistry**
- [ ] **7.5) Implement saveRegistry**
- [ ] **7.6) Implement loadRegistry**
- [ ] **7.7) Implement isRegistryStale**
- [ ] **7.8) Update App to use registry cache**

---

## Implementation Phase 8: Implicit Skill Selection (Future)

Enable agent-driven skill selection by injecting registry summaries.

### What changes

- **Add**: `src/registry/injection.ts`
  - `buildRegistrySummary(registry: Registry): string` — formatted list for context injection
  - `buildSkillSelectionPrompt(registry: Registry, userInput: string): string`

- **Modify**: `src/agent/agent.ts`
  - Option to inject registry summary into context
  - Agent can indicate skill selection in response

- **Modify**: `src/components/App.tsx`
  - Detect agent skill selection
  - Load and execute selected skill

### Tests: `tests/registry/injection.test.ts`

- `buildRegistrySummary` formats all entries
- `buildRegistrySummary` groups by type (commands vs skills)
- `buildSkillSelectionPrompt` includes user input
- `buildSkillSelectionPrompt` instructs agent on selection format

### Tests: `tests/components/App.test.tsx` (additions)

- Agent can select skill from registry
- Selected skill is loaded and executed
- No selection falls back to normal response

### Implementation checklist

- [ ] **8.1) Write injection tests**
- [ ] **8.2) Implement buildRegistrySummary**
- [ ] **8.3) Implement buildSkillSelectionPrompt**
- [ ] **8.4) Add registry injection option to agent**
- [ ] **8.5) Detect skill selection in agent response**
- [ ] **8.6) Execute selected skill in App**

---

## Implementation Phase 9: Multi-Scope Extensions (Future)

Support personal/global extensions alongside project-scoped ones.

### What changes

- **Modify**: `src/commands/discovery.ts`
  - Accept multiple base paths
  - Merge with precedence (project > personal)

- **Modify**: `src/skills/discovery.ts`
  - Same multi-path support

- **Modify**: `src/registry/index.ts`
  - Build unified registry from multiple scopes
  - Track scope in `RegistryEntry`

- **Add**: Config for personal path: `~/.nila/`

### Tests: `tests/commands/discovery.test.ts` (additions)

- Discovery merges project and personal commands
- Project commands override personal with same name
- Personal-only commands are included

### Tests: `tests/skills/discovery.test.ts` (additions)

- Same merge behavior for skills

### Implementation checklist

- [ ] **9.1) Add scope field to RegistryEntry**
- [ ] **9.2) Update discoverCommands for multi-path**
- [ ] **9.3) Update discoverSkills for multi-path**
- [ ] **9.4) Implement merge with precedence**
- [ ] **9.5) Add personal path configuration**
- [ ] **9.6) Update registry to track scope**

---

## Suggested implementation order

1. **Phase 1: Types & Parsing** — foundation, no dependencies
2. **Phase 2: Discovery** — enables testing with real files
3. **Phase 3: /help** — first visible feature, validates discovery
4. **Phase 4: Command Invocation** — core functionality
5. **Phase 5: Skills Types** — extends foundation
6. **Phase 6: Skill Invocation** — core skill functionality
7. **Phase 7: Registry** — optimization, enables implicit selection
8. **Phase 8: Implicit Selection** — advanced feature
9. **Phase 9: Multi-Scope** — future expansion

Phases 1-4 form MVP for commands. Phases 5-6 add skills. Phases 7-9 are progressive enhancements.

---

## Definition of done

### Phase 1 (Types & Parsing)
- [x] All types defined and exported
- [x] Parser handles all edge cases
- [x] Tests pass

### Phase 2 (Discovery)
- [x] Commands discovered from `.nila/commands/`
- [x] Missing directory handled gracefully
- [x] Tests pass with mock filesystem

### Phase 3 (/help)
- [x] `/help` lists available commands
- [x] Commands state in App
- [x] Discovery runs on mount

### Phase 4 (Command Invocation)
- [x] `/command args` parsed correctly
- [x] Command content injected to agent
- [x] Unknown command shows error

### Phase 5 (Skills Types)
- [ ] Skill types defined
- [ ] Skills discovered from `.nila/skills/`
- [ ] Scripts detected per skill

### Phase 6 (Skill Invocation)
- [ ] Skills invocable like commands
- [ ] Script hints included in context
- [ ] Agent can execute scripts

### Phase 7 (Registry)
- [ ] Registry built from commands + skills
- [ ] Cache saves and loads correctly
- [ ] Staleness detection works

### Phase 8 (Implicit Selection)
- [ ] Registry summary injectable
- [ ] Agent can select skills
- [ ] Selected skill executes

### Phase 9 (Multi-Scope)
- [ ] Personal path supported
- [ ] Merge precedence correct
- [ ] Scope tracked in registry

