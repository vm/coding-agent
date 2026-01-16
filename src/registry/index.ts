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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRegistryEntry(value: unknown): value is RegistryEntry {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.name === 'string'
    && (value.type === 'command' || value.type === 'skill')
    && typeof value.description === 'string'
    && typeof value.path === 'string';
}

function isRegistry(value: unknown): value is Registry {
  if (!isRecord(value)) {
    return false;
  }

  return Array.isArray(value.entries)
    && value.entries.every(isRegistryEntry)
    && typeof value.generatedAt === 'number';
}

export function loadRegistry(cachePath: string): Registry | null {
  if (!existsSync(cachePath)) {
    return null;
  }

  try {
    const content = readFileSync(cachePath, 'utf-8');
    const parsed: unknown = JSON.parse(content);
    return isRegistry(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isRegistryStale(registry: Registry): boolean {
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

