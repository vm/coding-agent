import type { Command } from './types';

export function buildCommandContext(command: Command, args: string): string {
  let context = command.content;
  
  if (args) {
    context = `${context}\n\nArguments: ${args}`;
  }
  
  return context;
}

export function formatCommandMessage(command: Command, args: string, userIntent: string): string {
  const context = buildCommandContext(command, args);
  
  return `--- Command: /${command.name} ---\n\n${context}\n\n--- User Intent: ${userIntent} ---`;
}

