import { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Agent } from '../agent/agent';
import { Message } from './Message';
import { ToolCall } from './ToolCall';
import { Input } from './Input';
import Spinner from 'ink-spinner';
import type { ToolCall as ToolCallType } from '../agent/types';

type MessageItem = {
  role: 'user' | 'assistant';
  content: string;
};

export function App() {
  const { exit } = useApp();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallType[]>([]);
  const [agent] = useState(() => new Agent());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle Ctrl+C gracefully
  useEffect(() => {
    const handleExit = () => {
      exit();
    };
    process.on('SIGINT', handleExit);
    return () => {
      process.off('SIGINT', handleExit);
    };
  }, [exit]);

  const handleSubmit = async (text: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);
    setError(null);
    setToolCalls([]);

    try {
      const response = await agent.chat(text);
      
      // Add assistant response
      setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
      setToolCalls(response.toolCalls);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>Coding Agent - Claude Assistant</Text>
        <Text color="gray">Type your message and press Enter to send. Press Ctrl+C to quit.</Text>
        {messages.length === 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="gray">Examples:</Text>
            <Text color="gray">  • "Create a file called hello.txt with 'Hello World'"</Text>
            <Text color="gray">  • "List all files in the current directory"</Text>
            <Text color="gray">  • "Read the package.json file"</Text>
            <Text color="gray">  • "Run the command: ls -la"</Text>
          </Box>
        )}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {messages.map((msg, idx) => (
          <Message key={idx} role={msg.role} content={msg.content} />
        ))}
        {toolCalls.map((toolCall, idx) => (
          <ToolCall
            key={idx}
            name={toolCall.name}
            status="done"
            result={toolCall.result}
          />
        ))}
        {isLoading && (
          <Text>
            <Spinner type="dots" /> Thinking...
          </Text>
        )}
        {error && (
          <Text color="red">Error: {error}</Text>
        )}
        <Box marginTop={1}>
          <Input onSubmit={handleSubmit} disabled={isLoading} />
        </Box>
      </Box>
    </Box>
  );
}

