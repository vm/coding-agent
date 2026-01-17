# Skills

## Overview
Custom commands with a directory structure that can include scripts and multiple files.

## Dependencies
- **Requires:** custom-commands feature to be implemented first
- Skills extend the command system to support directories instead of single files

## Key Points from Discussion
- Skill = command with a whole directory structure
- Can contain scripts that don't exist in any repo
- Example: QR code skill with `make_qr_code.py` script
- Example: YouTube transcript skill with multiple Python scripts
- Skills live in global location, not per-repo
- When skill is detected, read skill.md, then agent can read scripts as needed

## Directory Structure
```
~/.agent/
  skills/
    qr-code/
      skill.md          # Instructions
      make_qr_code.py   # Script
    youtube-transcript/
      skill.md
      fetch_transcript.py
      parse_chapters.py
      cli.py
```

## skill.md Format
```markdown
# YouTube Transcript

## Description
Fetch and process YouTube video transcripts.

## Scripts
- fetch_transcript.py: Fetches raw transcript
- parse_chapters.py: Parses chapters from description
- cli.py: Main CLI interface

## Usage
Run `python cli.py <video_id>` to get transcript
```

## Files to Modify

### 1. `src/agent/types.ts` (Lines 18-23)
- `ToolName` enum with 4 tools
- Consider adding `LOAD_SKILL` or handle at higher level
```typescript
type SkillMetadata = {
  name: string;
  description: string;
  scripts: string[];
  usage: string;
};
```

### 2. `src/tools/index.ts` (Lines 75-98)
- `executeTool()` dispatcher
- After custom commands, add skill detection here
- Check if path is directory, look for skill.md

### 3. `src/agent/agent.ts` (Lines 14-28)
- `getSystemPrompt()` could accept skill context
- Lines 133-135: API call uses tools array
- Inject skill instructions into system prompt dynamically

### 4. `src/components/Input.tsx` (Lines 14-27)
- Detect `/` for command/skill
- Lines 17-20: Submit handler - intercept skill commands

### 5. NEW: `src/skills/skill-loader.ts`
- `detectSkill(input: string): string | null`
- `loadSkillMetadata(skillPath: string): SkillMetadata`
- `findSkillByName(name: string): string | null`

## Patterns to Follow
- Directory reading: list-files.ts lines 4-31 (readdirSync, filter hidden)
- File reading: read-file.ts lines 3-13 (readFileSync wrapper)
- Callback pattern: agent.ts lines 37-54 (onToolStart, onToolComplete)

## Implementation Steps
1. Extend custom commands to support directories
2. Create `src/skills/skill-loader.ts` utility
3. If command path is directory, look for skill.md
4. Read skill.md into context
5. Agent reads scripts via read_file, executes via run_command

## Argument Handling
- Arguments passed after skill name: `/youtube-transcript VIDEO_ID`
- skill.md can define expected arguments in frontmatter:
```yaml
---
args:
  - name: video_id
    required: true
    description: YouTube video ID
---
```
- Arguments injected into context for agent to use
- No strict validation - agent interprets arguments from skill.md instructions

## Relationship to Custom Commands
- Once custom commands work, skills are: "also allow directories"
- skill.md replaces command.md
- Additional files available for agent to read

## Testing
Location: `tests/skills/`

- Test skill directory detection
- Test skill.md loading and parsing
- Test script execution from skill
- Test skill context injection into system prompt
- Test argument passing to skills
