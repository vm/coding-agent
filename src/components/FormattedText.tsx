import { Text, Box } from 'ink';

type Props = {
  content: string;
};

/**
 * Parses and formats text content with code blocks and inline code
 * Similar to how Claude Code displays formatted content
 */
function parseInlineCode(text: string): Array<{ type: 'text' | 'inlineCode'; content: string }> {
  const parts: Array<{ type: 'text' | 'inlineCode'; content: string }> = [];
  const inlineCodeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;
  
  while ((match = inlineCodeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }
    parts.push({
      type: 'inlineCode',
      content: match[1],
    });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}

export function FormattedText({ content }: Props) {
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  
  // Parse code blocks first (```language\ncode\n```)
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    
    // Add code block
    parts.push({
      type: 'code',
      content: match[2],
      language: match[1] || 'text',
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex);
    if (textAfter.trim()) {
      parts.push({ type: 'text', content: textAfter });
    }
  }
  
  // If no parts found, treat entire content as text
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }
  
  // Render parts
  return (
    <Box flexDirection="column">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          const lines = part.content.split('\n');
          return (
            <Box key={idx} flexDirection="column" marginY={1}>
              {part.language && part.language !== 'text' && (
                <Box paddingX={1} paddingY={0}>
                  <Text color="gray" dimColor>{part.language}</Text>
                </Box>
              )}
              <Box 
                borderStyle="single" 
                borderColor="gray" 
                paddingX={1} 
                paddingY={0}
              >
                <Text color="white">
                  {lines.join('\n')}
                </Text>
              </Box>
            </Box>
          );
        }
        
        // Regular text - parse inline code
        const textParts = parseInlineCode(part.content);
        
        return (
          <Box key={idx} flexDirection="row" flexWrap="wrap">
            {textParts.map((textPart, textIdx) => {
              if (textPart.type === 'inlineCode') {
                return (
                  <Text key={textIdx} color="cyan" dimColor>
                    {`\`${textPart.content}\``}
                  </Text>
                );
              }
              return <Text key={textIdx} wrap="wrap">{textPart.content}</Text>;
            })}
          </Box>
        );
      })}
    </Box>
  );
}

