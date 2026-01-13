import { readFile } from './read-file';
import { editFile } from './edit-file';
import { runCommand } from './run-command';
import { listFiles } from './list-files';
import { ToolName } from '../shared/types';

export const tools = [
  {
    type: 'function' as const,
    function: {
      name: ToolName.READ_FILE,
      description: 'Read the contents of a file',
      parameters: {
        type: 'object' as const,
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: ToolName.EDIT_FILE,
      description: 'Edit a file by replacing a string with another string, or create a new file if old_str is empty',
      parameters: {
        type: 'object' as const,
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to edit',
          },
          old_str: {
            type: 'string',
            description: 'The string to replace. If empty, creates a new file with new_str as content',
          },
          new_str: {
            type: 'string',
            description: 'The string to replace old_str with',
          },
        },
        required: ['path', 'old_str', 'new_str'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: ToolName.RUN_COMMAND,
      description: 'Run a shell command and return its output',
      parameters: {
        type: 'object' as const,
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to run',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: ToolName.LIST_FILES,
      description: 'List files and directories in a given path',
      parameters: {
        type: 'object' as const,
        properties: {
          path: {
            type: 'string',
            description: 'Path to the directory to list',
          },
        },
        required: ['path'],
      },
    },
  },
];

export function executeTool(name: string, input: unknown): string {
  const inputObj = input as Record<string, unknown>;

  switch (name) {
    case ToolName.READ_FILE:
      return readFile(inputObj.path as string);

    case ToolName.EDIT_FILE:
      return editFile(
        inputObj.path as string,
        inputObj.old_str as string,
        inputObj.new_str as string
      );

    case ToolName.RUN_COMMAND:
      return runCommand(inputObj.command as string);

    case ToolName.LIST_FILES:
      return listFiles(inputObj.path as string);

    default:
      return `Error: Unknown tool "${name}"`;
  }
}

