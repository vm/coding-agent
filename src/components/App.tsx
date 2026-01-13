import { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { Agent } from '../agent/agent';
import { Input } from './Input';
import { MessageRole, ToolCallStatus } from '../agent/types';
import { splitForToolCalls } from './transcript';
import { cwd } from 'node:process';
import { expandInput } from '../commands/index';
import { TranscriptView } from './TranscriptView';

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
  const [thinkingStartTime, setThinkingStartTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terminalHeight, setTerminalHeight] = useState(stdout.rows || 24);
  const [terminalWidth, setTerminalWidth] = useState(stdout.columns || 80);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<string>>(new Set());
  const [focusedToolCallIndex, setFocusedToolCallIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleExit = () => exit();
    process.on('SIGINT', handleExit);
    return () => { process.off('SIGINT', handleExit); };
  }, [exit]);

  useEffect(() => {
    const updateSize = () => {
      setTerminalHeight(stdout.rows || 24);
      setTerminalWidth(stdout.columns || 80);
    };
    updateSize();
    stdout.on('resize', updateSize);
    return () => { stdout.off('resize', updateSize); };
  }, [stdout]);

  const handleSubmit = async (text: string) => {
    const workingDir = cwd();
    const expanded = expandInput(text, workingDir);

    setMessages(prev => [...prev, { role: MessageRole.USER, content: expanded.userText }]);
    setScrollOffset(0);
    setIsLoading(true);
    setThinkingStartTime(Date.now());
    setError(null);
    setToolCalls([]);

    if (expanded.kind === 'local') {
      setMessages(prev => [...prev, { role: MessageRole.ASSISTANT, content: expanded.outputText }]);
      if (expanded.error) {
        setError(expanded.outputText);
      }
      setIsLoading(false);
      setThinkingStartTime(null);
      return;
    }

    try {
      const response = await agent.chat(expanded.prompt);
      setMessages(prev => [...prev, { role: MessageRole.ASSISTANT, content: response.text }]);
      if (response.error) setError(response.error);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setThinkingStartTime(null);
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

  const hasBanner = messages.length === 0;
  const inputHeight = 2;
  const transcriptHeight = Math.max(1, terminalHeight - inputHeight);
  const contentWidth = Math.max(10, terminalWidth - 4);

  useInput((input, key) => {
    if (hasBanner) return;
    const page = Math.max(1, transcriptHeight - 1);

    if (key.upArrow) {
      if (key.ctrl || key.meta) {
        if (focusedToolCallIndex !== null && focusedToolCallIndex > 0) {
          setFocusedToolCallIndex(focusedToolCallIndex - 1);
        } else if (toolCalls.length > 0) {
          setFocusedToolCallIndex(toolCalls.length - 1);
        }
      } else {
        setScrollOffset(prev => prev + 1);
      }
      return;
    }

    if (key.downArrow) {
      if (key.ctrl || key.meta) {
        if (focusedToolCallIndex !== null && focusedToolCallIndex < toolCalls.length - 1) {
          setFocusedToolCallIndex(focusedToolCallIndex + 1);
        } else if (focusedToolCallIndex === null && toolCalls.length > 0) {
          setFocusedToolCallIndex(0);
        } else {
          setFocusedToolCallIndex(null);
        }
      } else {
        setScrollOffset(prev => Math.max(0, prev - 1));
      }
      return;
    }

    if (key.pageUp) {
      setScrollOffset(prev => prev + page);
      return;
    }

    if (key.pageDown) {
      setScrollOffset(prev => Math.max(0, prev - page));
      return;
    }

    if (key.return && focusedToolCallIndex !== null && toolCalls[focusedToolCallIndex]) {
      const toolCall = toolCalls[focusedToolCallIndex];
      if (toolCall && toolCall.id) {
        setExpandedToolCalls(prev => {
          const next = new Set(prev);
          if (next.has(toolCall.id)) {
            next.delete(toolCall.id);
          } else {
            next.add(toolCall.id);
          }
          return next;
        });
      }
      return;
    }

    if (key.return && toolCalls.length > 0 && focusedToolCallIndex === null) {
      const lastToolCall = toolCalls[toolCalls.length - 1];
      if (lastToolCall && lastToolCall.id) {
        setExpandedToolCalls(prev => {
          const next = new Set(prev);
          if (next.has(lastToolCall.id)) {
            next.delete(lastToolCall.id);
          } else {
            next.add(lastToolCall.id);
          }
          return next;
        });
      }
      return;
    }
  });

  return (
    <Box flexDirection="column" height={terminalHeight}>
      {hasBanner && (
        <Box flexDirection="column" alignItems="center" justifyContent="center" flexShrink={0}>
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

      {!hasBanner && (
        <Box paddingX={2} flexGrow={1} minHeight={0}>
          <TranscriptView
            messages={before}
            afterAssistant={afterAssistant}
            toolCalls={toolCalls.map(tc => ({
              id: tc.id,
              name: tc.name,
              input: tc.input,
              status: tc.status,
              result: tc.result,
            }))}
            isLoading={isLoading}
            thinkingStartTime={thinkingStartTime}
            expandedToolCalls={expandedToolCalls}
            focusedToolCallIndex={focusedToolCallIndex}
            error={error}
            width={contentWidth}
            height={transcriptHeight}
            scrollOffset={scrollOffset}
          />
        </Box>
      )}

      <Box paddingX={2} paddingBottom={1} flexShrink={0} height={inputHeight}>
        <Input onSubmit={handleSubmit} disabled={isLoading} />
      </Box>
    </Box>
  );
}
