# Session State with Zustand

## Context: what this plan is and when to use it

This plan describes how to refactor the **resumable sessions** feature to use Zustand for state management, addressing code review feedback on the `feat/resumable-sessions` branch.

- **When you want this**: the current implementation has multiple sources of truth (React state + refs + session file), manual ref synchronization, and scattered resume logic. You want a cleaner architecture.
- **What it enables**:
  - **Single source of truth**: Zustand store owns session state, React subscribes to it
  - **No manual refs**: `store.getState()` works outside React lifecycle (cleanup effects, callbacks)
  - **Automatic persistence**: Zustand middleware handles save/load
  - **Colocated logic**: All session/resume code lives in one module
  - **Type reuse**: Consolidate duplicate types
- **How you'd use it in this repo**:
  - Run `bun test` while iterating to lock behavior down
  - The store is the source of truth; components subscribe to slices they need

This document intentionally avoids implementation-sized code blocks. The source of truth should live in `src/` and be validated by `tests/`.

## PR comments being addressed

1. **Refs update pattern** (`App.tsx` lines 42-45): "i don't really want to be updating the refs like this is there a better way?"
2. **State management** (`App.tsx` line ~110): "is there other state management that would make this easier?"
3. **Dual sources of truth** (`App.tsx` line ~229): "something that knows how to store directly to session... now we have two sources of truth"
4. **CLI argument parsing** (`index.tsx` line ~14): "we should be using a tool to check for args"
5. **Code organization** (`index.tsx`): "i want all the resume stuff to be colocated"
6. **Type duplication** (`session.ts` lines 18-21): "why do i need a separate type for this vs the tool call ones we already have?"

## Where to start in this repo

- **Current session code**: `src/session.ts` (persistence functions)
- **App component**: `src/components/App.tsx` (state management, refs, persistence calls)
- **Entry point**: `src/index.tsx` (CLI parsing, session loading)
- **Shared types**: `src/shared/types.ts` (existing `ToolCallStatus`, `MessageRole`)
- **Agent types**: `src/agent/types.ts` (existing `Message` type)

## Concrete file/API targets

Consolidate session state into a Zustand store:

- **Add**: `src/stores/session.ts`
  - exports `useSessionStore` (Zustand store with persist middleware)
  - exports `createSessionStore` (for testing with custom storage)
  - exports `SessionState` type
  - colocates all session/resume logic

- **Modify**: `src/shared/types.ts`
  - move `MessageItem` here (or confirm it can reuse existing types)
  - move `ToolCallItem` here (extend from existing tool call types)

- **Modify**: `src/components/App.tsx`
  - remove `useState` for messages, toolCalls
  - remove `useRef` for messagesRef, toolCallsRef, createdAtRef
  - remove `buildSessionData`, `persistSession` callbacks
  - subscribe to store with `useSessionStore`

- **Modify**: `src/index.tsx`
  - use Bun's `parseArgs` for CLI argument parsing
  - move resume selection logic to store initialization
  - simplify to just initializing store and rendering App

- **Delete**: `src/session.ts` (after migrating to store)

Target store API (signatures only):

```
SessionState = {
  runId: string | null;
  createdAt: number;
  workingDir: string;
  model: string;
  messages: MessageItem[];
  toolCalls: ToolCallItem[];
  conversation: Message[];
  
  addMessage: (msg: MessageItem) => void;
  addToolCall: (tc: Omit<ToolCallItem, 'status'>) => void;
  updateToolCall: (id: string, update: Partial<ToolCallItem>) => void;
  clearToolCalls: () => void;
  setConversation: (conv: Message[]) => void;
  reset: () => void;
  persist: () => void;
}
```

---

## Phase 1: Add Zustand and create store

### What changes

- **Add dependency**: `zustand` via `bun add zustand`
- **Add**: `src/stores/session.ts` with basic store (no persistence yet)
- **Add**: `tests/stores/session.test.ts` with unit tests

### Implementation checklist

- [x] **1) Install Zustand**
  - Run `bun add zustand`
  - Verify it's added to `package.json`

- [x] **2) Create `src/stores/session.ts`**
  - Define `SessionState` interface
  - Create store with `create<SessionState>()`
  - Implement actions: `addMessage`, `addToolCall`, `updateToolCall`, `clearToolCalls`, `setConversation`, `reset`
  - Export `useSessionStore` hook
  - Export `createSessionStore` factory for testing

- [x] **3) Add unit tests for store**
  - Test `addMessage` appends to messages
  - Test `addToolCall` adds with RUNNING status
  - Test `updateToolCall` modifies existing tool call
  - Test `clearToolCalls` empties array
  - Test `reset` returns to initial state
  - Test store is accessible outside React via `getState()`

### Test cases

- [x] Store initializes with empty state
- [x] Actions modify state correctly
- [x] `getState()` returns current state outside React
- [x] Multiple stores can be created independently (for tests)

---

## Phase 2: Add persistence middleware

### What changes

- **Modify**: `src/stores/session.ts`
  - Add custom storage adapter for file system
  - Wrap store with `persist` middleware
  - Handle atomic writes (temp file + rename)

### Storage adapter design

Zustand's persist middleware expects a storage interface:

```
{
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}
```

We need a file-based adapter that:
- Writes to `./agent/{runId}/sessions.json`
- Uses atomic writes (write to `.tmp`, then rename)
- Handles missing directories (create on write)

### Implementation checklist

- [x] **1) Create file storage adapter**
  - `createFileStorage(runId: string, baseDir?: string): StateStorage`
  - `getItem`: read from `./agent/{runId}/sessions.json`, return null if missing
  - `setItem`: atomic write (temp + rename)
  - `removeItem`: delete file if exists

- [x] **2) Add persist middleware to store**
  - Wrap store creation with `persist(...)`
  - Configure storage adapter
  - Set `name` to session identifier
  - Configure `partialize` to exclude transient state if needed

- [x] **3) Add `persist()` action**
  - Manually trigger persistence (for unmount cleanup)
  - Use `store.persist.rehydrate()` for manual load

- [x] **4) Test persistence**
  - Test save creates file with correct content
  - Test load restores state from file
  - Test atomic write doesn't corrupt on crash (write to temp first)
  - Test missing file returns initial state

### Test cases

- [x] `setItem` creates directory if missing
- [x] `setItem` writes atomically (temp + rename)
- [x] `getItem` returns null for missing file
- [x] `getItem` returns parsed JSON for existing file
- [x] Store rehydrates on creation when file exists

---

## Phase 3: Consolidate types

### What changes

- **Modify**: `src/shared/types.ts`
  - Add `MessageItem` type (or alias to existing)
  - Add `ToolCallItem` type (extending existing types)
  - Export for use in store and components

- **Modify**: `src/stores/session.ts`
  - Import types from `shared/types.ts`
  - Remove duplicate type definitions

### Type consolidation strategy

Current duplication:
- `MessageItem` in `session.ts` duplicates the concept in `App.tsx`
- `ToolCallItem` in `session.ts` duplicates `ToolCallItem` in `App.tsx`

Consolidation:
- `MessageItem`: `{ role: MessageRole; content: string }` — keep in `shared/types.ts`
- `ToolCallItem`: `{ id: string; name: string; input: Record<string, unknown>; status: ToolCallStatus; result?: string; error?: boolean }` — keep in `shared/types.ts`

### Implementation checklist

- [x] **1) Move types to `shared/types.ts`**
  - Add `MessageItem` type
  - Add `ToolCallItem` type
  - Ensure no circular imports

- [x] **2) Update imports in session store**
  - Import from `shared/types.ts`
  - Remove local type definitions

- [x] **3) Update imports in App.tsx**
  - Import from `shared/types.ts`
  - Remove local type definitions

- [x] **4) Verify no type errors**
  - Run `bun run typecheck`
  - All tests still pass

### Test cases

- [x] Types are importable from `shared/types.ts`
- [x] No duplicate type definitions remain
- [x] TypeScript compilation succeeds

---

## Phase 4: Migrate App.tsx to use store

### What changes

- **Modify**: `src/components/App.tsx`
  - Replace `useState` for messages/toolCalls with `useSessionStore`
  - Remove all `useRef` for state synchronization
  - Remove `buildSessionData` and `persistSession` callbacks
  - Update `handleSubmit` to use store actions
  - Update Agent callbacks to use store actions
  - Simplify cleanup effect to just call `store.persist()`

### Before/after comparison

**Before (current):**
```
const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
const messagesRef = useRef<MessageItem[]>(initialMessages);

setMessages((prev) => {
  const next = [...prev, item];
  messagesRef.current = next;  // manual sync
  return next;
});

useEffect(() => {
  return () => persistSession(messagesRef.current, toolCallsRef.current);
}, []);
```

**After (with Zustand):**
```
const messages = useSessionStore((s) => s.messages);
const addMessage = useSessionStore((s) => s.addMessage);

addMessage(item);  // no refs needed

useEffect(() => {
  return () => useSessionStore.getState().persist();
}, []);
```

### Implementation checklist

- [x] **1) Replace messages state**
  - Remove `useState` for messages
  - Subscribe with `useSessionStore((s) => s.messages)`
  - Use `addMessage` action instead of `setMessages`

- [x] **2) Replace toolCalls state**
  - Remove `useState` for toolCalls
  - Subscribe with `useSessionStore((s) => s.toolCalls)`
  - Use `addToolCall` and `updateToolCall` actions

- [x] **3) Remove refs**
  - Delete `messagesRef`, `toolCallsRef`, `createdAtRef`
  - Access current state via `useSessionStore.getState()` where needed

- [x] **4) Update Agent callbacks**
  - `onToolStart`: call `useSessionStore.getState().addToolCall()`
  - `onToolComplete`: call `useSessionStore.getState().updateToolCall()`

- [x] **5) Simplify cleanup effect**
  - Replace complex persistence logic with `useSessionStore.getState().persist()`

- [x] **6) Update tests**
  - Mock store in component tests
  - Verify components read from store
  - Verify actions are called correctly

### Test cases

- [x] Messages render from store state
- [x] Tool calls render from store state
- [x] `handleSubmit` adds messages via store
- [x] Agent callbacks update store correctly
- [x] Cleanup effect triggers persistence

---

## Phase 5: Migrate CLI parsing and entry point

### What changes

- **Modify**: `src/index.tsx`
  - Use Bun's `parseArgs` utility for CLI parsing
  - Move resume logic into store initialization
  - Simplify entry point to just render App with initialized store

### Bun parseArgs usage

Bun supports Node.js `util.parseArgs`:

```
import { parseArgs } from 'util';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    resume: { type: 'string', short: 'r' },
  },
  allowPositionals: true,
});
```

### Implementation checklist

- [x] **1) Replace manual parsing with `parseArgs`**
  - Import `parseArgs` from `util`
  - Define options schema: `resume` as optional string
  - Handle `--resume` (no value = latest) and `--resume <id>` (specific)

- [x] **2) Move resume logic to store**
  - Add `initializeFromResume(runId?: string)` to store
  - This loads session file and hydrates state
  - Call from `index.tsx` before render

- [x] **3) Simplify entry point**
  - Parse args
  - Initialize store (with resume if specified)
  - Render App (no props needed, App reads from store)

- [x] **4) Colocate resume functions in store**
  - `findLatestRunId()` moves to store module
  - `listRunIds()` moves to store module
  - Export for CLI use

### Test cases

- [x] `--resume` without value loads latest session
- [x] `--resume <id>` loads specific session
- [x] No `--resume` starts fresh session
- [x] Invalid `--resume <id>` shows error and exits
- [x] No sessions to resume shows error and exits

---

## Phase 6: Cleanup and delete old code

### What changes

- **Delete**: `src/session.ts` (all functionality moved to store)
- **Modify**: Remove any remaining imports of old session module
- **Verify**: All tests pass with new implementation

### Implementation checklist

- [x] **1) Remove old session.ts**
  - Delete `src/session.ts`
  - Delete `tests/session.test.ts` (replaced by store tests)

- [x] **2) Update imports**
  - Remove imports of `session.ts` from App.tsx
  - Remove imports from index.tsx
  - Verify no dangling references

- [x] **3) Final test pass**
  - Run `bun test` — all tests pass
  - Run `bun run typecheck` — no type errors
  - Manual test: start fresh, resume latest, resume by ID

### Test cases

- [x] No references to deleted files
- [x] All existing functionality still works
- [x] Tests cover all resume scenarios

---

## Suggested implementation order

1. **Phase 1: Create store** — Foundation, no changes to existing code
2. **Phase 3: Consolidate types** — Small change, reduces duplication
3. **Phase 2: Add persistence** — Store can now save/load
4. **Phase 4: Migrate App.tsx** — Major change, but store is ready
5. **Phase 5: Migrate CLI** — Cleanup entry point
6. **Phase 6: Delete old code** — Final cleanup

---

## Definition of done

### Phase 1 (Create store)
- [x] Zustand installed
- [x] Store created with all actions
- [x] Unit tests pass

### Phase 2 (Persistence)
- [x] File storage adapter works
- [x] Store persists on action
- [x] Store rehydrates on creation

### Phase 3 (Types)
- [x] Types consolidated in `shared/types.ts`
- [x] No duplicate type definitions
- [x] TypeScript compiles

### Phase 4 (Migrate App)
- [x] No `useState` for messages/toolCalls
- [x] No `useRef` for state sync
- [x] Agent callbacks use store
- [x] Cleanup effect uses store

### Phase 5 (Migrate CLI)
- [x] Uses `parseArgs` for CLI
- [x] Resume logic in store module
- [x] Entry point is minimal

### Phase 6 (Cleanup)
- [x] `src/session.ts` deleted
- [x] All tests pass
- [x] Manual testing confirms functionality

---

## Future considerations

- **Multiple sessions**: UI to list and select past sessions
- **Session metadata**: Track token usage, duration, summary per session
- **Session export**: Export conversation as markdown or JSON
- **Session search**: Search across past sessions
- **Auto-cleanup**: Delete old sessions after N days

