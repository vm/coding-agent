import { Text, Box } from 'ink';
import { FormattedText } from './FormattedText';
import { MessageRole } from '../agent/types';

type Props = {
  role: MessageRole;
  content: string;
};

export function Message({ role, content }: Props) {
  const isUser = role === MessageRole.USER;
  
  if (isUser) {
    return (
      <Box>
        <Text color="yellow" bold>you</Text>
        <Text color="gray"> </Text>
        <Text color="white">{content}</Text>
      </Box>
    );
  }
  
  // Assistant message - can be multiline with formatting
  return (
    <Box flexDirection="column">
      <FormattedText content={content} />
    </Box>
  );
}
