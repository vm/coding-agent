import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { ToolCallStatus, ToolName } from '../agent/types';
import { formatToolCallName, formatToolCallTarget, countLines } from './tool-formatting';

type Props = {
  name: string;
  input?: Record<string, unknown>;
  status: ToolCallStatus;
  result?: string;
};

export function ToolCall({ name, input, status, result }: Props) {
  const safeInput = input || {};
  const oldStr = safeInput.old_str as string | undefined;
  const newStr = safeInput.new_str as string | undefined;
  
  const isEdit = name === ToolName.EDIT_FILE;

  const getIcon = () => {
    if (status === ToolCallStatus.RUNNING) {
      return <Text color="yellow"><Spinner type="dots" /></Text>;
    }
    if (status === ToolCallStatus.ERROR) {
      return <Text color="red">✗</Text>;
    }
    return <Text color="green">✓</Text>;
  };

  const getDiffInfo = () => {
    if (!isEdit) return null;
    const added = countLines(newStr || '');
    const removed = countLines(oldStr || '');
    if (added === 0 && removed === 0) return null;
    return { added, removed };
  };

  const icon = getIcon();
  const toolLabel = formatToolCallName(name);
  const target = formatToolCallTarget(name, input);
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
