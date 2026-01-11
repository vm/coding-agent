import { useState, useEffect } from 'react';
import { Box, Text, useApp, useStdout } from 'ink';
import { Agent } from '../agent/agent';
import { Message } from './Message';
import { ToolCall } from './ToolCall';
import { Input } from './Input';
import type { ToolCall as ToolCallType } from '../agent/types';
import { cwd } from 'node:process';

type MessageItem = {
  role: 'user' | 'assistant';
  content: string;
};

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallType[]>([]);
  const [agent] = useState(() => new Agent());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminalHeight, setTerminalHeight] = useState(stdout.rows || 24);

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

  // Update terminal height on resize
  useEffect(() => {
    const updateSize = () => {
      setTerminalHeight(stdout.rows || 24);
    };
    
    updateSize();
    stdout.on('resize', updateSize);
    
    return () => {
      stdout.off('resize', updateSize);
    };
  }, [stdout]);

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

  const workingDir = cwd();

  return (
    <Box flexDirection="column" height={terminalHeight} padding={0}>
      {/* Header Section */}
      {messages.length === 0 && (
        <Box flexDirection="column" paddingX={2} paddingY={1} borderBottom borderStyle="single" borderColor="gray">
          <Box marginBottom={1}>
            <Text color="white" bold>Claude Code</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="gray" dimColor>{workingDir}</Text>
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Text color="gray" dimColor>Examples:</Text>
            <Text color="gray" dimColor>  • Create a file called hello.txt with 'Hello World'</Text>
            <Text color="gray" dimColor>  • List all files in the current directory</Text>
            <Text color="gray" dimColor>  • Read the package.json file</Text>
            <Text color="gray" dimColor>  • Run the command: ls -la</Text>
          </Box>
        </Box>
      )}

      {/* Messages and Tool Calls Section */}
      <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>
        {messages.map((msg, idx) => (
          <Box key={idx} marginBottom={msg.role === 'assistant' ? 2 : 1}>
            <Message role={msg.role} content={msg.content} />
          </Box>
        ))}
        {toolCalls.length > 0 && (
          <Box flexDirection="column" marginTop={1} marginBottom={1}>
            {toolCalls.map((toolCall, idx) => (
              <Box key={idx} marginBottom={1}>
                <ToolCall
                  name={toolCall.name}
                  input={toolCall.input}
                  status="done"
                  result={toolCall.result}
                />
              </Box>
            ))}
          </Box>
        )}
        {isLoading && (
          <Box marginTop={1}>
            <Text color="gray" dimColor>Thinking...</Text>
          </Box>
        )}
        {error && (
          <Box marginTop={1}>
            <Text color="red" bold>Error: </Text>
            <Text color="red">{error}</Text>
          </Box>
        )}
      </Box>

      {/* Input Section */}
      <Box borderTop borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
        <Input onSubmit={handleSubmit} disabled={isLoading} />
      </Box>
    </Box>
  );
}

