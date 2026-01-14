import { describe, it, expect } from 'bun:test';
import { buildCommandContext, formatCommandMessage } from '../../src/commands/invocation';
import type { Command } from '../../src/commands/types';

describe('buildCommandContext', () => {
  it('includes command content', () => {
    const command: Command = {
      name: 'makepr',
      description: 'Create a pull request',
      path: '/path/to/makepr.md',
      content: '# Make PR\n\nCreate a pull request with the current changes.',
    };

    const result = buildCommandContext(command, '');
    expect(result).toContain('# Make PR');
    expect(result).toContain('Create a pull request with the current changes.');
  });

  it('includes args when provided', () => {
    const command: Command = {
      name: 'release-notes',
      description: 'Generate release notes',
      path: '/path/to/release-notes.md',
      content: 'Generate release notes for version {version}',
    };

    const result = buildCommandContext(command, 'v2.1.0');
    expect(result).toContain('v2.1.0');
  });

  it('works with empty args', () => {
    const command: Command = {
      name: 'makepr',
      description: 'Create a pull request',
      path: '/path/to/makepr.md',
      content: 'Create a pull request',
    };

    const result = buildCommandContext(command, '');
    expect(result).toBeTruthy();
    expect(result).toContain('Create a pull request');
  });
});

describe('formatCommandMessage', () => {
  it('wraps content in clear delimiters', () => {
    const command: Command = {
      name: 'makepr',
      description: 'Create a pull request',
      path: '/path/to/makepr.md',
      content: 'Create a pull request',
    };

    const result = formatCommandMessage(command, '', '');
    expect(result).toContain('---');
    expect(result).toContain('Create a pull request');
  });

  it('includes user\'s original input for context', () => {
    const command: Command = {
      name: 'makepr',
      description: 'Create a pull request',
      path: '/path/to/makepr.md',
      content: 'Create a pull request',
    };

    const result = formatCommandMessage(command, '', '/makepr');
    expect(result).toContain('/makepr');
  });

  it('includes args in the message', () => {
    const command: Command = {
      name: 'release-notes',
      description: 'Generate release notes',
      path: '/path/to/release-notes.md',
      content: 'Generate release notes',
    };

    const result = formatCommandMessage(command, 'v2.1.0', '/release-notes v2.1.0');
    expect(result).toContain('v2.1.0');
  });
});

