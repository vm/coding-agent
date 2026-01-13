import { useState, useEffect } from 'react';
import { Box, Text, useApp, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { Agent } from '../agent/agent';
import { Message } from './Message';
import { ToolCall } from './ToolCall';
import { Input } from './Input';
import { MessageRole, ToolCallStatus } from '../agent/types';
import { splitForToolCalls } from './transcript';
import { cwd } from 'node:process';

type MessageItem = {
  role: MessageRole;
  content: string;
};

type ToolCallItem = {
  id: string;
  name: string;
  input: Record<string, unknown>;
  status: ToolCallStatus;
  result?: string;
  error?: boolean;
};

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallItem[]>([]);

  const [agent] = useState(() => {
    return new Agent(undefined, {
      onToolStart: (id, name, input) => {
        setToolCalls(prev => [...prev, { id, name, input, status: ToolCallStatus.RUNNING }]);
      },
      onToolComplete: (id, _name, _input, result, error) => {
        setToolCalls(prev => prev.map(tc => 
          tc.id === id 
            ? { ...tc, status: error ? ToolCallStatus.ERROR : ToolCallStatus.DONE, result, error }
            : tc
        ));
      },
    });
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminalHeight, setTerminalHeight] = useState(stdout.rows || 24);

  useEffect(() => {
    const handleExit = () => exit();
    process.on('SIGINT', handleExit);
    return () => { process.off('SIGINT', handleExit); };
  }, [exit]);

  useEffect(() => {
    const updateSize = () => setTerminalHeight(stdout.rows || 24);
    updateSize();
    stdout.on('resize', updateSize);
    return () => { stdout.off('resize', updateSize); };
  }, [stdout]);

  const handleSubmit = async (text: string) => {
    setMessages(prev => [...prev, { role: MessageRole.USER, content: text }]);
    setIsLoading(true);
    setError(null);
    setToolCalls([]);

    try {
      const response = await agent.chat(text);
      setMessages(prev => [...prev, { role: MessageRole.ASSISTANT, content: response.text }]);
      if (response.error) setError(response.error);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const workingDir = cwd();

  const banner = [
    '███╗   ██╗██╗██╗      █████╗      ██████╗ ██████╗ ██████╗ ███████╗',
    '████╗  ██║██║██║     ██╔══██╗    ██╔════╝██╔═══██╗██╔══██╗██╔════╝',
    '██╔██╗ ██║██║██║     ███████║    ██║     ██║   ██║██║  ██║█████╗  ',
    '██║╚██╗██║██║██║     ██╔══██║    ██║     ██║   ██║██║  ██║██╔══╝  ',
    '██║ ╚████║██║███████╗██║  ██║    ╚██████╗╚██████╔╝██████╔╝███████╗',
    '╚═╝  ╚═══╝╚═╝╚══════╝╚═╝  ╚═╝     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝',
  ];

  const gradientColors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#5f27cd', '#ff9ff3'];

  const { before, afterAssistant } = splitForToolCalls({
    messages,
    toolCalls,
  });

  return (
    <Box flexDirection="column" height={terminalHeight}>
      {messages.length === 0 && (
        <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
          <Box flexDirection="column">
            {banner.map((line, i) => (
              <Text key={i} color={gradientColors[i]}>{line}</Text>
            ))}
          </Box>
          
          <Box marginTop={2}>
            <Text color="gray" dimColor>{workingDir}</Text>
          </Box>
        </Box>
      )}

      <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>
        {before.map((msg, idx) => (
          <Box
            key={idx}
            marginTop={
              idx === 0
                ? 0
                : before[idx - 1]?.role === MessageRole.USER && msg.role === MessageRole.ASSISTANT
                  ? 0
                  : 1
            }
          >
            <Message role={msg.role} content={msg.content} />
          </Box>
        ))}
        
        {isLoading && toolCalls.length === 0 && (
          <Box marginTop={messages.length > 0 ? 1 : 0}>
            <Text color="yellow"><Spinner type="dots" /></Text>
            <Text color="gray"> thinking</Text>
          </Box>
        )}

        {toolCalls.length > 0 && (
          <Box
            flexDirection="column"
            marginTop={
              before.length === 0
                ? 0
                : before[before.length - 1]?.role === MessageRole.USER
                  ? 0
                  : 1
            }
          >
            {toolCalls.map(tc => (
              <ToolCall
                key={tc.id}
                name={tc.name}
                input={tc.input}
                status={tc.status}
                result={tc.result}
              />
            ))}
          </Box>
        )}

        {afterAssistant && (
          <Box marginTop={1}>
            <Message
              role={afterAssistant.role}
              content={afterAssistant.content}
            />
          </Box>
        )}
        
        {error && (
          <Box marginTop={1}>
            <Text color="red">error: {error}</Text>
          </Box>
        )}
      </Box>

      <Box paddingX={2} paddingBottom={1}>
        <Input onSubmit={handleSubmit} disabled={isLoading} />
      </Box>
    </Box>
  );
}
