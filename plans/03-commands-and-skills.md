# Commands and Skills

## Context: what this plan is and when to use it

This plan describes a **slash command system** for the agent's UI input, so you can expand short commands into reusable prompts.

- **When you want this**: you find yourself repeatedly typing the same instruction ("review this module", "summarize logs", etc.) and you want a local shortcut.
- **What it enables**:
  - **Commands**: a single markdown file (example: `.code/commands/review.md`) expanded into the prompt sent to the model.
  - **Skills**: a directory containing `SKILL.md` plus supporting files (example: `.code/skills/qr-code/SKILL.md` and scripts/templates) whose contents are surfaced to the model as context.
  - **Built-in help**: `/help` lists available commands/skills locally.
- **How you'd use it in this repo**:
  - create project-local `.code/commands/` or `.code/skills/` entries for your workflow
  - type `/help` in the Ink UI to see what's available
  - type `/review <rest…>` (or `/qr-code <rest…>`) to expand into the agent prompt

Safety rule: this feature only expands **text** for the model. It must never automatically execute scripts or shell commands.

This plan intentionally avoids implementation-sized code blocks. The source of truth should live in `src/` and be validated by `tests/`.

## Where to start in this repo

- **UI input handling**: `src/components/App.tsx` (see `handleSubmit` function)
- **Agent boundary**: `src/agent/agent.ts` (where the final prompt is sent via `agent.chat()`)
- **New module**: `src/commands/`
- **New tests**: `tests/commands/`

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

1. **Project commands**: `<workingDir>/.code/commands/<name>.md`
2. **Project skills**: `<workingDir>/.code/skills/<name>/SKILL.md`
3. **Personal commands**: `~/.code/commands/<name>.md` *(Phase 2)*
4. **Personal skills**: `~/.code/skills/<name>/SKILL.md` *(Phase 2)*

**Conflict resolution**: if both `.code/commands/review.md` and `.code/skills/review/SKILL.md` exist, the command wins. This matches the search order.

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

## Phase 1: Project-level commands/skills

This phase implements project-local discovery only (`.code/commands/` and `.code/skills/` in the working directory). Personal directories are deferred to Phase 2.

### Concrete examples (what should happen)

### Example: command file

Project layout:

```
.code/
  commands/
    review.md
```

Example `.code/commands/review.md` content (short on purpose):

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
.code/
  skills/
    qr-code/
      SKILL.md
      make_qr.py
```

Example `.code/skills/qr-code/SKILL.md` content:

```
Generate a QR code.
Do not execute files; describe how to run them.
Skill path: {{skill_path}}
```

User input and expected behavior:

- input: `/qr-code "hello world"`
- prompt sent to agent contains:
  - SKILL.md content with `{{skill_path}}` replaced with absolute path to `.code/skills/qr-code/`
  - a "Files in skill:" section listing `make_qr.py`
  - appended rest text: `"hello world"` (or without quotes depending on parsing phase)

### Parsing

- [ ] `/name` parses into `{ name, rest: '' }`
- [ ] `/name with extra text` parses into `{ name, rest: 'with extra text' }`
- [ ] non-slash input returns null (not a command)
- [ ] `/help` is recognized like any other slash command name
- [ ] `/Name` normalizes to lowercase `name` for lookup

### Discovery

- [ ] `findCommand(name, dir)` loads a command from `.code/commands/<name>.md` if present
- [ ] `findCommand(name, dir)` loads a skill from `.code/skills/<name>/SKILL.md` if present
- [ ] missing returns null
- [ ] skill content replaces `{{skill_path}}` with the concrete absolute directory path
- [ ] skill discovery returns a list of skill files (excluding `SKILL.md`) with relative paths

### Listing

- [ ] `listCommands(dir)` returns all available command names and skill names, de-duped
- [ ] project commands/skills appear before personal ones *(Phase 2)*
- [ ] duplicate names (project overriding personal) only appear once *(Phase 2)*

### Expansion

- [ ] `/help` returns a local response listing commands/skills and does not call the agent
- [ ] unknown `/name` returns a local error message pointing to `/help`
- [ ] known command expands to an agent prompt and appends `rest` at the end
- [ ] known skill expands to an agent prompt, includes a file listing, and appends `rest`

### Suggested test cases (more specific)

- [ ] **/help output contains discovered items**:
  - create `.code/commands/review.md` and `.code/skills/qr-code/SKILL.md` in a temp workspace
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
- [ ] **project overrides personal** *(Phase 2)*:
  - create both project `.code/commands/foo.md` and personal `~/.code/commands/foo.md`
  - expand `/foo`
  - assert the project version content is used
- [ ] **case insensitive lookup**:
  - create `.code/commands/Review.md`
  - expand `/review`
  - assert it finds the command

### Test file mapping (exactly what to add)

- [ ] **Add**: `tests/commands/index.test.ts`
  - use `mkdtempSync` + `rmSync` (same pattern as existing tool tests)
  - create `.code/commands/` and `.code/skills/` under the temp dir
  - run assertions against `parseSlashCommand`, `findCommand`, `listCommands`, `expandInput`

---

### Implementation checklist (Phase 1 - project-level only)

- [ ] **1) Add `src/commands/index.ts` with the 4 exports**
  - `parseSlashCommand`, `findCommand`, `listCommands`, `expandInput`
  - Keep return types exactly as specified (so tests are stable)
  - Add `tests/commands/index.test.ts` with parsing tests first

- [ ] **2) Implement project-local discovery**
  - `.code/commands/<name>.md`
  - `.code/skills/<name>/SKILL.md`
  - Verify: tests that create a temp `.code/commands` and `.code/skills` workspace pass

- [ ] **3) Implement expansion and `/help`**
  - `/help` returns `{ kind: 'local' ... }` and lists command names as `/name`
  - Unknown `/x` returns local error and suggests `/help`
  - Known commands/skills return `{ kind: 'agent', prompt: ... }`

- [ ] **4) Wire into the UI (`src/components/App.tsx`)**
  - In `handleSubmit`, call `expandInput(text, cwd())`
  - Always append user message with `userText` (the original input)
  - If local:
    - append assistant message with `outputText`
    - set error state if `error: true`
    - return early (no agent call)
  - If agent:
    - call `agent.chat(prompt)`
    - append assistant message with response

---

## Phase 2: Personal commands/skills

Add personal directory support (`~/.code/`) after Phase 1 is working.

### Implementation checklist (Phase 2)

- [ ] **1) Add home directory helper**
  - Create `getPersonalDir(): string` that returns `~/.code/`
  - Use `os.homedir()` to resolve `~`

- [ ] **2) Implement personal discovery**
  - `~/.code/commands/<name>.md`
  - `~/.code/skills/<name>/SKILL.md`
  - Search after project-local (project takes precedence)

- [ ] **3) Update `/help` to show source (project vs user)**

### Search locations (Phase 1)

- **Project commands**: `<workingDir>/.code/commands/*.md`
- **Project skills**: `<workingDir>/.code/skills/<name>/SKILL.md`

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

- [ ] prints available commands/skills from project
- [ ] prints available commands/skills including personal *(Phase 2)*
- [ ] shows command source (project vs user) for clarity *(Phase 2)*
- [ ] optionally supports `/help <query>` later *(Phase 3+)*

---

## Phase 3+: Production hardening (future)

- [ ] **Dependencies**: add YAML parsing + fuzzy search libraries if you implement frontmatter/search
- [ ] **Frontmatter metadata**: support YAML frontmatter in prompt files (name/description/parameters)
- [ ] **Parameter parsing**: support `key=value` arguments, quoted values, and keep remaining tokens as rest
- [ ] **Template rendering**: `{{param}}` substitutions and simple conditionals
- [ ] **Fuzzy search**: suggest commands for typos and allow `/help <query>` filtering
- [ ] **Project override of personal**: allow `.code/commands/.ignore` to disable specific personal commands
- [ ] **Skill file auto-read**: optionally allow skills to mark certain files as "include content in prompt"

---

## Definition of done

### Phase 1 (project-level)
- [ ] `/help` works end-to-end in the UI
- [ ] Unknown commands error locally (no agent call)
- [ ] Known commands/skills expand into an agent prompt consistently
- [ ] Skills never execute code; they only surface text and file names

### Phase 2 (personal)
- [ ] Project commands/skills take precedence over personal ones
- [ ] Personal directory `~/.code/` works across platforms
