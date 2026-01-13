# Commands and Skills

## Context: what this plan is and when to use it

This plan describes a **slash command system** for the agent's UI input, so you can expand short commands into reusable prompts.

- **When you want this**: you find yourself repeatedly typing the same instruction ("review this module", "summarize logs", etc.) and you want a local shortcut.
- **What it enables**:
  - **Commands**: a single markdown file (example: `.prompts/review.md`) expanded into the prompt sent to the model.
  - **Skills**: a directory containing `skill.md` plus supporting files (example: `.skills/qr-code/skill.md` and scripts/templates) whose contents are surfaced to the model as context.
  - **Built-in help**: `/help` lists available commands/skills locally.
- **How you'd use it in this repo**:
  - create project-local `.prompts/` or `.skills/` entries for your workflow
  - type `/help` in the Ink UI to see what's available
  - type `/review <rest…>` (or `/qr-code <rest…>`) to expand into the agent prompt

Safety rule: this feature only expands **text** for the model. It must never automatically execute scripts or shell commands.

This plan intentionally avoids implementation-sized code blocks. The source of truth should live in `src/` and be validated by `tests/`.

## Where to start in this repo

- **UI input handling**: `src/components/App.tsx` (see `handleSubmit` function)
- **Agent boundary**: `src/agent/agent.ts` (where the final prompt is sent via `agent.chat()`)
- **New module**: `src/commands/` (to be added)
- **New tests**: `tests/commands/` (to be added)

## Concrete file/API targets

Create a single module that exports the exact helpers:

- **Add**: `src/commands/index.ts`
  - exports:
    - `parseSlashCommand(input: string) -> { name: string; rest: string } | null`
    - `findCommand(name: string, workingDir?: string) -> CommandResult | null`
    - `listCommands(workingDir?: string) -> string[]`
    - `expandInput(input: string, workingDir?: string) -> ExpandResult`

Minimal return types to standardize behavior:

```
CommandResult = {
  kind: 'command' | 'skill';
  name: string;
  content: string;
  files?: string[];  // for skills: relative paths of files in skill directory
}

ExpandResult =
  | { kind: 'agent'; userText: string; prompt: string }
  | { kind: 'local'; userText: string; outputText: string; error?: boolean }
```

### Search locations and precedence

Search in this order (first match wins):

1. **Project commands**: `<workingDir>/.prompts/<name>.md`
2. **Project skills**: `<workingDir>/.skills/<name>/skill.md`
3. **Global commands**: `<configDir>/prompts/<name>.md`
4. **Global skills**: `<configDir>/skills/<name>/skill.md`

**Config directory** (cross-platform):
- macOS: `~/Library/Application Support/nila-code/`
- Linux: `~/.config/nila-code/`
- Windows: `%APPDATA%/nila-code/`

Use `process.platform` to determine the correct path, or use a library like `env-paths`.

**Conflict resolution**: if both `.prompts/review.md` and `.skills/review/skill.md` exist, the command (`.prompts/`) wins. This matches the search order.

### Integration point

- **Modify**: `src/components/App.tsx` `handleSubmit(text: string)`
  - call `expandInput(text, cwd())`
  - if `kind === 'local'`:
    - append user message with `userText`
    - append assistant message with `outputText`
    - return without calling `agent.chat`
  - if `kind === 'agent'`:
    - append user message with `userText`
    - call `agent.chat(prompt)`

---

## Phase 1: Tests (define the minimal feature)

## Concrete examples (what should happen)

### Example: command file

Project layout:

```
.prompts/
  review.md
```

Example `.prompts/review.md` content (short on purpose):

```
Review the code for correctness and readability.
Return a short list of actionable issues.
```

User input and expected behavior:

- input: `/review src/agent/agent.ts`
- UI shows user message: `/review src/agent/agent.ts`
- prompt sent to agent contains:
  - the file content above
  - the appended rest text: `src/agent/agent.ts`

### Example: skill directory

Project layout:

```
.skills/
  qr-code/
    skill.md
    make_qr.py
```

Example `.skills/qr-code/skill.md` content:

```
Generate a QR code.
Do not execute files; describe how to run them.
Skill path: {{skill_path}}
```

User input and expected behavior:

- input: `/qr-code "hello world"`
- prompt sent to agent contains:
  - skill.md content with `{{skill_path}}` replaced with absolute path to `.skills/qr-code/`
  - a "Files in skill:" section listing `make_qr.py`
  - appended rest text: `"hello world"` (or without quotes depending on parsing phase)

### Parsing

- [ ] `/name` parses into `{ name, rest: '' }`
- [ ] `/name with extra text` parses into `{ name, rest: 'with extra text' }`
- [ ] non-slash input returns null (not a command)
- [ ] `/help` is recognized like any other slash command name
- [ ] `/Name` normalizes to lowercase `name` for lookup

### Discovery

- [ ] `findCommand(name, dir)` loads a command from `.prompts/<name>.md` if present
- [ ] `findCommand(name, dir)` loads a skill from `.skills/<name>/skill.md` if present
- [ ] missing returns null
- [ ] skill content replaces `{{skill_path}}` with the concrete absolute directory path
- [ ] skill discovery returns a list of skill files (excluding `skill.md`) with relative paths

### Listing

- [ ] `listCommands(dir)` returns all available command names and skill names, de-duped
- [ ] project commands/skills appear before global ones
- [ ] duplicate names (project overriding global) only appear once

### Expansion

- [ ] `/help` returns a local response listing commands/skills and does not call the agent
- [ ] unknown `/name` returns a local error message pointing to `/help`
- [ ] known command expands to an agent prompt and appends `rest` at the end
- [ ] known skill expands to an agent prompt, includes a file listing, and appends `rest`

### Suggested test cases (more specific)

- [ ] **/help output contains discovered items**:
  - create `.prompts/review.md` and `.skills/qr-code/skill.md` in a temp workspace
  - call expand on `/help`
  - assert output includes `/review` and `/qr-code`
- [ ] **unknown command is local error**:
  - call expand on `/nope`
  - assert kind is local + error is true + output mentions `/help`
- [ ] **command expansion includes rest**:
  - expand `/review the auth module`
  - assert prompt contains both the file content and `the auth module`
- [ ] **skill file listing is names only**:
  - create skill with `make_qr.py`
  - expand `/qr-code`
  - assert prompt contains `make_qr.py`
  - assert prompt does not include the contents of `make_qr.py`
- [ ] **project overrides global**:
  - create both project `.prompts/foo.md` and global `prompts/foo.md`
  - expand `/foo`
  - assert the project version content is used
- [ ] **case insensitive lookup**:
  - create `.prompts/Review.md`
  - expand `/review`
  - assert it finds the command

### Test file mapping (exactly what to add)

- **Add**: `tests/commands/index.test.ts`
  - use `mkdtempSync` + `rmSync` (same pattern as existing tool tests)
  - create `.prompts/` and `.skills/` under the temp dir
  - run assertions against `parseSlashCommand`, `findCommand`, `listCommands`, `expandInput`

---

## Phase 2: Implementation (minimal)

### Files to add / modify

- [ ] **Add**: `src/commands/index.ts` with exports
- [ ] **Modify**: `src/components/App.tsx` input submission path to expand commands before calling `agent.chat`

## Implementation checklist (ordered)

- [ ] **1) Add `src/commands/index.ts` with the 4 exports**
  - `parseSlashCommand`, `findCommand`, `listCommands`, `expandInput`
  - Keep return types exactly as specified (so tests are stable)
  - Verify by adding `tests/commands/index.test.ts` and running only parsing-related cases first

- [ ] **2) Implement project-local discovery**
  - `.prompts/<name>.md`
  - `.skills/<name>/skill.md`
  - Verify: tests that create a temp `.prompts` and `.skills` workspace pass

- [ ] **3) Add config directory helper**
  - Create `getConfigDir(): string` that returns platform-appropriate path
  - macOS: `~/Library/Application Support/nila-code/`
  - Linux: `~/.config/nila-code/`
  - Windows: `%APPDATA%/nila-code/`
  - Verify: unit test that mocks `process.platform` and checks paths

- [ ] **4) Implement global discovery**
  - `<configDir>/prompts/<name>.md`
  - `<configDir>/skills/<name>/skill.md`
  - Search after project-local (project takes precedence)

- [ ] **5) Implement expansion and `/help`**
  - `/help` returns `{ kind: 'local' ... }` and lists command names as `/name`
  - Unknown `/x` returns local error and suggests `/help`
  - Known commands/skills return `{ kind: 'agent', prompt: ... }`

- [ ] **6) Wire into the UI (`src/components/App.tsx`)**
  - In `handleSubmit`, call `expandInput(text, cwd())`
  - Always append user message with `userText` (the original input)
  - If local:
    - append assistant message with `outputText`
    - set error state if `error: true`
    - return early (no agent call)
  - If agent:
    - call `agent.chat(prompt)`
    - append assistant message with response

### Search locations

- **Project commands**: `<workingDir>/.prompts/*.md`
- **Project skills**: `<workingDir>/.skills/<name>/skill.md`
- **Global commands**: `<configDir>/prompts/*.md`
- **Global skills**: `<configDir>/skills/<name>/skill.md`

### Expansion rules

- **User message shown in UI**: always show the literal user input (e.g. `/review the auth module`)
- **Prompt sent to model**:
  - base content comes from the command/skill markdown
  - if skill: append "Files in skill:" with the relative file list
  - if `rest` exists: append it after the content

### Expected strings (help + errors)

Keep these consistent so tests can assert on them:

- help header includes: `Available commands:`
- unknown command includes: `Unknown command: /<name>`
- unknown command includes: `Type /help`

### Built-in `/help`

- [ ] prints available commands/skills (including both project + global)
- [ ] shows command source (project vs global) for clarity
- [ ] optionally supports `/help <query>` later (Phase 3+)

---

## Phase 3+: Production hardening (optional)

- [ ] **Dependencies**: add YAML parsing + fuzzy search libraries if you implement frontmatter/search
- [ ] **Frontmatter metadata**: support YAML frontmatter in prompt files (name/description/parameters)
- [ ] **Parameter parsing**: support `key=value` arguments, quoted values, and keep remaining tokens as rest
- [ ] **Template rendering**: `{{param}}` substitutions and simple conditionals
- [ ] **Fuzzy search**: suggest commands for typos and allow `/help <query>` filtering
- [ ] **Project override of global**: allow `.prompts/.ignore` to disable specific global commands
- [ ] **Skill file auto-read**: optionally allow skills to mark certain files as "include content in prompt"

---

## Definition of done

- [ ] `/help` works end-to-end in the UI
- [ ] Unknown commands error locally (no agent call)
- [ ] Known commands/skills expand into an agent prompt consistently
- [ ] Skills never execute code; they only surface text and file names
- [ ] Project commands/skills take precedence over global ones
- [ ] Cross-platform config directory support works on macOS, Linux, and Windows
