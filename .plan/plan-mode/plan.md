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
- Separate command that spawns agent without write tools
- Writes to a single plan file only
- Simpler, doesn't break cache

### Option B: Dynamic Plan Mode
- Toggle during conversation
- Would break cache when tools removed
- More complex state management

## Implementation Steps (Option A)
1. Create plan subcommand entry point
2. Load agent with read-only tools (read_file, list_files, run_command for read-only ops)
3. Add single tool: write_plan or edit dedicated plan file
4. Agent outputs plan to .plan/current.md or similar
5. Return summary to main context if needed

## Testing
- Test plan mode cannot modify files
- Test plan output is properly formatted
- Test transition from plan to execution
