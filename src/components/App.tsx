import { useState, useEffect, useCallback, useRef } from 'react';
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
  tokenUsage?: { input: number; output: number };
};

type ActiveToolCall = {
  name: string;
  input: Record<string, unknown>;
  status: 'running';
};

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallType[]>([]);
  const [activeToolCalls, setActiveToolCalls] = useState<ActiveToolCall[]>([]);
  const activeToolCallsRef = useRef<ActiveToolCall[]>([]);
  
  // Update ref whenever activeToolCalls changes
  useEffect(() => {
    activeToolCallsRef.current = activeToolCalls;
  }, [activeToolCalls]);

  const [agent] = useState(() => {
    return new Agent(undefined, {
      onToolStart: (name, input) => {
        setActiveToolCalls(prev => {
          const updated = [...prev, { name, input, status: 'running' }];
          activeToolCallsRef.current = updated;
          return updated;
        });
      },
      onToolComplete: (name, result, error) => {
        setActiveToolCalls(prev => {
          const updated = prev.filter(tc => tc.name !== name);
          activeToolCallsRef.current = updated;
          return updated;
        });
        setToolCalls(prev => {
          const toolInput = activeToolCallsRef.current.find(tc => tc.name === name)?.input || {};
          return [...prev, {
            name,
            input: toolInput,
            result,
            error,
          }];
        });
      },
    });
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminalHeight, setTerminalHeight] = useState(stdout.rows || 24);
  const [totalTokens, setTotalTokens] = useState({ input: 0, output: 0 });

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
    setActiveToolCalls([]);

    try {
      const response = await agent.chat(text);
      
      // Update token usage
      if (response.tokenUsage) {
        setTotalTokens(prev => ({
          input: prev.input + response.tokenUsage!.input,
          output: prev.output + response.tokenUsage!.output,
        }));
      }
      
      // Add assistant response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.text,
        tokenUsage: response.tokenUsage,
      }]);
      
      // Clear active tool calls (they should already be cleared, but just in case)
      setActiveToolCalls([]);
      
      if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setActiveToolCalls([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = useCallback(() => {
    agent.clearHistory();
    setMessages([]);
    setToolCalls([]);
    setActiveToolCalls([]);
    setError(null);
    setTotalTokens({ input: 0, output: 0 });
  }, [agent]);

  const workingDir = cwd();

  return (
    <Box flexDirection="column" padding={0}>
      {/* Header Section */}
      {messages.length === 0 && (
        <Box flexDirection="column" paddingX={2} paddingY={1} borderBottom borderStyle="single" borderColor="gray">
          <Box marginBottom={1}>
            <Text color="white" bold>Nila Code</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="gray" dimColor wrap="wrap">{workingDir}</Text>
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Text color="gray" dimColor>Examples:</Text>
            <Text color="gray" dimColor wrap="wrap">  • Create a file called hello.txt with 'Hello World'</Text>
            <Text color="gray" dimColor wrap="wrap">  • List all files in the current directory</Text>
            <Text color="gray" dimColor wrap="wrap">  • Read the package.json file</Text>
            <Text color="gray" dimColor wrap="wrap">  • Run the command: ls -la</Text>
          </Box>
        </Box>
      )}

      {/* Token Usage Display */}
      {totalTokens.input > 0 && (
        <Box paddingX={2} paddingY={0} borderBottom borderStyle="single" borderColor="gray">
          <Text color="gray" dimColor wrap="wrap">
            Tokens: {totalTokens.input.toLocaleString()} in / {totalTokens.output.toLocaleString()} out
          </Text>
        </Box>
      )}

      {/* Messages and Tool Calls Section */}
      <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>
        {messages.map((msg, idx) => (
          <Box key={idx} flexDirection="column" marginBottom={msg.role === 'assistant' ? 2 : 1}>
            <Message role={msg.role} content={msg.content} />
            {msg.tokenUsage && (
              <Box marginTop={0} marginLeft={2}>
                <Text color="gray" dimColor wrap="wrap">
                  ({msg.tokenUsage.input} in / {msg.tokenUsage.output} out tokens)
                </Text>
              </Box>
            )}
          </Box>
        ))}
        
        {/* Active Tool Calls (running) */}
        {activeToolCalls.length > 0 && (
          <Box flexDirection="column" marginTop={messages.length > 0 ? 1 : 0} marginBottom={1}>
            {activeToolCalls.map((toolCall, idx) => (
              <Box key={idx} marginBottom={1}>
                <ToolCall
                  name={toolCall.name}
                  input={toolCall.input}
                  status="running"
                />
              </Box>
            ))}
          </Box>
        )}
        
        {/* Completed Tool Calls */}
        {toolCalls.length > 0 && (
          <Box flexDirection="column" marginTop={(messages.length > 0 || activeToolCalls.length > 0) ? 1 : 0} marginBottom={1}>
            {toolCalls.map((toolCall, idx) => (
              <Box key={idx} marginBottom={1}>
                <ToolCall
                  name={toolCall.name}
                  input={toolCall.input}
                  status={toolCall.error ? 'error' : 'done'}
                  result={toolCall.result}
                />
              </Box>
            ))}
          </Box>
        )}
        
        {isLoading && activeToolCalls.length === 0 && (
          <Box marginTop={1}>
            <Text color="gray" dimColor wrap="wrap">Thinking...</Text>
          </Box>
        )}
        {error && (
          <Box marginTop={1} flexDirection="column">
            <Text color="red" bold wrap="wrap">Error: </Text>
            <Text color="red" wrap="wrap">{error}</Text>
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

