# AGENTS.md Loading Scheme

## Overview
Auto-read AGENTS.md files from working directory and scan directories when reading files to check for additional AGENTS.md files along the path.

## Key Points from Discussion
- If AGENTS.md exists in working directory, auto-read it
- When reading files in other directories, parse the tree to find other AGENTS.md files
- Example: Reading `backend/run.py` should trigger check for `backend/AGENTS.md`
- Implementation: Just call read_file on it (don't put in system message to preserve cache)
- Adding to system message breaks prompt cache

## Implementation Steps
1. On startup, check if AGENTS.md exists in cwd and read it
2. Track which directories have been scanned for AGENTS.md
3. When read_file is called, check parent directories for AGENTS.md
4. Force read any discovered AGENTS.md files into context
5. Handle file watching for new AGENTS.md files created during session

## Testing
- Test AGENTS.md discovery in nested directories
- Test that instructions are properly loaded into context
- Verify cache is not broken (no system message modification)
