import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executeTool } from '../../src/tools/index';

describe('executeTool (dispatcher)', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('routes read_file to readFile function', () => {
    const filePath = join(testDir, 'test.txt');
    writeFileSync(filePath, 'test content');

    const result = executeTool('read_file', { path: filePath });
    expect(result).toBe('test content');
  });

  it('routes edit_file to editFile function', () => {
    const filePath = join(testDir, 'test.txt');
    writeFileSync(filePath, 'old content');

    const result = executeTool('edit_file', {
      path: filePath,
      old_str: 'old',
      new_str: 'new',
    });
    expect(result).toContain('Updated');
  });

  it('routes run_command to runCommand function', () => {
    const result = executeTool('run_command', { command: 'echo "test"' });
    expect(result).toContain('test');
  });

  it('routes list_files to listFiles function', () => {
    writeFileSync(join(testDir, 'file.txt'), 'content');

    const result = executeTool('list_files', { path: testDir });
    expect(result).toContain('file.txt');
  });

  it('returns error for unknown tool name', () => {
    const result = executeTool('unknown_tool', {});
    expect(result).toContain('Error');
    expect(result).toContain('unknown_tool');
  });

  it('routes search_files to searchFiles function', () => {
    writeFileSync(join(testDir, 'test.ts'), 'findme here');
    writeFileSync(join(testDir, 'other.js'), 'not this');

    const result = executeTool('search_files', {
      pattern: '*.ts',
      contentPattern: 'findme',
      path: testDir,
    });
    expect(result).toContain('test.ts');
    expect(result).toContain('findme');
  });
});
