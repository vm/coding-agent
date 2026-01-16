import { describe, it, expect } from 'bun:test';
import { isBuiltinCommand, executeBuiltinHelp } from '../../src/commands/builtins';
import type { Command } from '../../src/commands/types';
import type { Skill } from '../../src/skills/types';

describe('isBuiltinCommand', () => {
  it('returns true for help', () => {
    expect(isBuiltinCommand('help')).toBe(true);
  });

  it('returns false for non-builtins', () => {
    expect(isBuiltinCommand('makepr')).toBe(false);
    expect(isBuiltinCommand('commit')).toBe(false);
    expect(isBuiltinCommand('unknown')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isBuiltinCommand('')).toBe(false);
  });
});

describe('executeBuiltinHelp', () => {
  it('shows "No commands or skills available" with empty commands and skills', () => {
    const result = executeBuiltinHelp([], []);
    expect(result).toContain('No commands or skills available');
  });

  it('lists each command with name and description', () => {
    const commands: Command[] = [
      {
        name: 'makepr',
        description: 'Create a pull request',
        path: '/path/to/makepr.md',
        content: '# Make PR\n\nCreate a pull request',
      },
      {
        name: 'commit',
        description: 'Create a git commit',
        path: '/path/to/commit.md',
        content: 'Create a git commit',
      },
    ];

    const result = executeBuiltinHelp(commands, []);
    expect(result).toContain('makepr');
    expect(result).toContain('Create a pull request');
    expect(result).toContain('commit');
    expect(result).toContain('Create a git commit');
  });

  it('output format: /name — description per line', () => {
    const commands: Command[] = [
      {
        name: 'makepr',
        description: 'Create a pull request',
        path: '/path/to/makepr.md',
        content: 'Content',
      },
    ];

    const result = executeBuiltinHelp(commands, []);
    expect(result).toContain('  /makepr — Create a pull request');
  });

  it('sorts commands alphabetically', () => {
    const commands: Command[] = [
      {
        name: 'zebra',
        description: 'Zebra command',
        path: '/path/to/zebra.md',
        content: 'Content',
      },
      {
        name: 'alpha',
        description: 'Alpha command',
        path: '/path/to/alpha.md',
        content: 'Content',
      },
      {
        name: 'beta',
        description: 'Beta command',
        path: '/path/to/beta.md',
        content: 'Content',
      },
    ];

    const result = executeBuiltinHelp(commands, []);
    const lines = result.split('\n').filter(line => line.trim());
    const alphaIndex = lines.findIndex(line => line.includes('alpha'));
    const betaIndex = lines.findIndex(line => line.includes('beta'));
    const zebraIndex = lines.findIndex(line => line.includes('zebra'));

    expect(alphaIndex).toBeLessThan(betaIndex);
    expect(betaIndex).toBeLessThan(zebraIndex);
  });

  it('handles commands with empty descriptions', () => {
    const commands: Command[] = [
      {
        name: 'test',
        description: '',
        path: '/path/to/test.md',
        content: '',
      },
    ];

    const result = executeBuiltinHelp(commands, []);
    expect(result).toContain('/test');
  });

  it('lists skills with name and description', () => {
    const skills: Skill[] = [
      {
        name: 'qr_code',
        description: 'Generate a QR code',
        path: '/path/to/qr_code',
        prompt: '# QR Code\n\nGenerate a QR code.',
        scripts: [],
      },
      {
        name: 'codemod',
        description: 'Migrate code',
        path: '/path/to/codemod',
        prompt: '# Codemod\n\nMigrate code.',
        scripts: [],
      },
    ];

    const result = executeBuiltinHelp([], skills);
    expect(result).toContain('qr_code');
    expect(result).toContain('Generate a QR code');
    expect(result).toContain('codemod');
    expect(result).toContain('Migrate code');
  });

  it('output format: /name — description per line for skills', () => {
    const skills: Skill[] = [
      {
        name: 'qr_code',
        description: 'Generate a QR code',
        path: '/path/to/qr_code',
        prompt: '# QR Code',
        scripts: [],
      },
    ];

    const result = executeBuiltinHelp([], skills);
    expect(result).toContain('  /qr_code — Generate a QR code');
  });

  it('sorts skills alphabetically', () => {
    const skills: Skill[] = [
      {
        name: 'zebra',
        description: 'Zebra skill',
        path: '/path/to/zebra',
        prompt: 'Content',
        scripts: [],
      },
      {
        name: 'alpha',
        description: 'Alpha skill',
        path: '/path/to/alpha',
        prompt: 'Content',
        scripts: [],
      },
      {
        name: 'beta',
        description: 'Beta skill',
        path: '/path/to/beta',
        prompt: 'Content',
        scripts: [],
      },
    ];

    const result = executeBuiltinHelp([], skills);
    const lines = result.split('\n').filter(line => line.trim());
    const alphaIndex = lines.findIndex(line => line.includes('alpha'));
    const betaIndex = lines.findIndex(line => line.includes('beta'));
    const zebraIndex = lines.findIndex(line => line.includes('zebra'));

    expect(alphaIndex).toBeLessThan(betaIndex);
    expect(betaIndex).toBeLessThan(zebraIndex);
  });

  it('displays both commands and skills', () => {
    const commands: Command[] = [
      {
        name: 'makepr',
        description: 'Create a pull request',
        path: '/path/to/makepr.md',
        content: 'Content',
      },
    ];

    const skills: Skill[] = [
      {
        name: 'qr_code',
        description: 'Generate a QR code',
        path: '/path/to/qr_code',
        prompt: 'Content',
        scripts: [],
      },
    ];

    const result = executeBuiltinHelp(commands, skills);
    expect(result).toContain('Commands:');
    expect(result).toContain('  /makepr — Create a pull request');
    expect(result).toContain('Skills:');
    expect(result).toContain('  /qr_code — Generate a QR code');
  });

  it('includes usage instructions for commands', () => {
    const commands: Command[] = [
      {
        name: 'makepr',
        description: 'Create a pull request',
        path: '/path/to/makepr.md',
        content: 'Content',
      },
    ];

    const result = executeBuiltinHelp(commands, []);
    expect(result).toContain('Usage:');
    expect(result).toContain('  /commandname [args] — Invoke a command');
  });

  it('includes usage instructions for skills', () => {
    const skills: Skill[] = [
      {
        name: 'qr_code',
        description: 'Generate a QR code',
        path: '/path/to/qr_code',
        prompt: 'Content',
        scripts: [],
      },
    ];

    const result = executeBuiltinHelp([], skills);
    expect(result).toContain('Usage:');
    expect(result).toContain('  /skillname [args] — Invoke a skill');
  });

  it('includes both usage instructions when both commands and skills are available', () => {
    const commands: Command[] = [
      {
        name: 'makepr',
        description: 'Create a pull request',
        path: '/path/to/makepr.md',
        content: 'Content',
      },
    ];

    const skills: Skill[] = [
      {
        name: 'qr_code',
        description: 'Generate a QR code',
        path: '/path/to/qr_code',
        prompt: 'Content',
        scripts: [],
      },
    ];

    const result = executeBuiltinHelp(commands, skills);
    expect(result).toContain('Usage:');
    expect(result).toContain('  /commandname [args] — Invoke a command');
    expect(result).toContain('  /skillname [args] — Invoke a skill');
  });
});

