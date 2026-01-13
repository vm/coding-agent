# Cursor-Style UI

## Context: what this plan is and when to use it

This plan describes how to make the agent UI more like Cursor's interface, with streaming responses, thinking indicators with elapsed time, and better diff visualization.

- **When you want this**: you want a polished, professional feel where the user sees responses being generated in real-time rather than waiting for the full response.
- **What it enables**:
  - **Streaming text**: Assistant responses appear word-by-word as the model generates them
  - **Thinking indicator**: Shows "Thinking for Ns" with live elapsed time
  - **Streaming code edits**: Code changes appear character-by-character
  - **Better diffs**: Unified diff format with `@@` hunk headers and line numbers
  - **Styled code blocks**: File contents shown in bordered blocks with headers
  - **Compact tool calls**: Single-line tool status with expand/collapse for details

This plan intentionally avoids implementation-sized code blocks. The source of truth should live in `src/` and be validated by `tests/`.

## Where to start in this repo

- **Agent API calls**: `src/agent/agent.ts` (currently uses non-streaming API)
- **Types**: `src/agent/types.ts` (will need streaming event types)
- **UI state**: `src/components/App.tsx` (manages tool calls and loading state)
- **Transcript display**: `src/components/TranscriptView.tsx` (renders messages and tool outputs)
- **Tool call display**: `src/components/ToolCall.tsx` (compact single-line view)

---

## Phase 1: Thinking indicator with elapsed time

The simplest high-impact change. Show "Thinking for 3s" instead of just "thinking…".

### What changes

- **Modify**: `src/components/App.tsx`
  - Track `thinkingStartTime: number | null` in state
  - Set it when loading starts, clear when loading ends
  - Pass elapsed time to TranscriptView

- **Modify**: `src/components/TranscriptView.tsx`
  - Accept `thinkingStartTime` prop
  - Display "Thinking for Ns" with live-updating time
  - Use `useEffect` with interval to update display every 100ms

### Implementation checklist

- [x] **1) Add `thinkingStartTime` state to App.tsx**
  - Set to `Date.now()` when `setLoading(true)`
  - Clear to `null` when `setLoading(false)`

- [x] **2) Pass timing to TranscriptView**
  - Add `thinkingStartTime?: number` prop
  - Compute elapsed: `Math.floor((Date.now() - thinkingStartTime) / 1000)`

- [x] **3) Live-update the thinking display**
  - Use `useState` + `useEffect` with 100ms interval
  - Show "Thinking for Ns" when loading and no tool calls
  - Clean up interval on unmount

### Test cases

- [x] Shows "Thinking" text when loading
- [x] Time updates as seconds pass
- [x] Timer stops when loading ends

---

## Phase 2: Streaming API responses

Stream text from the Anthropic API so responses appear word-by-word.

### What changes

- **Modify**: `src/agent/agent.ts`
  - Use `stream: true` in API call
  - Add new method: `chatStream(message: string): AsyncIterable<StreamEvent>`
  - Emit events for: text delta, tool use start, tool use complete, done

- **Add**: `src/agent/types.ts`
  - StreamEvent union type:
    ```
    | { type: 'text_delta'; text: string }
    | { type: 'tool_start'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'tool_complete'; id: string; result: string; error?: boolean }
    | { type: 'done'; response: AgentResponse }
    ```

- **Modify**: `src/components/App.tsx`
  - Replace `agent.chat()` with `agent.chatStream()`
  - Update `partialText` state as deltas arrive
  - Show partial text in transcript

### Implementation checklist

- [ ] **1) Add StreamEvent types to types.ts**

- [ ] **2) Implement chatStream in agent.ts**
  - Use `client.messages.stream()` from Anthropic SDK
  - Yield events as they arrive
  - Handle tool_use blocks and execute tools
  - Yield final done event

- [ ] **3) Update App.tsx to use streaming**
  - Add `partialText: string` state
  - Iterate over stream events
  - Append text deltas to partialText
  - Clear partialText when done

- [ ] **4) Display partial text in TranscriptView**
  - Show `partialText` after messages when loading
  - Style same as assistant messages but with cursor indicator

### Test cases

- [ ] Text appears incrementally as stream events arrive
- [ ] Tool calls are detected from stream
- [ ] Final response matches non-streaming behavior
- [ ] Handles stream errors gracefully

---

## Phase 3: Better diff visualization

Show proper unified diff format for edit operations.

### Current behavior

```
- old line
- old line 2
+ new line
+ new line 2
```

### Target behavior

```
── edit file: utils.ts ──────────────────────────────
@@ -10,3 +10,4 @@
   const existing = true;
-  const old = 'value';
+  const new = 'value';
+  const added = 'line';
   const more = code;
────────────────────────────────────────────────────
```

### What changes

- **Modify**: `src/components/TranscriptView.tsx`
  - Rewrite `formatEditFileDiff` to generate unified diff
  - Add context lines (3 lines before/after changes)
  - Generate `@@` hunk headers with line numbers
  - Add file header with borders

- **Add**: `src/components/tool-formatting.ts`
  - `generateUnifiedDiff(oldStr, newStr, filename): string[]`
  - Simple diff algorithm (or use a library)

### Implementation checklist

- [ ] **1) Implement basic unified diff generation**
  - Compare old/new line by line
  - Identify changed regions
  - Add context lines around changes

- [ ] **2) Generate hunk headers**
  - Format: `@@ -startOld,countOld +startNew,countNew @@`
  - Group consecutive changes into hunks

- [ ] **3) Add visual styling**
  - File header with horizontal rules
  - Line number gutter (optional)
  - Color: red for deletions, green for additions, gray for context

### Test cases

- [ ] Single line change shows 3 lines context
- [ ] Multiple changes in one file create separate hunks
- [ ] New file (empty old) shows all lines as additions
- [ ] Large diffs are truncated with count

---

## Phase 4: Styled code blocks

Show file contents and command output in bordered blocks.

### Target appearance

```
── read file: config.ts ─────────────────────────────
│ export const config = {
│   port: 3000,
│   host: 'localhost',
│ };
─────────────────────────────────────────────────────
```

### What changes

- **Modify**: `src/components/TranscriptView.tsx`
  - Wrap tool results in bordered blocks
  - Add file/command header
  - Use box-drawing characters for borders

### Implementation checklist

- [ ] **1) Create block rendering helper**
  - `renderCodeBlock(title: string, content: string, width: number): Line[]`
  - Top border with title
  - Content lines with left border
  - Bottom border

- [ ] **2) Apply to read_file results**
  - Show filename in header
  - Content with syntax-appropriate colors

- [ ] **3) Apply to run_command results**
  - Show command in header
  - Output in monospace style

### Test cases

- [ ] Block renders with correct width
- [ ] Title is truncated if too long
- [ ] Empty content shows empty block
- [ ] Long content is truncated with indicator

---

## Phase 5: Streaming code edits

Show code being written character-by-character for edit operations.

### What changes

This is the most complex feature. Requires:
- Detecting edit_file tool calls from stream
- Parsing partial JSON input as it arrives
- Showing the `new_str` content character by character
- Displaying a cursor at the insertion point

- **Modify**: `src/agent/agent.ts`
  - Emit partial tool input as it streams
  - New event: `{ type: 'tool_input_delta'; id: string; delta: string }`

- **Modify**: `src/components/App.tsx`
  - Track partial tool inputs
  - Update display as deltas arrive

- **Modify**: `src/components/TranscriptView.tsx`
  - Show partial edit content with blinking cursor
  - Syntax highlighting for code (basic: keywords, strings, etc.)

### Implementation checklist

- [ ] **1) Stream tool input deltas**
  - Parse `input_json_delta` events from Anthropic stream
  - Emit incremental input as it builds

- [ ] **2) Parse partial JSON safely**
  - Handle incomplete JSON gracefully
  - Extract `new_str` as it becomes available

- [ ] **3) Display streaming edit**
  - Show file being edited with partial content
  - Blinking cursor at end of streamed content
  - Transition to diff view when complete

### Test cases

- [ ] Partial content appears as stream progresses
- [ ] Cursor position updates correctly
- [ ] Handles malformed partial JSON
- [ ] Transitions smoothly to final diff

---

## Phase 6: Collapsible tool outputs

Allow expanding/collapsing verbose tool outputs.

### What changes

- **Modify**: `src/components/App.tsx`
  - Track `expandedToolCalls: Set<string>` state
  - Toggle expansion on keypress or click

- **Modify**: `src/components/TranscriptView.tsx`
  - Accept `expandedToolCalls` prop
  - Show collapsed (single line) or expanded (full output) based on state
  - Add expand/collapse indicator: `▶` or `▼`

### Implementation checklist

- [ ] **1) Add expansion state**
  - `expandedToolCalls: Set<string>` in App.tsx
  - Pass to TranscriptView

- [ ] **2) Implement collapse/expand toggle**
  - Default: collapsed (show header only)
  - Keyboard: Enter on focused tool call toggles
  - Show indicator in header

- [ ] **3) Render based on state**
  - Collapsed: single line with `▶ read file: config.ts (done)`
  - Expanded: full block with content

### Test cases

- [ ] Tool calls start collapsed
- [ ] Toggle changes display
- [ ] State persists across renders
- [ ] Multiple tool calls can be independently expanded

---

## Suggested implementation order

1. **Phase 1: Thinking timer** - Quick win, immediate UX improvement
2. **Phase 3: Better diffs** - High visual impact, self-contained
3. **Phase 4: Code blocks** - Complements diffs, improves read_file
4. **Phase 2: Streaming text** - Core feature, requires API changes
5. **Phase 6: Collapsible** - Nice to have, reduces noise
6. **Phase 5: Streaming edits** - Most complex, requires all other pieces

---

## Definition of done

### Phase 1 (Thinking timer)
- [x] Shows "Thinking for Ns" with live updating time
- [x] Timer stops when response arrives
- [x] Works with and without tool calls

### Phase 2 (Streaming)
- [ ] Text appears incrementally
- [ ] Tool calls work correctly with streaming
- [ ] No regression in final response quality

### Phase 3 (Better diffs)
- [ ] Unified diff format with `@@` headers
- [ ] Context lines around changes
- [ ] Proper coloring and borders

### Phase 4 (Code blocks)
- [ ] File contents in bordered blocks
- [ ] Command output in bordered blocks
- [ ] Consistent visual style

### Phase 5 (Streaming edits)
- [ ] Code appears character by character
- [ ] Cursor shows insertion point
- [ ] Smooth transition to final diff

### Phase 6 (Collapsible)
- [ ] Tool outputs collapsible
- [ ] Keyboard navigation works
- [ ] State persists correctly

