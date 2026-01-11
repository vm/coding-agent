import { Text, Box } from 'ink';
import { FormattedTextPartType } from '../agent/types';

type Props = {
  content: string;
};

type TextPart = { type: FormattedTextPartType.TEXT | FormattedTextPartType.INLINE_CODE; content: string };
type Part = { type: FormattedTextPartType; content: string; language?: string };

function parseInlineCode(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const regex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: FormattedTextPartType.TEXT, content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: FormattedTextPartType.INLINE_CODE, content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push({ type: FormattedTextPartType.TEXT, content: text.slice(lastIndex) });
  }
  
  return parts.length > 0 ? parts : [{ type: FormattedTextPartType.TEXT, content: text }];
}

export function FormattedText({ content }: Props) {
  const parts: Part[] = [];
  
  // Parse code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push({ type: FormattedTextPartType.TEXT, content: textBefore.trim() });
      }
    }
    parts.push({
      type: FormattedTextPartType.CODE,
      content: match[2],
      language: match[1] || 'text',
    });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex);
    if (textAfter.trim()) {
      parts.push({ type: FormattedTextPartType.TEXT, content: textAfter.trim() });
    }
  }
  
  if (parts.length === 0) {
    parts.push({ type: FormattedTextPartType.TEXT, content });
  }

  return (
    <Box flexDirection="column">
      {parts.map((part, idx) => {
        if (part.type === FormattedTextPartType.CODE) {
          return (
            <Box key={idx} flexDirection="column" marginY={1}>
              {part.language && part.language !== 'text' && (
                <Text color="gray" dimColor>  {part.language}</Text>
              )}
              <Box borderStyle="round" borderColor="gray" paddingX={1}>
                <Text color="white">{part.content}</Text>
              </Box>
            </Box>
          );
        }
        
        // Render text with inline code
        const textParts = parseInlineCode(part.content);
        
        return (
          <Text key={idx} wrap="wrap">
            {textParts.map((tp, i) => {
              if (tp.type === FormattedTextPartType.INLINE_CODE) {
                return <Text key={i} color="cyan">{tp.content}</Text>;
              }
              return <Text key={i} color="white">{tp.content}</Text>;
            })}
          </Text>
        );
      })}
    </Box>
  );
}
