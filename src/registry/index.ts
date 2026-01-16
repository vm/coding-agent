import { writeFileSync, mkdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
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
  const dir = dirname(cachePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  const json = JSON.stringify(registry, null, 2);
  writeFileSync(cachePath, json, 'utf-8');
}

export function loadRegistry(cachePath: string): Registry | null {
  if (!existsSync(cachePath)) {
    return null;
  }

  try {
    const content = readFileSync(cachePath, 'utf-8');
    return JSON.parse(content) as Registry;
  } catch {
    return null;
  }
}

export function isRegistryStale(registry: Registry, basePath: string): boolean {
  for (const entry of registry.entries) {
    if (!existsSync(entry.path)) {
      return true;
    }

    try {
      const stat = statSync(entry.path);
      if (stat.mtimeMs > registry.generatedAt) {
        return true;
      }
    } catch {
      return true;
    }
  }

  return false;
}

