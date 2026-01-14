import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCommandInput, loadCommand, listCommands } from '../../src/commands/loader';

describe('Command integration', () => {
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

  it('full flow: parse input → load command → format message', () => {
    writeFileSync(join(commandsDir, 'makepr.md'), 'Create a pull request with the given changes.\n\nUse git to create a branch and PR.');

    const originalCwd = process.cwd();
    process.chdir(testDir);
    try {
      const parsed = parseCommandInput('/makepr fix auth bug');
      expect(parsed).not.toBeNull();
      expect(parsed?.command).toBe('makepr');
      expect(parsed?.args).toBe('fix auth bug');

      const content = loadCommand(parsed!.command);
      expect(content).not.toBeNull();
      expect(content).toContain('Create a pull request');

      const formatted = `${content}\n\n---\n\nUser request: ${parsed!.args}`;
      expect(formatted).toContain('Create a pull request');
      expect(formatted).toContain('fix auth bug');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('/help returns formatted list of commands', () => {
    writeFileSync(join(commandsDir, 'makepr.md'), 'Create a pull request');
    writeFileSync(join(commandsDir, 'release-notes.md'), 'Generate release notes');
    writeFileSync(join(commandsDir, 'deploy.md'), 'Deploy to production');

    const originalCwd = process.cwd();
    process.chdir(testDir);
    try {
      const parsed = parseCommandInput('/help');
      expect(parsed).not.toBeNull();
      expect(parsed?.command).toBe('help');

      const commands = listCommands();
      expect(commands).toHaveLength(3);

      const helpText = commands.map(c => `/${c.name} - ${c.description}`).join('\n');
      expect(helpText).toContain('/makepr - Create a pull request');
      expect(helpText).toContain('/release-notes - Generate release notes');
      expect(helpText).toContain('/deploy - Deploy to production');
    } finally {
      process.chdir(originalCwd);
    }
  });
});
