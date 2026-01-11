import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listFiles } from '../../src/tools/list-files';

describe('listFiles', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns list of files in directory', () => {
    writeFileSync(join(testDir, 'file1.txt'), 'content1');
    writeFileSync(join(testDir, 'file2.txt'), 'content2');
    mkdirSync(join(testDir, 'subdir'));

    const result = listFiles(testDir);
    expect(result).toContain('file1.txt');
    expect(result).toContain('file2.txt');
    expect(result).toContain('subdir');
  });

  it('returns error for non-existent directory', () => {
    const nonExistentPath = join(testDir, 'nonexistent');

    const result = listFiles(nonExistentPath);
    expect(result).toContain('Error');
    expect(result).toContain('nonexistent');
  });

  it('excludes hidden files by default', () => {
    writeFileSync(join(testDir, '.hidden'), 'hidden content');
    writeFileSync(join(testDir, 'visible.txt'), 'visible content');

    const result = listFiles(testDir);
    expect(result).toContain('visible.txt');
    expect(result).not.toContain('.hidden');
  });

  it('shows directories with trailing /', () => {
    mkdirSync(join(testDir, 'subdir'));
    writeFileSync(join(testDir, 'file.txt'), 'content');

    const result = listFiles(testDir);
    expect(result).toContain('subdir/');
    expect(result).toContain('file.txt');
  });

  // Note: Testing non-Error catch blocks (line 29) is difficult because:
  // 1. Node.js/Bun always throws Error instances
  // 2. fs module properties are readonly and can't be mocked
  // This defensive code path is very unlikely to be hit in practice
});

