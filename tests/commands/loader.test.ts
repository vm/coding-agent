import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCommandInput, loadCommand, listCommands } from '../../src/commands/loader';

describe('parseCommandInput', () => {
  it('extracts command name from /makepr', () => {
    const result = parseCommandInput('/makepr');
    expect(result).not.toBeNull();
    expect(result?.command).toBe('makepr');
    expect(result?.args).toBe('');
  });

  it('extracts args from /makepr fix auth bug', () => {
    const result = parseCommandInput('/makepr fix auth bug');
    expect(result).not.toBeNull();
    expect(result?.command).toBe('makepr');
    expect(result?.args).toBe('fix auth bug');
  });

  it('returns null for input without / prefix', () => {
    const result = parseCommandInput('makepr fix auth bug');
    expect(result).toBeNull();
  });

  it('returns null for / alone', () => {
    const result = parseCommandInput('/');
    expect(result).toBeNull();
  });

  it('handles command with no args', () => {
    const result = parseCommandInput('/help');
    expect(result).not.toBeNull();
    expect(result?.command).toBe('help');
    expect(result?.args).toBe('');
  });
});

describe('loadCommand', () => {
  let testDir: string;
  let commandsDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'agent-test-'));
    commandsDir = join(testDir, '.nila', 'commands');
    mkdirSync(commandsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns file content when command exists', () => {
    const commandPath = join(commandsDir, 'makepr.md');
    const content = 'Create a pull request';
    writeFileSync(commandPath, content);

    const originalCwd = process.cwd();
    process.chdir(testDir);
    try {
      const result = loadCommand('makepr');
      expect(result).toBe(content);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('returns null when command file missing', () => {
    const originalCwd = process.cwd();
    process.chdir(testDir);
    try {
      const result = loadCommand('nonexistent');
      expect(result).toBeNull();
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('handles missing .nila/commands/ directory', () => {
    rmSync(join(testDir, '.nila'), { recursive: true, force: true });
    
    const originalCwd = process.cwd();
    process.chdir(testDir);
    try {
      const result = loadCommand('makepr');
      expect(result).toBeNull();
    } finally {
      process.chdir(originalCwd);
    }
  });
});

describe('listCommands', () => {
  let testDir: string;
  let commandsDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'agent-test-'));
    commandsDir = join(testDir, '.nila', 'commands');
    mkdirSync(commandsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns all .md files in commands directory', () => {
    writeFileSync(join(commandsDir, 'makepr.md'), 'Create a pull request');
    writeFileSync(join(commandsDir, 'release-notes.md'), 'Generate release notes');
    writeFileSync(join(commandsDir, 'not-a-command.txt'), 'Not a command');

    const originalCwd = process.cwd();
    process.chdir(testDir);
    try {
      const result = listCommands();
      expect(result).toHaveLength(2);
      expect(result.map(c => c.name).sort()).toEqual(['makepr', 'release-notes']);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('extracts description from first line of each file', () => {
    writeFileSync(join(commandsDir, 'makepr.md'), 'Create a pull request\n\nMore details here');
    writeFileSync(join(commandsDir, 'release-notes.md'), 'Generate release notes');

    const originalCwd = process.cwd();
    process.chdir(testDir);
    try {
      const result = listCommands();
      expect(result).toHaveLength(2);
      const makepr = result.find(c => c.name === 'makepr');
      expect(makepr?.description).toBe('Create a pull request');
      const releaseNotes = result.find(c => c.name === 'release-notes');
      expect(releaseNotes?.description).toBe('Generate release notes');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('returns empty array when no commands exist', () => {
    const originalCwd = process.cwd();
    process.chdir(testDir);
    try {
      const result = listCommands();
      expect(result).toEqual([]);
    } finally {
      process.chdir(originalCwd);
    }
  });
});
