# File State Management

Two features built on the same foundation:
1. **File Modification Tracking** - Prevent overwriting externally modified files
2. **Agents MD Loading** - Auto-load context files from directories

---

# Phase 1: Simple Tests

Write these tests first. They define the interface that the simple implementation must satisfy.

## Test File Structure

```
tests/
  file-tracker.test.ts    # FileTracker unit tests
```

## FileTracker Tests

```typescript
// tests/file-tracker.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { fileTracker, FileTracker } from '../src/file-tracker';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dir, 'tmp/tracker-test');

describe('FileTracker', () => {
  let tracker: FileTracker;

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    tracker = new FileTracker();
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('file modification tracking', () => {
    test('no conflict when file is unchanged after tracking', () => {
      const path = join(TEST_DIR, 'test.txt');
      writeFileSync(path, 'hello');
      
      tracker.trackRead(path);
      
      expect(tracker.hasBeenModifiedSinceRead(path)).toBe(false);
    });

    test('conflict detected when file modified externally', async () => {
      const path = join(TEST_DIR, 'test.txt');
      writeFileSync(path, 'hello');
      tracker.trackRead(path);
      
      await new Promise(r => setTimeout(r, 10));
      writeFileSync(path, 'world');
      
      expect(tracker.hasBeenModifiedSinceRead(path)).toBe(true);
    });

    test('no conflict for files that were never tracked', () => {
      const path = join(TEST_DIR, 'untracked.txt');
      writeFileSync(path, 'hello');
      
      expect(tracker.hasBeenModifiedSinceRead(path)).toBe(false);
    });

    test('no conflict after re-tracking a modified file', async () => {
      const path = join(TEST_DIR, 'test.txt');
      writeFileSync(path, 'hello');
      tracker.trackRead(path);
      
      await new Promise(r => setTimeout(r, 10));
      writeFileSync(path, 'world');
      expect(tracker.hasBeenModifiedSinceRead(path)).toBe(true);
      
      tracker.trackRead(path);
      expect(tracker.hasBeenModifiedSinceRead(path)).toBe(false);
    });
  });

  describe('agents.md loading', () => {
    test('returns agents.md content when file exists in same directory', () => {
      const agentsMdPath = join(TEST_DIR, 'agents.md');
      writeFileSync(agentsMdPath, '# Rules');
      
      const filePath = join(TEST_DIR, 'file.ts');
      const result = tracker.getAgentsMdIfNew(filePath);
      
      expect(result).toBe('# Rules');
    });

    test('returns null when no agents.md in directory', () => {
      const filePath = join(TEST_DIR, 'file.ts');
      const result = tracker.getAgentsMdIfNew(filePath);
      
      expect(result).toBeNull();
    });

    test('same agents.md only returned once per session', () => {
      const agentsMdPath = join(TEST_DIR, 'agents.md');
      writeFileSync(agentsMdPath, '# Rules');
      
      const first = tracker.getAgentsMdIfNew(join(TEST_DIR, 'a.ts'));
      const second = tracker.getAgentsMdIfNew(join(TEST_DIR, 'b.ts'));
      
      expect(first).toBe('# Rules');
      expect(second).toBeNull();
    });

    test('clearSession allows same agents.md to be returned again', () => {
      const agentsMdPath = join(TEST_DIR, 'agents.md');
      writeFileSync(agentsMdPath, '# Rules');
      
      tracker.getAgentsMdIfNew(join(TEST_DIR, 'a.ts'));
      tracker.clearSession();
      const second = tracker.getAgentsMdIfNew(join(TEST_DIR, 'b.ts'));
      
      expect(second).toBe('# Rules');
    });
  });
});
```

## Integration Tests (add to existing test files)

```typescript
// tests/tools/edit-file.test.ts - Add these tests
describe('editFile with file tracking', () => {
  test('returns error when file was modified since last read', async () => {
    const path = join(TEST_DIR, 'test.txt');
    writeFileSync(path, 'original content');
    
    // Simulate: agent reads file
    fileTracker.trackRead(path);
    
    // External modification
    await new Promise(r => setTimeout(r, 10));
    writeFileSync(path, 'externally modified');
    
    // Agent tries to edit - should fail
    const result = editFile(path, 'original', 'new');
    expect(result).toContain('Error:');
    expect(result).toContain('modified');
  });
});
```

```typescript
// tests/tools/read-file.test.ts - Add these tests
describe('readFile with file tracking', () => {
  test('tracks file after reading', () => {
    const path = join(TEST_DIR, 'test.txt');
    writeFileSync(path, 'content');
    
    readFile(path);
    
    expect(fileTracker.hasBeenModifiedSinceRead(path)).toBe(false);
  });
});
```

## Simple Test Checklist

- [ ] `trackRead(path)` stores file's mtime
- [ ] `hasBeenModifiedSinceRead(path)` returns false for unchanged files
- [ ] `hasBeenModifiedSinceRead(path)` returns true for modified files
- [ ] `hasBeenModifiedSinceRead(path)` returns false for untracked files
- [ ] Re-tracking a file clears conflict state
- [ ] `getAgentsMdIfNew(path)` returns content when agents.md exists
- [ ] `getAgentsMdIfNew(path)` returns null when no agents.md
- [ ] `getAgentsMdIfNew(path)` deduplicates within session
- [ ] `clearSession()` resets deduplication

---

# Phase 2: Simple Implementation

Implement this to make the tests pass.

## Core: File Tracker (~40 LOC)

```typescript
// src/file-tracker.ts
import { statSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export class FileTracker {
  private lastReadTime = new Map<string, number>();
  private loadedAgentsMd = new Set<string>();

  trackRead(path: string): void {
    const stat = statSync(path);
    this.lastReadTime.set(path, stat.mtimeMs);
  }

  hasBeenModifiedSinceRead(path: string): boolean {
    const lastRead = this.lastReadTime.get(path);
    if (!lastRead) return false;
    
    const stat = statSync(path);
    return stat.mtimeMs > lastRead;
  }

  getAgentsMdIfNew(filePath: string): string | null {
    const dir = dirname(filePath);
    const agentsMdPath = join(dir, 'agents.md');
    
    if (existsSync(agentsMdPath) && !this.loadedAgentsMd.has(agentsMdPath)) {
      this.loadedAgentsMd.add(agentsMdPath);
      return readFileSync(agentsMdPath, 'utf-8');
    }
    return null;
  }

  clearSession(): void {
    this.loadedAgentsMd.clear();
  }
}

export const fileTracker = new FileTracker();
```

## Integration with edit_file

```typescript
// src/tools/edit-file.ts - Add to existing file
import { fileTracker } from '../file-tracker';

export function editFile(path: string, oldStr: string, newStr: string): string {
  // Skip check for new file creation
  if (oldStr !== '' && fileTracker.hasBeenModifiedSinceRead(path)) {
    return `Error: File "${path}" was modified since you last read it. Please read the file again.`;
  }

  // ... existing edit logic ...

  // Track the write
  fileTracker.trackRead(path);
  
  return `Updated file "${path}"`;
}
```

## Integration with read_file

```typescript
// src/tools/read-file.ts - Add to existing file
import { fileTracker } from '../file-tracker';

export function readFile(path: string): string {
  const content = readFileSync(path, 'utf-8');
  fileTracker.trackRead(path);
  return content;
}
```

## Integration with Agent (agents.md injection)

```typescript
// src/agent/agent.ts - Add to existing file
import { fileTracker } from '../file-tracker';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

// In constructor, load root agents.md:
const rootAgentsMd = join(cwd(), 'agents.md');
if (existsSync(rootAgentsMd)) {
  const content = readFileSync(rootAgentsMd, 'utf-8');
  this.conversation.push({
    role: 'user',
    content: `[Project instructions from agents.md]\n\n${content}`,
  });
  fileTracker.loadedAgentsMd.add(rootAgentsMd);
}

// In executeToolWithErrorHandling, after read_file succeeds:
if (toolUse.name === ToolName.READ_FILE && !result.startsWith('Error:')) {
  const path = (toolUse.input as { path: string }).path;
  const agentsMd = fileTracker.getAgentsMdIfNew(path);
  if (agentsMd) {
    this.conversation.push({
      role: 'user',
      content: `[Loaded from ${dirname(path)}/agents.md]\n\n${agentsMd}`,
    });
  }
}

// In clearHistory:
clearHistory(): void {
  this.conversation = [];
  fileTracker.clearSession();
}
```

## Simple Implementation Checklist

- [ ] Create `src/file-tracker.ts` with FileTracker class
- [ ] Add `trackRead(path)` using mtime
- [ ] Add `hasBeenModifiedSinceRead(path)` comparing mtime
- [ ] Add `getAgentsMdIfNew(path)` with Set deduplication
- [ ] Add `clearSession()` to reset loaded set
- [ ] Export singleton `fileTracker`
- [ ] Update `readFile` to call `trackRead`
- [ ] Update `editFile` to check `hasBeenModifiedSinceRead`
- [ ] Update `editFile` to call `trackRead` after success
- [ ] Load root agents.md in Agent constructor
- [ ] Inject agents.md after successful read_file
- [ ] Clear session in `clearHistory()`

---

# Phase 3: Production Tests

After simple implementation works, add these tests for production features.

## Additional Test Files

```
tests/
  file-state/
    tracker.test.ts       # Enhanced FileTracker tests
    agents-md.test.ts     # AgentsMdLoader tests
    manager.test.ts       # FileStateManager integration
    watcher.test.ts       # FileWatcher tests
```

## Production-Specific Tests

```typescript
// tests/file-state/tracker.test.ts
describe('FileTracker (production)', () => {
  test('no false positive when file touched but content unchanged', async () => {
    const path = join(TEST_DIR, 'test.txt');
    writeFileSync(path, 'hello');
    tracker.track(path, 'hello');
    
    // Touch file (changes mtime but not content)
    await new Promise(r => setTimeout(r, 10));
    const content = readFileSync(path, 'utf-8');
    writeFileSync(path, content);
    
    const result = tracker.checkConflict(path);
    expect(result.hasConflict).toBe(false);
  });

  test('conflict detected when tracked file is deleted', () => {
    const path = join(TEST_DIR, 'test.txt');
    writeFileSync(path, 'hello');
    tracker.track(path, 'hello');
    unlinkSync(path);
    
    const result = tracker.checkConflict(path);
    expect(result.hasConflict).toBe(true);
    expect(result.reason).toBe('deleted');
  });

  test('invalidate removes tracking for path', () => {
    const path = join(TEST_DIR, 'test.txt');
    writeFileSync(path, 'hello');
    tracker.track(path, 'hello');
    
    tracker.invalidate(path);
    
    const result = tracker.checkConflict(path);
    expect(result.hasConflict).toBe(false);
  });
});
```

```typescript
// tests/file-state/agents-md.test.ts
describe('AgentsMdLoader (production)', () => {
  test('walks up directory tree to find all agents.md files', async () => {
    mkdirSync(join(TEST_DIR, 'src', 'components'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'agents.md'), '# Root');
    writeFileSync(join(TEST_DIR, 'src', 'agents.md'), '# Src');
    writeFileSync(join(TEST_DIR, 'src', 'components', 'agents.md'), '# Components');
    
    await loader.index();
    
    const results = loader.getForPath(join(TEST_DIR, 'src', 'components', 'Button.tsx'));
    
    expect(results).toHaveLength(3);
    expect(results[0].content).toBe('# Root');
    expect(results[1].content).toBe('# Src');
    expect(results[2].content).toBe('# Components');
  });

  test('ignores node_modules and .git directories', async () => {
    mkdirSync(join(TEST_DIR, 'node_modules', 'pkg'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'node_modules', 'pkg', 'agents.md'), '# Should ignore');
    
    await loader.index();
    
    const results = loader.getForPath(join(TEST_DIR, 'node_modules', 'pkg', 'index.js'));
    expect(results).toHaveLength(0);
  });

  test('LRU cache evicts old entries', async () => {
    // Create many agents.md files exceeding cache size
    // Verify oldest entries are evicted
  });

  test('invalidate removes path from cache', async () => {
    writeFileSync(join(TEST_DIR, 'agents.md'), '# Original');
    await loader.index();
    
    loader.getForPath(join(TEST_DIR, 'file.ts'));
    loader.clearSession();
    
    writeFileSync(join(TEST_DIR, 'agents.md'), '# Updated');
    loader.invalidate(join(TEST_DIR, 'agents.md'));
    
    const results = loader.getForPath(join(TEST_DIR, 'file.ts'));
    expect(results[0].content).toBe('# Updated');
  });
});
```

```typescript
// tests/file-state/watcher.test.ts
describe('FileWatcher', () => {
  test('calls callback on file change', async () => {
    const callback = mock(() => {});
    const watcher = new FileWatcher(TEST_DIR, callback);
    
    watcher.start();
    writeFileSync(join(TEST_DIR, 'test.txt'), 'initial');
    
    await new Promise(r => setTimeout(r, 200));
    writeFileSync(join(TEST_DIR, 'test.txt'), 'changed');
    await new Promise(r => setTimeout(r, 200));
    
    expect(callback).toHaveBeenCalledWith(
      join(TEST_DIR, 'test.txt'),
      'change'
    );
    
    watcher.stop();
  });

  test('calls callback on file delete', async () => {
    const callback = mock(() => {});
    const watcher = new FileWatcher(TEST_DIR, callback);
    
    writeFileSync(join(TEST_DIR, 'test.txt'), 'content');
    watcher.start();
    
    await new Promise(r => setTimeout(r, 200));
    unlinkSync(join(TEST_DIR, 'test.txt'));
    await new Promise(r => setTimeout(r, 200));
    
    expect(callback).toHaveBeenCalledWith(
      join(TEST_DIR, 'test.txt'),
      'unlink'
    );
    
    watcher.stop();
  });
});
```

```typescript
// tests/file-state/manager.test.ts
describe('FileStateManager', () => {
  test('initializes and indexes agents.md files', async () => {
    writeFileSync(join(TEST_DIR, 'agents.md'), '# Root');
    
    const manager = new FileStateManager(TEST_DIR);
    await manager.initialize();
    
    const root = manager.getRootAgentsMd();
    expect(root).toBe('# Root');
    
    manager.dispose();
  });

  test('watcher invalidates tracker on file change', async () => {
    const path = join(TEST_DIR, 'test.txt');
    writeFileSync(path, 'hello');
    
    const manager = new FileStateManager(TEST_DIR);
    await manager.initialize();
    
    manager.trackRead(path, 'hello');
    
    await new Promise(r => setTimeout(r, 200));
    writeFileSync(path, 'world');
    await new Promise(r => setTimeout(r, 200));
    
    // Watcher should have invalidated tracking
    const conflict = manager.checkForConflict(path);
    expect(conflict.hasConflict).toBe(false);
    
    manager.dispose();
  });
});
```

## Production Test Checklist

- [ ] Content hash prevents false positives from mtime-only changes
- [ ] Deleted files are detected as conflicts
- [ ] `invalidate(path)` removes tracking
- [ ] Directory tree walking finds all ancestor agents.md files
- [ ] Results ordered root-first (parent before child)
- [ ] node_modules and .git are ignored
- [ ] LRU cache evicts entries when full
- [ ] Cache invalidation works
- [ ] FileWatcher calls callback on change
- [ ] FileWatcher calls callback on delete
- [ ] FileStateManager coordinates all components
- [ ] Watcher invalidates tracker on external changes

---

# Phase 4: Production Implementation

Implement after production tests are written.

## Architecture

```
src/
  file-state/
    manager.ts        # Main orchestrator
    tracker.ts        # File modification tracking with hashing
    agents-md.ts      # Agents.md discovery and loading
    watcher.ts        # File system watcher
    types.ts          # Shared types
    index.ts          # Barrel export
```

## Dependencies

```bash
bun add chokidar fast-glob lru-cache
```

## FileTracker with Content Hashing

```typescript
// src/file-state/tracker.ts
import { createHash } from 'node:crypto';
import { readFileSync, statSync, existsSync } from 'node:fs';

interface TrackedFile {
  contentHash: string;
  mtime: number;
  size: number;
}

export interface ConflictResult {
  hasConflict: boolean;
  reason?: 'modified' | 'deleted';
  message?: string;
  currentContent?: string;
}

export class FileTracker {
  private tracked = new Map<string, TrackedFile>();

  track(path: string, content: string): void {
    const stat = statSync(path);
    this.tracked.set(path, {
      contentHash: this.hash(content),
      mtime: stat.mtimeMs,
      size: stat.size,
    });
  }

  invalidate(path: string): void {
    this.tracked.delete(path);
  }

  checkConflict(path: string): ConflictResult {
    const tracked = this.tracked.get(path);
    
    if (!tracked) {
      return { hasConflict: false };
    }

    if (!existsSync(path)) {
      return {
        hasConflict: true,
        reason: 'deleted',
        message: `File was deleted since last read.`,
      };
    }

    const stat = statSync(path);
    
    // Fast path: mtime and size unchanged
    if (stat.mtimeMs === tracked.mtime && stat.size === tracked.size) {
      return { hasConflict: false };
    }

    // Full check: compare content hash
    const currentContent = readFileSync(path, 'utf-8');
    const currentHash = this.hash(currentContent);

    if (currentHash === tracked.contentHash) {
      // mtime changed but content same (e.g., touch)
      this.tracked.set(path, {
        contentHash: currentHash,
        mtime: stat.mtimeMs,
        size: stat.size,
      });
      return { hasConflict: false };
    }

    return {
      hasConflict: true,
      reason: 'modified',
      message: `File was modified externally since last read.`,
      currentContent,
    };
  }

  private hash(content: string): string {
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}
```

## AgentsMdLoader

```typescript
// src/file-state/agents-md.ts
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LRUCache } from 'lru-cache';

export interface AgentsMdResult {
  path: string;
  content: string;
}

export class AgentsMdLoader {
  private locations = new Set<string>();
  private cache: LRUCache<string, string>;
  private loadedInSession = new Set<string>();

  constructor(private workingDir: string) {
    this.cache = new LRUCache({
      max: 50,
      maxSize: 1024 * 1024,
      sizeCalculation: (value) => value.length,
    });
  }

  async index(): Promise<void> {
    const glob = await import('fast-glob');
    const files = await glob.default('**/agents.md', {
      cwd: this.workingDir,
      ignore: ['node_modules/**', '.git/**', 'dist/**'],
      absolute: true,
    });

    for (const file of files) {
      this.locations.add(file);
    }
  }

  invalidate(path: string): void {
    this.cache.delete(path);
  }

  getRoot(): string | null {
    const rootPath = join(this.workingDir, 'agents.md');
    if (!this.locations.has(rootPath)) return null;
    if (this.loadedInSession.has(rootPath)) return null;
    
    this.loadedInSession.add(rootPath);
    return this.getContent(rootPath);
  }

  getForPath(filePath: string): AgentsMdResult[] {
    const results: AgentsMdResult[] = [];
    
    let dir = dirname(filePath);
    const pathsToCheck: string[] = [];
    
    while (dir.startsWith(this.workingDir) || dir === this.workingDir) {
      const agentsMdPath = join(dir, 'agents.md');
      if (this.locations.has(agentsMdPath)) {
        pathsToCheck.unshift(agentsMdPath);
      }
      
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }

    for (const path of pathsToCheck) {
      if (this.loadedInSession.has(path)) continue;
      
      this.loadedInSession.add(path);
      results.push({
        path,
        content: this.getContent(path),
      });
    }

    return results;
  }

  private getContent(path: string): string {
    const cached = this.cache.get(path);
    if (cached) return cached;

    const content = readFileSync(path, 'utf-8');
    this.cache.set(path, content);
    return content;
  }

  clearSession(): void {
    this.loadedInSession.clear();
  }
}
```

## FileWatcher

```typescript
// src/file-state/watcher.ts
import chokidar, { FSWatcher } from 'chokidar';

type WatchEvent = 'add' | 'change' | 'unlink';

export class FileWatcher {
  private watcher: FSWatcher | null = null;

  constructor(
    private workingDir: string,
    private onFileChange: (path: string, event: WatchEvent) => void
  ) {}

  start(): void {
    this.watcher = chokidar.watch(this.workingDir, {
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    this.watcher.on('change', (path) => this.onFileChange(path, 'change'));
    this.watcher.on('add', (path) => this.onFileChange(path, 'add'));
    this.watcher.on('unlink', (path) => this.onFileChange(path, 'unlink'));
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
  }
}
```

## FileStateManager

```typescript
// src/file-state/manager.ts
import { FileTracker, ConflictResult } from './tracker';
import { AgentsMdLoader, AgentsMdResult } from './agents-md';
import { FileWatcher } from './watcher';

export class FileStateManager {
  private tracker: FileTracker;
  private agentsMd: AgentsMdLoader;
  private watcher: FileWatcher;

  constructor(workingDir: string) {
    this.tracker = new FileTracker();
    this.agentsMd = new AgentsMdLoader(workingDir);
    
    this.watcher = new FileWatcher(workingDir, (path, event) => {
      if (event === 'change' || event === 'unlink') {
        this.tracker.invalidate(path);
      }
      if (path.endsWith('agents.md')) {
        this.agentsMd.invalidate(path);
      }
    });
  }

  async initialize(): Promise<void> {
    await this.agentsMd.index();
    this.watcher.start();
  }

  trackRead(path: string, content: string): void {
    this.tracker.track(path, content);
  }

  checkForConflict(path: string): ConflictResult {
    return this.tracker.checkConflict(path);
  }

  getAgentsMdForPath(filePath: string): AgentsMdResult[] {
    return this.agentsMd.getForPath(filePath);
  }

  getRootAgentsMd(): string | null {
    return this.agentsMd.getRoot();
  }

  clearSession(): void {
    this.agentsMd.clearSession();
  }

  dispose(): void {
    this.watcher.stop();
  }
}
```

## Production Implementation Checklist

### Core Infrastructure
- [ ] Create `src/file-state/` directory
- [ ] Create `types.ts` with shared interfaces
- [ ] Create `index.ts` barrel export

### FileTracker (with hashing)
- [ ] Implement content hashing with SHA-256
- [ ] Store hash + mtime + size per file
- [ ] Fast path: skip hash if mtime/size unchanged
- [ ] Handle deleted files
- [ ] Provide detailed conflict results
- [ ] Add `invalidate(path)` method

### AgentsMdLoader
- [ ] Index all agents.md files at startup using fast-glob
- [ ] Walk directory hierarchy from file to root
- [ ] Return files in order (root first, most specific last)
- [ ] Track loaded files per session
- [ ] LRU cache with size limit
- [ ] Add `invalidate(path)` method

### FileWatcher
- [ ] Use chokidar for cross-platform watching
- [ ] Ignore node_modules, .git, dist
- [ ] Debounce rapid changes (awaitWriteFinish)
- [ ] Notify on change/add/unlink events

### FileStateManager
- [ ] Coordinate tracker, loader, and watcher
- [ ] Wire up watcher events to invalidate tracker/loader
- [ ] Expose unified API for agent

### Agent Integration
- [ ] Replace simple fileTracker with FileStateManager
- [ ] Update tool execution to use manager
- [ ] Add `initialize()` and `dispose()` lifecycle
- [ ] Update App.tsx for async initialization

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Content hashing | mtime alone has false positives (touch) and false negatives (fast edits) |
| SHA-256 truncated to 16 chars | Good enough for collision avoidance, compact storage |
| Index at startup | Avoid scanning on every read_file call |
| File watcher | Detect external changes without polling |
| LRU cache | Bound memory usage for agents.md content |
| Root-first ordering | Parent rules apply first, child rules can override |
