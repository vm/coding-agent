import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';

type Props = {
  name: string;
  input?: Record<string, unknown>;
  status: 'running' | 'done' | 'error';
  result?: string;
  count?: number;
};

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatFilePath(path: string): string {
  // Highlight file paths
  if (path.includes('/') || path.includes('\\')) {
    return path;
  }
  return path;
}

export function ToolCall({ name, input, status, result, count }: Props) {
  const displayName = formatToolName(name);
  
  if (status === 'running') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box>
          <Text color="gray" dimColor>
            <Spinner type="dots" /> <Text>{displayName}</Text>
            {count && count > 1 && (
              <Text color="gray" dimColor> ({count})</Text>
            )}
          </Text>
        </Box>
        {input && Object.keys(input).length > 0 && (
          <Box paddingLeft={4} marginTop={0} flexDirection="column">
            {Object.entries(input).slice(0, 2).map(([key, value]) => {
              const val = typeof value === 'string' ? value : JSON.stringify(value);
              const displayVal = val.length > 40 ? val.substring(0, 40) + '...' : val;
              return (
                <Text key={key} color="gray" dimColor wrap="wrap">
                  {key}: {displayVal}
                </Text>
              );
            })}
            {Object.keys(input).length > 2 && (
              <Text color="gray" dimColor>...</Text>
            )}
          </Box>
        )}
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box>
          <Text color="red" dimColor>✗ </Text>
          <Text color="red">{displayName}</Text>
          {count && count > 1 && (
            <Text color="red" dimColor> ({count}×)</Text>
          )}
        </Box>
        {result && (
          <Box paddingLeft={4} marginTop={0}>
            <Text color="red" dimColor wrap="wrap">{result}</Text>
          </Box>
        )}
      </Box>
    );
  }

  // status === 'done'
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="gray" dimColor>✓ </Text>
        <Text color="gray">{displayName}</Text>
        {count && count > 1 && (
          <Text color="gray" dimColor> ({count}×)</Text>
        )}
      </Box>
        {input && Object.keys(input).length > 0 && (
          <Box paddingLeft={4} marginTop={0} flexDirection="column">
            {Object.entries(input).slice(0, 2).map(([key, value]) => {
              const val = typeof value === 'string' ? formatFilePath(value) : JSON.stringify(value);
              const displayVal = val.length > 50 ? val.substring(0, 50) + '...' : val;
              return (
                <Text key={key} wrap="wrap">
                  <Text color="cyan" dimColor>{key}</Text>: {displayVal}
                </Text>
              );
            })}
            {Object.keys(input).length > 2 && (
              <Text color="gray" dimColor>...</Text>
            )}
          </Box>
        )}
      {result && result.length > 0 && (
        <Box paddingLeft={4} marginTop={0}>
          <Text color="gray" dimColor wrap="wrap">
            {result.length > 300 ? result.substring(0, 300) + '...' : result}
          </Text>
        </Box>
      )}
    </Box>
  );
}

