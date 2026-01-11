import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile } from '../../src/tools/read-file';

describe('readFile', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns file contents for existing file', () => {
    const filePath = join(testDir, 'test.txt');
    const content = 'Hello, world!';
    writeFileSync(filePath, content);

    const result = readFile(filePath);
    expect(result).toBe(content);
  });

  it('returns error message for non-existent file', () => {
    const filePath = join(testDir, 'nonexistent.txt');

    const result = readFile(filePath);
    expect(result).toContain('Error');
    expect(result).toContain('nonexistent');
  });

  it('handles files with special characters', () => {
    const filePath = join(testDir, 'test-file-@#$%.txt');
    const content = 'Special chars: @#$%';
    writeFileSync(filePath, content);

    const result = readFile(filePath);
    expect(result).toBe(content);
  });

  // Note: Testing non-Error catch blocks (line 11) is difficult because:
  // 1. Node.js/Bun always throws Error instances
  // 2. fs module properties are readonly and can't be mocked
  // This defensive code path is very unlikely to be hit in practice
});

