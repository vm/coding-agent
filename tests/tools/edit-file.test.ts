import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { editFile } from '../../src/tools/edit-file';

describe('editFile', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates new file when old_str is empty', () => {
    const filePath = join(testDir, 'new-file.txt');
    const content = 'New file content';

    const result = editFile(filePath, '', content);
    expect(result).toContain('Created');
    
    expect(existsSync(filePath)).toBe(true);
    expect(readFileSync(filePath, 'utf-8')).toBe(content);
  });

  it('creates parent directories if they don\'t exist', () => {
    const filePath = join(testDir, 'nested', 'deep', 'file.txt');
    const content = 'Nested file';

    const result = editFile(filePath, '', content);
    expect(result).toContain('Created');
    
    expect(existsSync(filePath)).toBe(true);
    expect(readFileSync(filePath, 'utf-8')).toBe(content);
  });

  it('replaces old_str with new_str in existing file', () => {
    const filePath = join(testDir, 'test.txt');
    const originalContent = 'Hello, world!';
    writeFileSync(filePath, originalContent);

    const result = editFile(filePath, 'world', 'universe');
    expect(result).toContain('Updated');
    
    const newContent = readFileSync(filePath, 'utf-8');
    expect(newContent).toBe('Hello, universe!');
  });

  it('returns error when old_str not found', () => {
    const filePath = join(testDir, 'test.txt');
    writeFileSync(filePath, 'Hello, world!');

    const result = editFile(filePath, 'notfound', 'replacement');
    expect(result).toContain('Error');
    expect(result).toContain('not found');
  });

  it('returns error when old_str appears multiple times', () => {
    const filePath = join(testDir, 'test.txt');
    writeFileSync(filePath, 'Hello hello hello');

    const result = editFile(filePath, 'hello', 'hi');
    expect(result).toContain('Error');
    expect(result).toContain('times');
  });

  it('handles empty new_str (deletion)', () => {
    const filePath = join(testDir, 'test.txt');
    writeFileSync(filePath, 'Hello, world!');

    const result = editFile(filePath, ', world', '');
    expect(result).toContain('Updated');
    
    const newContent = readFileSync(filePath, 'utf-8');
    expect(newContent).toBe('Hello!');
  });

  // Note: Testing non-Error catch blocks (line 45) is difficult because:
  // 1. Node.js/Bun always throws Error instances
  // 2. fs module properties are readonly and can't be mocked
  // This defensive code path is very unlikely to be hit in practice
});

