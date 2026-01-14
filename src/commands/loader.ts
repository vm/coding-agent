import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { parseCommandLine } from './parser';
import { CommandEntry, ParsedCommand } from './types';

export function parseCommandInput(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }

  const withoutSlash = trimmed.slice(1).trim();
  if (withoutSlash.length === 0) {
    return null;
  }

  const invocation = parseCommandLine(`/${withoutSlash}`);
  if (!invocation.name) {
    return null;
  }

  return {
    command: invocation.name,
    args: invocation.args,
  };
}

export function loadCommand(name: string): string | null {
  const commandsDir = join(cwd(), '.nila', 'commands');
  
  if (!existsSync(commandsDir)) {
    return null;
  }

  const commandPath = join(commandsDir, `${name}.md`);
  
  if (!existsSync(commandPath)) {
    return null;
  }

  try {
    return readFileSync(commandPath, 'utf-8');
  } catch {
    return null;
  }
}

export function listCommands(): CommandEntry[] {
  const commandsDir = join(cwd(), '.nila', 'commands');
  
  if (!existsSync(commandsDir)) {
    return [];
  }

  try {
    const entries = readdirSync(commandsDir);
    const commands: CommandEntry[] = [];

    for (const entry of entries) {
      if (!entry.endsWith('.md')) {
        continue;
      }

      const filePath = join(commandsDir, entry);
      const stats = statSync(filePath);
      
      if (!stats.isFile()) {
        continue;
      }

      const name = entry.slice(0, -3);
      let description = '';

      try {
        const content = readFileSync(filePath, 'utf-8');
        const firstLine = content.split('\n').find(line => line.trim().length > 0);
        description = firstLine?.trim() || '';
      } catch {
        description = '';
      }

      commands.push({
        name,
        description,
        path: filePath,
      });
    }

    return commands.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
