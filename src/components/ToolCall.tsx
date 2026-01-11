import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { ToolCallStatus, ToolName } from '../agent/types';

type Props = {
  name: string;
  input?: Record<string, unknown>;
  status: ToolCallStatus;
  result?: string;
};

function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function countLines(str: string): number {
  if (!str) return 0;
  return str.split('\n').length;
}

export function ToolCall({ name, input, status, result }: Props) {
  const safeInput = input || {};
  const filePath = safeInput.file_path ? String(safeInput.file_path) : null;
  const directory = safeInput.directory ? String(safeInput.directory) : null;
  const command = safeInput.command ? String(safeInput.command) : null;
  const oldStr = safeInput.old_str as string | undefined;
  const newStr = safeInput.new_str as string | undefined;
  
  const isEdit = name === ToolName.EDIT_FILE;
  const isRead = name === ToolName.READ_FILE;
  const isList = name === ToolName.LIST_FILES;
  const isRun = name === ToolName.RUN_COMMAND;

  // Status icon
  const getIcon = () => {
    if (status === ToolCallStatus.RUNNING) {
      return <Text color="yellow"><Spinner type="dots" /></Text>;
    }
    if (status === ToolCallStatus.ERROR) {
      return <Text color="red">✗</Text>;
    }
    return <Text color="green">✓</Text>;
  };

  // Tool name label
  const getToolLabel = () => {
    if (isRead) return 'read file';
    if (isEdit) return 'edit file';
    if (isList) return 'list files';
    if (isRun) return 'run';
    return name.replace(/_/g, ' ');
  };

  // Target info
  const getTarget = () => {
    if (filePath) return getFileName(filePath);
    if (directory) return directory === '.' ? './' : directory;
    if (command) return command.length > 40 ? command.slice(0, 40) + '…' : command;
    return null;
  };

  // Diff stats for edits
  const getDiffInfo = () => {
    if (!isEdit) return null;
    const added = countLines(newStr || '');
    const removed = countLines(oldStr || '');
    if (added === 0 && removed === 0) return null;
    return { added, removed };
  };

  const icon = getIcon();
  const toolLabel = getToolLabel();
  const target = getTarget();
  const diffInfo = getDiffInfo();

  return (
    <Box>
      {icon}
      <Text color="gray"> {toolLabel}</Text>
      {target && (
        <>
          <Text color="gray"> </Text>
          <Text color="white" bold>{target}</Text>
        </>
      )}
      {diffInfo && (
        <>
          <Text color="gray"> </Text>
          <Text color="green">+{diffInfo.added}</Text>
          <Text color="red"> -{diffInfo.removed}</Text>
        </>
      )}
      {status === ToolCallStatus.ERROR && result && (
        <>
          <Text color="gray"> · </Text>
          <Text color="red" dimColor>{result.slice(0, 60)}{result.length > 60 ? '…' : ''}</Text>
        </>
      )}
    </Box>
  );
}
