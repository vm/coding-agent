# Skills

## Overview
Custom commands with a directory structure that can include scripts and multiple files.

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

## Implementation Steps
1. Extend custom commands to support directories
2. If command path is directory, look for skill.md
3. Read skill.md into context
4. Agent can then read individual scripts as needed using read_file
5. Scripts can be executed via run_command

## Relationship to Custom Commands
- Once custom commands work, skills are: "also allow directories"
- skill.md replaces command.md
- Additional files available for agent to read

## Testing
- Test skill directory detection
- Test skill.md loading
- Test script execution from skill
