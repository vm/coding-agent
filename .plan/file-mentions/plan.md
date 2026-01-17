# File @Mentions

## Overview
Allow users to reference files using @syntax (e.g., `@src/index.ts`) to automatically include file contents in context.

## Use Cases
- `@src/agent.ts` - Include specific file in context
- `@src/tools/` - Include directory listing or all files
- `@package.json` - Quick reference to config files

## Files to Modify

### 1. `src/components/App.tsx` (Lines 73-92)
- `handleSubmit()` receives user text at line 81
- Add @mention extraction BEFORE `agent.chat(text)`
- Best location for preprocessing

### 2. `src/agent/agent.ts` (Lines 160-165)
- `chat()` method receives userMessage
- Alternative location for @mention parsing
- Adds message to conversation at lines 162-164

### 3. `src/components/Input.tsx` (Lines 14-27)
- Collects user keystrokes
- Trims and submits at line 19
- Could add @mention autocomplete here (future)

### 4. NEW: `src/utils/mention-processor.ts`
- `extractMentions(input: string): string[]`
- `expandMentions(input: string, mentions: string[]): Promise<string>`
- Reuse existing `readFile()` from tools

## Patterns to Follow
- Error handling: `Error: ` prefix (read-file.ts:9, list-files.ts:27)
- Path handling: Use `dirname()` from node:path (edit-file.ts:9)
- File existence: Use `existsSync()` (edit-file.ts:19)

## Implementation Steps
1. Create `src/utils/mention-processor.ts`
2. In App.handleSubmit(), extract @mentions from input
3. Validate mentioned paths exist
4. Auto-read mentioned files using readFile tool
5. Prepend file contents in XML format to user message
6. Pass enriched message to agent.chat()

## Input Detection
```typescript
// Regex pattern for @mentions
// Matches: @path/to/file.ts, @./relative, @../parent
// Does NOT match: email@domain.com (requires space or start before @)
const mentionPattern = /(?:^|\s)@([\w\-\.\/]+)/g;

// Extract mentions from user input
function extractMentions(input: string): string[] {
  return [...input.matchAll(mentionPattern)].map(m => m[1]);
}
```

## Escaping @ Symbol
- To use literal `@` without triggering mention: use `\@` or `@@`
- Email addresses naturally excluded (no space before @)
- Example: `send to user@email.com` - not treated as mention
- Example: `look at @src/file.ts` - treated as mention

## Context Injection Options

### Option A: Prepend to user message
```
User: @src/agent.ts explain this file

-> Becomes:
User:
<file path="src/agent.ts">
[file contents]
</file>

explain this file
```

### Option B: Separate system context
Add as tool result or system message before user query.

## Edge Cases
- File doesn't exist: warn user, continue without
- Directory mention: list files or read all (configurable)
- Binary files: skip with warning
- Large files: truncate or warn
- Glob patterns: `@src/*.ts` - expand to multiple files

## Autocomplete (Future)
- On `@` keypress, show file picker/autocomplete
- Fuzzy match against project files
- Show recent files first

## Testing
Location: `tests/utils/mention-processor.test.ts`

- Test @mention parsing
- Test file reading on mention
- Test non-existent file handling
- Test directory mentions
- Test multiple mentions in single message
- Test email addresses are NOT treated as mentions
- Test escaped @ symbols
