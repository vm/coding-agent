import { ToolName } from '../agent/types';

const COMMAND_TRUNCATE_LENGTH = 60;

export function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

export function formatToolCallName(name: string): string {
  switch (name) {
    case ToolName.READ_FILE:
      return 'read file';
    case ToolName.EDIT_FILE:
      return 'edit file';
    case ToolName.LIST_FILES:
      return 'list files';
    case ToolName.RUN_COMMAND:
      return 'run command';
    default:
      return name.replace(/_/g, ' ');
  }
}

export function formatToolCallTarget(
  name: string,
  input?: Record<string, unknown>
): string | null {
  const safeInput = input ?? {};
  const path = safeInput.path ? String(safeInput.path) : null;
  const command = safeInput.command ? String(safeInput.command) : null;

  if (name === ToolName.RUN_COMMAND && command) {
    return command.length > COMMAND_TRUNCATE_LENGTH
      ? command.slice(0, COMMAND_TRUNCATE_LENGTH) + '…'
      : command;
  }

  if (path) {
    if (name === ToolName.LIST_FILES) return path === '.' ? './' : path;
    return getFileName(path);
  }

  return null;
}

export function countLines(str: string): number {
  if (!str) return 0;
  return str.split('\n').length;
}

