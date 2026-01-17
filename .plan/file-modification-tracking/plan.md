# File Modification Tracking

## Overview
Track last modified time of files to prevent overwriting changes made by external systems between reads.

## Key Points from Discussion
- Agent has a file watching system
- If another process modifies a file and you try to edit_file, it checks internal tracker
- Compares "last time Claude modified this file" vs current mtime
- If modified externally, re-read file before editing

## Files to Modify

### 1. NEW: `src/tools/file-tracker.ts`
- Store map of `filepath -> {mtime: number, mtimeMs: number, size: number}`
- `recordFileRead(path: string): void` - capture current file stats
- `checkFileModified(path: string): boolean` - compare current vs recorded
- `getLastRecordedMtime(path: string): number | null`
- `clearTracker(): void` - reset on demand

### 2. `src/tools/read-file.ts` (Lines 1-13)
- Import tracker module
- After successful read, call `tracker.recordFileRead(path)`
- Return content as normal

### 3. `src/tools/edit-file.ts` (Lines 1-47)
- Import tracker module
- Before editing (line 19-23), check `tracker.checkFileModified(path)`
- If modified externally: return `Error: File modified externally. Please re-read file first.`
- After successful write (line 38), update recorded mtime

### 4. `src/agent/types.ts` (Optional)
```typescript
export type FileMetadata = {
  path: string;
  mtime: number;
  mtimeMs: number;
  size: number;
};
```

## Patterns to Follow
- Error handling: try-catch with `Error: ` prefix (edit-file.ts, read-file.ts)
- File stats: Use `statSync()` like list-files.ts lines 14-16
- Testing: Use `mkdtempSync` from node:os tmpdir()

## Implementation Steps
1. Create `src/tools/file-tracker.ts` with metadata tracking map
2. Update `src/tools/read-file.ts` to record mtime on read
3. Update `src/tools/edit-file.ts` to check mtime before edit
4. On mtime mismatch, return error prompting re-read
5. After successful write, update recorded mtime
6. Write tests in `tests/tools/file-tracker.test.ts`

## Re-read Workflow
When edit detects external modification:
1. Model receives error: "File modified externally. Please re-read..."
2. Model calls read_file tool again
3. Model retries edit with updated content

## State Persistence
- Tracker state is **per-session only** (not persisted to disk)
- On agent restart, all files need to be re-read before editing
- This is intentional: avoids stale state from previous sessions

## Testing
Location: `tests/tools/file-tracker.test.ts`

- Test external file modification between read and edit
- Test multiple sequential edits to same file
- Test parallel reads of same file
- Test file deleted externally before edit
- Test file permission changed externally
- Test tracker reset on clearTracker()
