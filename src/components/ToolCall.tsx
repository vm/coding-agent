import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';

type Props = {
  name: string;
  status: 'running' | 'done' | 'error';
  result?: string;
};

export function ToolCall({ name, status, result }: Props) {
  if (status === 'running') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Executing {name}...
        </Text>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box>
        <Text color="red">✗ {name} failed</Text>
        {result && (
          <Text color="red">: {result.substring(0, 100)}</Text>
        )}
      </Box>
    );
  }

  // status === 'done'
  return (
    <Box>
      <Text color="green">✓ {name}</Text>
      {result && result.length > 0 && (
        <Text color="gray">: {result.substring(0, 80)}...</Text>
      )}
    </Box>
  );
}

