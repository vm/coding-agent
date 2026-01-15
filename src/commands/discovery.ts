import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { extractDescription } from '../utils/markdown';
import type { Command } from './types';

export { extractDescription };

export function loadCommand(filePath: string): Command {
  const content = readFileSync(filePath, 'utf-8');
  const fileName = filePath.split(/[/\\]/).pop() || '';
  const name = fileName.replace(/\.md$/, '');
  
  return {
    name,
    description: extractDescription(content),
    path: filePath,
    content,
  };
}

export function discoverCommands(basePath: string): Command[] {
  if (!existsSync(basePath)) {
    return [];
  }

  const stat = statSync(basePath);
  if (!stat.isDirectory()) {
    return [];
  }

  const entries = readdirSync(basePath);
  const commands: Command[] = [];

  for (const entry of entries) {
    if (!entry.endsWith('.md')) {
      continue;
    }

    const filePath = join(basePath, entry);
    const fileStat = statSync(filePath);
    
    if (fileStat.isFile()) {
      try {
        const command = loadCommand(filePath);
        commands.push(command);
      } catch (error) {
        continue;
      }
    }
  }

  return commands;
}

