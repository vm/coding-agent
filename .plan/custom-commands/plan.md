# Custom Commands

## Overview
User-defined slash commands loaded from a prompts directory.

## Key Points from Discussion
- Commands live in a `commands/` directory (renamed from "prompts" for clarity)
- Check what commands exist via directory listing
- Slash triggers search (e.g., `/make-pr`)
- When detected, load the command's markdown file
- Implementation: just a file read (e.g., read `make-pr.md`)
- Keeps cache intact since it's a context addition, not system message change

## Search Path Priority
1. `./.agent/commands/` (project-local, highest priority)
2. `~/.agent/commands/` (global, fallback)

Local commands override global commands with the same name.

## Directory Structure
```
.agent/
  commands/
    make-pr.md
    review.md
    test.md
```

Or global:
```
~/.agent/
  commands/
    make-pr.md
```

## Files to Modify

### 1. `src/components/Input.tsx` (Lines 14-27)
- `useInput` hook processes character input
- Detect `/` at start of input to trigger command mode
- Current: Input accumulated and submitted as plain text

### 2. `src/components/App.tsx` (Lines 73-92)
- `handleSubmit()` processes all user input uniformly
- Add check: if input starts with `/`, route to command loading
- Lines 114-121: Banner shown; could extend to show available commands

### 3. `src/agent/agent.ts` (Lines 160-269)
- `chat()` method is main input handler
- Add `loadCommand()` or `executeCommand()` method
- Lines 14-28: System prompt may need command metadata

### 4. `src/tools/index.ts` (Lines 8-73, 75-98)
- Tool definitions and `executeTool()` dispatcher
- Add utility function to load command markdown files

### 5. NEW: `src/commands/` directory
- `loader.ts` - Load and parse command markdown files
- `types.ts` - `Command`, `CommandSchema`, `CommandMetadata` types
- `parser.ts` - Parse command markdown and arguments

## Patterns to Follow
- Input → State flow: App.tsx lines 73-92
- Tool execution: agent.ts lines 85-120
- Error handling: Return `Error: ` prefix strings
- Type safety: Use enums and strict types

## Implementation Steps
1. Define command search paths (local .agent/commands, global ~/.agent/commands)
2. On startup, scan for available commands and extract metadata
3. In Input.tsx, detect `/` at start of input
4. In App.handleSubmit(), route `/` commands to CommandLoader
5. Read command markdown file from search paths
6. Parse schema from markdown (YAML frontmatter or code block)
7. Validate user arguments against schema
8. Add command content to chat context

## Architecture Flow
```
Input detects "/" → Extract command + args → App.handleSubmit routes to CommandLoader
→ Load markdown file → Parse schema & validate → Add to agent context → agent.chat()
```

## Testing
Location: `tests/commands/`

- Test command discovery and listing
- Test command markdown parsing
- Test slash command detection in Input component
- Test argument schema validation
- Test local vs global precedence
- Integration test: full command flow
