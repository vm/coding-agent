import type { Command } from './types';
import type { Skill } from '../skills/types';

export const BUILTIN_COMMANDS: string[] = ['help'];

export function isBuiltinCommand(name: string): boolean {
  return BUILTIN_COMMANDS.includes(name);
}

export function executeBuiltinHelp(commands: Command[], skills: Skill[]): string {
  const parts: string[] = [];

  if (commands.length > 0 || skills.length > 0) {
    parts.push('Usage:');
    if (commands.length > 0) {
      parts.push('  /commandname [args] — Invoke a command');
    }
    if (skills.length > 0) {
      parts.push('  /skillname [args] — Invoke a skill');
    }
    parts.push('');
  }

  if (commands.length > 0) {
    const sortedCommands = [...commands].sort((a, b) => a.name.localeCompare(b.name));
    parts.push('Commands:');
    parts.push(...sortedCommands.map(cmd => `  /${cmd.name} — ${cmd.description}`));
  }

  if (skills.length > 0) {
    if (parts.length > 0) {
      parts.push('');
    }
    const sortedSkills = [...skills].sort((a, b) => a.name.localeCompare(b.name));
    parts.push('Skills:');
    parts.push(...sortedSkills.map(skill => `  /${skill.name} — ${skill.description}`));
  }

  if (parts.length === 0) {
    return 'No commands or skills available';
  }

  return parts.join('\n');
}

