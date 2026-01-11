import { Text, Box } from 'ink';

type Props = {
  role: 'user' | 'assistant';
  content: string;
};

export function Message({ role, content }: Props) {
  return (
    <Box>
      <Text color={role === 'user' ? 'blue' : 'yellow'}>
        {role === 'user' ? 'You' : 'Claude'}:
      </Text>
      <Text> {content}</Text>
    </Box>
  );
}

