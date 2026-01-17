# AGENTS.md Loading Scheme

## Overview
Auto-read AGENTS.md files from working directory and scan directories when reading files to check for additional AGENTS.md files along the path.

## Key Points from Discussion
- If AGENTS.md exists in working directory, auto-read it
- When reading files in other directories, parse the tree to find other AGENTS.md files
- Example: Reading `backend/run.py` should trigger check for `backend/AGENTS.md`
- Implementation: Just call read_file on it (don't put in system message to preserve cache)
- Adding to system message breaks prompt cache

## Files to Modify

### 1. `src/agent/agent.ts` (Lines 14-28, 160-165)
- DO NOT modify `getSystemPrompt()` - this breaks prompt cache
- Instead, inject AGENTS.md content as a user message in conversation
- Add module-level cache: `let loadedAgentsMdContent = ''`
- Add method: `loadAgentsMdForPath(filePath: string): Promise<void>`
- In `chat()`, prepend AGENTS.md content to first user message if present

### 2. `src/tools/read-file.ts` (Lines 3-13)
- After successful read, scan parent directory for AGENTS.md
- Import and call new agents-loader utility
- Track scanned directories to prevent duplicates

### 3. `src/components/App.tsx` (Lines 36-54)
- Agent initialized in `useState` hook
- Add `useEffect` to load initial AGENTS.md on mount
- Handle loading state while discovering files

### 4. NEW: `src/utils/agents-loader.ts`
- `scanForAgentsMd(dirPath: string): Promise<string>`
- `loadWorkdirAgentsMd(): Promise<string>`
- `trackScannedDirectories(): Set<string>` (module-level cache)

## Patterns to Follow
- Error handling: try-catch with `Error: ` prefix (from read-file.ts, list-files.ts)
- File ops: Use `readFileSync`, `readdirSync`, `statSync` from node:fs
- Path resolution: Use node:path module, respect `cwd()`

## Implementation Steps
1. Create `src/utils/agents-loader.ts` with metadata tracking
2. On startup, check if AGENTS.md exists in cwd and read it
3. Track which directories have been scanned for AGENTS.md
4. When read_file is called, check parent directories for AGENTS.md
5. Force read any discovered AGENTS.md files into context
6. Handle file watching for new AGENTS.md files created during session

## Testing
Location: `tests/utils/agents-loader.test.ts`

- Test AGENTS.md discovery in working directory
- Test nested directory scanning on file read
- Test duplicate prevention (same dir not scanned twice)
- Test error handling for malformed/missing files
- Verify cache is not broken (no system message modification)
- Test content injection into conversation (not system prompt)

## Unresolved Questions
- Should scanning go up entire parent chain or stop at project root (package.json)?
- Should discovered AGENTS.md files show in UI as tool calls, or load silently?
- Should there be a way to disable AGENTS.md loading?
