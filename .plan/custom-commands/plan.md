# Custom Commands

## Overview
User-defined slash commands loaded from a prompts directory.

## Key Points from Discussion
- Subcommands are just a directory called "prompts"
- Check what commands exist via directory listing
- Slash triggers search (e.g., `/make-pr`)
- When detected, load the command's markdown file
- Implementation: just a file read (e.g., read `makepr.md`)
- Keeps cache intact since it's a context addition, not system message change

## Directory Structure
```
.claude/
  commands/
    make-pr.md
    review.md
    test.md
```

Or global:
```
~/.claude/
  commands/
    make-pr.md
```

## Implementation Steps
1. Define command search paths (local .claude/commands, global ~/.claude/commands)
2. On startup or `/` input, scan for available commands
3. Implement command discovery/autocomplete
4. When command invoked, read the .md file into context
5. Parse any schema/arguments defined in command file
6. Validate user input against schema

## Complexity Notes
- Need to validate schema consistency between input and command expectations
- Get summary back and add to context after execution

## Testing
- Test command discovery
- Test command loading into context
- Test argument parsing and validation
