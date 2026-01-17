# Feature Plans

## Implementation Priority

| Priority | Feature | Complexity | Dependencies |
|----------|---------|------------|--------------|
| 1 | file-modification-tracking | Low | None |
| 2 | custom-commands | Medium | None |
| 3 | file-mentions | Low | None |
| 4 | plan-mode | Medium | None |
| 5 | skills | Medium | custom-commands |
| 6 | agents-md-loading | Medium | None |
| 7 | open-router-migration | High | None (async) |

## Dependency Graph

```
custom-commands
      │
      ▼
   skills

(all others are independent)
```

## Quick Reference

### Standalone Features (can implement in any order)
- **file-modification-tracking** - Track file mtime to prevent overwrites
- **file-mentions** - @syntax to include files in context
- **plan-mode** - Read-only planning mode
- **agents-md-loading** - Auto-load AGENTS.md files

### Sequential Features
- **custom-commands** → **skills** (skills extends commands)

### Async/Experimental
- **open-router-migration** - Multi-provider support (lowest priority)

## New Modules to Create

| Feature | New Files |
|---------|-----------|
| agents-md-loading | `src/utils/agents-loader.ts` |
| custom-commands | `src/commands/{loader,types,parser}.ts` |
| file-modification-tracking | `src/tools/file-tracker.ts` |
| open-router-migration | `src/providers/{provider,anthropic,openrouter}.ts` |
| skills | `src/skills/skill-loader.ts` |
| file-mentions | `src/utils/mention-processor.ts` |

## Test Locations

| Feature | Test Directory |
|---------|----------------|
| agents-md-loading | `tests/utils/agents-loader.test.ts` |
| custom-commands | `tests/commands/` |
| file-modification-tracking | `tests/tools/file-tracker.test.ts` |
| open-router-migration | `tests/providers/` |
| plan-mode | `tests/modes/` |
| skills | `tests/skills/` |
| file-mentions | `tests/utils/mention-processor.test.ts` |
