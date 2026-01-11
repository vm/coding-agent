import { Text, Box } from 'ink';
import { FormattedText } from './FormattedText';

type Props = {
  role: 'user' | 'assistant';
  content: string;
};

export function Message({ role, content }: Props) {
  const isUser = role === 'user';
  const label = isUser ? 'You' : 'Claude';
  const labelColor = isUser ? 'blue' : 'white';
  
  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box marginBottom={0}>
        <Text color={labelColor} bold wrap="wrap">
          {isUser ? 'You' : 'Claude'}
        </Text>
      </Box>
      <Box paddingLeft={2} marginTop={0} flexDirection="column">
        <FormattedText content={content} />
      </Box>
    </Box>
  );
}

