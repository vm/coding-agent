import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';

type Props = {
  name: string;
  input?: Record<string, unknown>;
  status: 'running' | 'done' | 'error';
  result?: string;
  showPreview?: boolean;
};

function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function countLines(str: string): number {
  if (!str) return 0;
  return str.split('\n').length;
}

function getDiffStats(input: Record<string, unknown>): { added: number; removed: number } | null {
  const oldStr = input.old_str as string | undefined;
  const newStr = input.new_str as string | undefined;
  
  if (oldStr === undefined && newStr === undefined) return null;
  
  const removed = countLines(oldStr || '');
  const added = countLines(newStr || '');
  
  // Don't show 0/0
  if (removed === 0 && added === 0) return null;
  
  return { added, removed };
}

const MAX_PREVIEW_LINES = 6;

function DiffPreview({ oldStr, newStr }: { oldStr: string; newStr: string }) {
  const oldLines = oldStr ? oldStr.split('\n') : [];
  const newLines = newStr ? newStr.split('\n') : [];
  
  // Build a simple diff view
  const diffLines: Array<{ type: 'remove' | 'add' | 'context'; content: string }> = [];
  
  // Show removed lines
  for (const line of oldLines) {
    diffLines.push({ type: 'remove', content: line });
  }
  
  // Show added lines
  for (const line of newLines) {
    diffLines.push({ type: 'add', content: line });
  }
  
  // Limit to MAX_PREVIEW_LINES
  const truncated = diffLines.length > MAX_PREVIEW_LINES;
  const displayLines = diffLines.slice(0, MAX_PREVIEW_LINES);
  
  if (displayLines.length === 0) return null;
  
  return (
    <Box flexDirection="column" marginLeft={2} marginTop={0}>
      <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        {displayLines.map((line, idx) => (
          <Box key={idx}>
            <Text color={line.type === 'remove' ? 'red' : line.type === 'add' ? 'green' : 'gray'}>
              {line.type === 'remove' ? '- ' : line.type === 'add' ? '+ ' : '  '}
            </Text>
            <Text 
              color={line.type === 'remove' ? 'red' : line.type === 'add' ? 'green' : 'white'} 
              dimColor={line.type === 'remove'}
            >
              {line.content.slice(0, 60)}{line.content.length > 60 ? '…' : ''}
            </Text>
          </Box>
        ))}
        {truncated && (
          <Text color="gray" dimColor>  … {diffLines.length - MAX_PREVIEW_LINES} more lines</Text>
        )}
      </Box>
    </Box>
  );
}

export function ToolCall({ name, input, status, result, showPreview = true }: Props) {
  const safeInput = input || {};
  const filePath = safeInput.file_path ? String(safeInput.file_path) : null;
  const directory = safeInput.directory ? String(safeInput.directory) : null;
  const command = safeInput.command ? String(safeInput.command) : null;
  
  // Determine what to display based on tool type
  const isEdit = name === 'edit_file';
  const isRead = name === 'read_file';
  const isList = name === 'list_files';
  const isRun = name === 'run_command';
  
  // Get diff stats for edits
  const diffStats = isEdit ? getDiffStats(safeInput) : null;
  
  // Get old/new strings for preview
  const oldStr = safeInput.old_str as string | undefined;
  const newStr = safeInput.new_str as string | undefined;
  const hasEditContent = isEdit && (oldStr || newStr);
  
  // Choose icon based on tool type
  const getIcon = () => {
    if (status === 'running') {
      return <Text color="yellow"><Spinner type="dots" /></Text>;
    }
    if (status === 'error') {
      return <Text color="red">✗</Text>;
    }
    // done
    if (isEdit) return <Text color="cyan">⚙</Text>;
    if (isRead) return <Text color="green">✓</Text>;
    if (isList) return <Text color="green">✓</Text>;
    if (isRun) return <Text color="green">▶</Text>;
    return <Text color="green">✓</Text>;
  };
  
  // Get the main label
  const getLabel = () => {
    if (isEdit && filePath) return getFileName(filePath);
    if (isRead && filePath) return getFileName(filePath);
    if (isList) return directory === '.' ? './' : (directory ? directory + '/' : './');
    if (isRun && command) {
      return command.length > 50 ? command.slice(0, 50) + '…' : command;
    }
    return name.replace(/_/g, ' ');
  };
  
  const icon = getIcon();
  const label = getLabel();
  
  if (status === 'error') {
    return (
      <Box flexDirection="column">
        <Box>
          {icon}
          <Text> </Text>
          <Text color="white">{label}</Text>
        </Box>
        {result && (
          <Box paddingLeft={2}>
            <Text color="red" dimColor wrap="wrap">{result.slice(0, 200)}</Text>
          </Box>
        )}
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column">
      <Box>
        {icon}
        <Text> </Text>
        <Text color="white">{label}</Text>
        {diffStats && (
          <>
            <Text> </Text>
            <Text color="green">+{diffStats.added}</Text>
            <Text> </Text>
            <Text color="red">-{diffStats.removed}</Text>
          </>
        )}
      </Box>
      {showPreview && hasEditContent && status === 'done' && (
        <DiffPreview oldStr={oldStr || ''} newStr={newStr || ''} />
      )}
    </Box>
  );
}
