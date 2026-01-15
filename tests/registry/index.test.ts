import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Command } from '../../src/commands/types';
import type { Skill } from '../../src/skills/types';
import type { Registry, RegistryEntry } from '../../src/registry/types';
import { buildRegistry, saveRegistry, loadRegistry, isRegistryStale } from '../../src/registry/index';

describe('buildRegistry', () => {
  it('combines commands and skills', () => {
    const commands: Command[] = [
      {
        name: 'makepr',
        description: 'Make PR',
        path: '/path/to/makepr.md',
        content: 'Content',
      },
    ];
    const skills: Skill[] = [
      {
        name: 'qr_code',
        description: 'QR Code',
        path: '/path/to/qr_code',
        prompt: 'Prompt',
        scripts: [],
      },
    ];

    const result = buildRegistry(commands, skills);
    expect(result.entries).toHaveLength(2);
    expect(result.entries.map(e => e.name).sort()).toEqual(['makepr', 'qr_code']);
  });

  it('sets correct type field', () => {
    const commands: Command[] = [
      {
        name: 'makepr',
        description: 'Make PR',
        path: '/path/to/makepr.md',
        content: 'Content',
      },
    ];
    const skills: Skill[] = [
      {
        name: 'qr_code',
        description: 'QR Code',
        path: '/path/to/qr_code',
        prompt: 'Prompt',
        scripts: [],
      },
    ];

    const result = buildRegistry(commands, skills);
    const commandEntry = result.entries.find(e => e.name === 'makepr');
    const skillEntry = result.entries.find(e => e.name === 'qr_code');
    
    expect(commandEntry?.type).toBe('command');
    expect(skillEntry?.type).toBe('skill');
  });

  it('includes generatedAt timestamp', () => {
    const commands: Command[] = [];
    const skills: Skill[] = [];
    const beforeTime = Date.now();

    const result = buildRegistry(commands, skills);
    const afterTime = Date.now();

    expect(result.generatedAt).toBeGreaterThanOrEqual(beforeTime);
    expect(result.generatedAt).toBeLessThanOrEqual(afterTime);
  });

  it('preserves all fields from commands and skills', () => {
    const commands: Command[] = [
      {
        name: 'makepr',
        description: 'Make PR',
        path: '/path/to/makepr.md',
        content: 'Content',
      },
    ];
    const skills: Skill[] = [
      {
        name: 'qr_code',
        description: 'QR Code',
        path: '/path/to/qr_code',
        prompt: 'Prompt',
        scripts: [],
      },
    ];

    const result = buildRegistry(commands, skills);
    const commandEntry = result.entries.find(e => e.name === 'makepr');
    const skillEntry = result.entries.find(e => e.name === 'qr_code');

    expect(commandEntry).toEqual({
      name: 'makepr',
      type: 'command',
      description: 'Make PR',
      path: '/path/to/makepr.md',
    });
    expect(skillEntry).toEqual({
      name: 'qr_code',
      type: 'skill',
      description: 'QR Code',
      path: '/path/to/qr_code',
    });
  });
});

describe('saveRegistry', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('writes valid JSON', () => {
    const cachePath = join(testDir, 'registry.json');
    const registry: Registry = {
      entries: [
        {
          name: 'makepr',
          type: 'command',
          description: 'Make PR',
          path: '/path/to/makepr.md',
        },
      ],
      generatedAt: 1234567890,
    };

    saveRegistry(registry, cachePath);

    const content = Bun.file(cachePath);
    expect(content).toBeTruthy();
  });

  it('creates directory if it does not exist', () => {
    const cachePath = join(testDir, 'nested', 'dir', 'registry.json');
    const registry: Registry = {
      entries: [],
      generatedAt: 1234567890,
    };

    saveRegistry(registry, cachePath);

    const content = Bun.file(cachePath);
    expect(content).toBeTruthy();
  });
});

describe('loadRegistry', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns null for missing file', () => {
    const cachePath = join(testDir, 'nonexistent.json');
    const result = loadRegistry(cachePath);
    expect(result).toBeNull();
  });

  it('parses saved registry correctly', () => {
    const cachePath = join(testDir, 'registry.json');
    const registry: Registry = {
      entries: [
        {
          name: 'makepr',
          type: 'command',
          description: 'Make PR',
          path: '/path/to/makepr.md',
        },
        {
          name: 'qr_code',
          type: 'skill',
          description: 'QR Code',
          path: '/path/to/qr_code',
        },
      ],
      generatedAt: 1234567890,
    };

    saveRegistry(registry, cachePath);
    const loaded = loadRegistry(cachePath);

    expect(loaded).toEqual(registry);
  });
});

describe('isRegistryStale', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns true when files modified after generatedAt', async () => {
    const basePath = join(testDir, '.nila');
    const commandsDir = join(basePath, 'commands');
    mkdirSync(commandsDir, { recursive: true });
    
    const filePath = join(commandsDir, 'test.md');
    writeFileSync(filePath, '# Test');

    const fileStat = statSync(filePath);
    const registry: Registry = {
      entries: [
        {
          name: 'test',
          type: 'command',
          description: 'Test',
          path: filePath,
        },
      ],
      generatedAt: fileStat.mtimeMs - 1000,
    };

    await new Promise(resolve => setTimeout(resolve, 100));
    writeFileSync(filePath, '# Test Updated');

    const result = isRegistryStale(registry, basePath);
    expect(result).toBe(true);
  });

  it('returns false when cache is fresh', () => {
    const basePath = join(testDir, '.nila');
    const commandsDir = join(basePath, 'commands');
    mkdirSync(commandsDir, { recursive: true });
    
    const filePath = join(commandsDir, 'test.md');
    writeFileSync(filePath, '# Test');

    const fileStat = statSync(filePath);
    const registry: Registry = {
      entries: [
        {
          name: 'test',
          type: 'command',
          description: 'Test',
          path: filePath,
        },
      ],
      generatedAt: fileStat.mtimeMs + 1000,
    };

    const result = isRegistryStale(registry, basePath);
    expect(result).toBe(false);
  });

  it('returns true when file does not exist', () => {
    const basePath = join(testDir, '.nila');
    const registry: Registry = {
      entries: [
        {
          name: 'test',
          type: 'command',
          description: 'Test',
          path: join(basePath, 'commands', 'nonexistent.md'),
        },
      ],
      generatedAt: Date.now(),
    };

    const result = isRegistryStale(registry, basePath);
    expect(result).toBe(true);
  });

  it('handles multiple entries correctly', async () => {
    const basePath = join(testDir, '.nila');
    const commandsDir = join(basePath, 'commands');
    const skillsDir = join(basePath, 'skills', 'qr_code');
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(skillsDir, { recursive: true });
    
    const commandPath = join(commandsDir, 'test.md');
    const skillPath = join(skillsDir, 'skill.md');
    writeFileSync(commandPath, '# Test');
    writeFileSync(skillPath, '# Skill');

    const commandStat = statSync(commandPath);
    const skillStat = statSync(skillPath);
    const registry: Registry = {
      entries: [
        {
          name: 'test',
          type: 'command',
          description: 'Test',
          path: commandPath,
        },
        {
          name: 'qr_code',
          type: 'skill',
          description: 'QR Code',
          path: skillPath,
        },
      ],
      generatedAt: Math.max(commandStat.mtimeMs, skillStat.mtimeMs) - 1000,
    };

    await new Promise(resolve => setTimeout(resolve, 100));
    writeFileSync(commandPath, '# Test Updated');

    const result = isRegistryStale(registry, basePath);
    expect(result).toBe(true);
  });
});

