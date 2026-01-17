# Plan Mode

## Overview
A mode where the agent plans but doesn't execute file modifications.

## Key Points from Discussion
- Removing tools from system message breaks prompt cache
- Design decision: plan mode vs plan subcommand
- Subcommand approach is simpler (separate invocation)
- Could be prompted to not use tools, hide errors if it does
- May live in a separate context entirely
- Cursor possibly implements as hidden subcommand

## Implementation Options

### Option A: Plan Subcommand (Recommended)
- Separate command that spawns agent with read-only tools
- Available tools: `read_file`, `list_files` (NO `edit_file`, NO `run_command`)
- Writes plan to stdout or designated plan file
- Simpler, doesn't break cache

### Option B: Dynamic Plan Mode
- Toggle during conversation
- Would break cache when tools removed
- More complex state management

## Files to Modify

### 1. `src/index.tsx` (Lines 1-5)
- Add CLI argument parsing before render
- Determine mode from args: `const mode = args[0] || 'chat'`
- Pass mode prop to App component

### 2. `src/agent/agent.ts` (Lines 14-28, 32-46, 130-136)
- Parameterize `getSystemPrompt(mode: string)`
- Add `mode` parameter to Agent constructor
- Plan mode prompt: "You are in PLAN mode. Write detailed plans but do NOT execute."

### 3. `src/tools/index.ts` (Lines 8-73, 75-98)
- Create `getTools(mode: string)` function returning filtered tool array
- Plan mode tools: `read_file`, `list_files` only
- Chat mode tools: all tools (`read_file`, `list_files`, `edit_file`, `run_command`)
- Add mode check in `executeTool()` dispatcher as safety guard

### 4. `src/components/App.tsx` (Lines 24-54, 73-92)
- Accept `mode` prop
- Pass mode to Agent constructor
- `handleSubmit()` unchanged (same flow for all modes)

### 5. `src/agent/types.ts` (Lines 18-23)
- `ToolName` enum already defined
- Optionally add `mode` to `AgentOptions` type

## Patterns to Follow
- Tool error handling: Return `Error: ` prefix strings
- Tool dispatcher: Switch statement routing (tools/index.ts:75-98)
- Callbacks: `onToolStart`, `onToolComplete` pattern (agent.ts:69-77)

## Implementation Steps (Option A)
1. Add CLI argument parsing to `src/index.tsx`
2. Create `getTools(mode: string)` function in `src/tools/index.ts`
3. Modify `executeTool()` to accept mode parameter
4. Update `getSystemPrompt()` to accept and respect mode
5. Modify Agent constructor to accept mode
6. Update App.tsx to accept and pass mode prop
7. Add mode validation (only allow 'chat' | 'plan')

## Testing
Location: `tests/modes/`

- Test plan mode cannot call `edit_file` tool
- Test plan mode cannot call `run_command` tool
- Test plan mode can call `read_file` and `list_files`
- Test plan mode system prompt includes planning instructions
- Test chat mode has all tools available
- Test invalid mode rejection
