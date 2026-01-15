import type { Command } from '../commands/types';
import type { Skill } from '../skills/types';
import type { Registry, RegistryEntry } from './types';

export function buildRegistry(commands: Command[], skills: Skill[]): Registry {
  const commandEntries: RegistryEntry[] = commands.map(cmd => ({
    name: cmd.name,
    type: 'command' as const,
    description: cmd.description,
    path: cmd.path,
  }));

  const skillEntries: RegistryEntry[] = skills.map(skill => ({
    name: skill.name,
    type: 'skill' as const,
    description: skill.description,
    path: skill.path,
  }));

  return {
    entries: [...commandEntries, ...skillEntries],
    generatedAt: Date.now(),
  };
}

export function saveRegistry(registry: Registry, cachePath: string): void {
  throw new Error('Not implemented');
}

export function loadRegistry(cachePath: string): Registry | null {
  throw new Error('Not implemented');
}

export function isRegistryStale(registry: Registry, basePath: string): boolean {
  throw new Error('Not implemented');
}

