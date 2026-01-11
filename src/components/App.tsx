import { useState, useEffect, useRef } from 'react';
import { Box, Text, useApp, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { Agent } from '../agent/agent';
import { Message } from './Message';
import { ToolCall } from './ToolCall';
import { Input } from './Input';
import { MessageRole, ToolCallStatus, ToolName } from '../agent/types';
import type { ToolCall as ToolCallType } from '../agent/types';
import { cwd } from 'node:process';

type MessageItem = {
  role: MessageRole;
  content: string;
};

type ActiveToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
  status: ToolCallStatus.RUNNING;
};

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallType[]>([]);
  const [activeToolCalls, setActiveToolCalls] = useState<ActiveToolCall[]>([]);
  const activeToolCallsRef = useRef<ActiveToolCall[]>([]);
  
  useEffect(() => {
    activeToolCallsRef.current = activeToolCalls;
  }, [activeToolCalls]);

  const [agent] = useState(() => {
    return new Agent(undefined, {
      onToolStart: (id, name, input) => {
        setActiveToolCalls(prev => {
          const updated = [...prev, { id, name, input, status: ToolCallStatus.RUNNING }];
          activeToolCallsRef.current = updated;
          return updated;
        });
      },
      onToolComplete: (id, name, input, result, error) => {
        setActiveToolCalls(prev => {
          const updated = prev.filter(tc => tc.id !== id);
          activeToolCallsRef.current = updated;
          return updated;
        });
        setToolCalls(prev => [...prev, { name, input, result, error }]);
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
    setActiveToolCalls([]);

    try {
      const response = await agent.chat(text);
      setMessages(prev => [...prev, { role: MessageRole.ASSISTANT, content: response.text }]);
      setActiveToolCalls([]);
      if (response.error) setError(response.error);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setActiveToolCalls([]);
    } finally {
      setIsLoading(false);
    }
  };

  const workingDir = cwd();

  // Group tool calls for cleaner display
  const groupedToolCalls = () => {
    const reads = toolCalls.filter(tc => tc.name === ToolName.READ_FILE);
    const edits = toolCalls.filter(tc => tc.name === ToolName.EDIT_FILE);
    const lists = toolCalls.filter(tc => tc.name === ToolName.LIST_FILES);
    const runs = toolCalls.filter(tc => tc.name === ToolName.RUN_COMMAND);
    return { reads, edits, lists, runs };
  };

  const getFileName = (path: string) => path.split('/').pop() || path;

  const hasCurrentTurn = isLoading || toolCalls.length > 0;
  const lastAssistantIdx = hasCurrentTurn 
    ? messages.map(m => m.role).lastIndexOf(MessageRole.ASSISTANT)
    : -1;

  const { reads, edits, lists, runs } = groupedToolCalls();

  return (
    <Box flexDirection="column" height={terminalHeight}>
      {/* Start Screen */}
      {messages.length === 0 && (
        <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
          {/* Moon art */}
          <Box flexDirection="column">
            <Text color="gray" dimColor>                ·  ✦      .</Text>
            <Text color="gray" dimColor>        ✦                    ˚</Text>
            <Text>      <Text color="gray" dimColor>˚</Text>       <Text color="yellow">█████</Text><Text color="white">██</Text></Text>
            <Text>            <Text color="yellow">███████</Text><Text color="white">████</Text>   <Text color="gray" dimColor>·</Text></Text>
            <Text>    <Text color="gray" dimColor>·</Text>      <Text color="yellow">█████████</Text><Text color="white">████</Text></Text>
            <Text>          <Text color="yellow">██████████</Text><Text color="white">████</Text></Text>
            <Text>   <Text color="gray" dimColor>✦</Text>      <Text color="yellow">██████████</Text><Text color="white">████</Text>  <Text color="gray" dimColor>˚</Text></Text>
            <Text>          <Text color="yellow">██████████</Text><Text color="white">████</Text></Text>
            <Text>           <Text color="yellow">█████████</Text><Text color="white">███</Text></Text>
            <Text>     <Text color="gray" dimColor>.</Text>      <Text color="yellow">███████</Text><Text color="white">██</Text>   <Text color="gray" dimColor>✦</Text></Text>
            <Text>             <Text color="yellow">█████</Text><Text color="white">█</Text></Text>
            <Text color="gray" dimColor>        .            ·</Text>
            <Text color="gray" dimColor>              ˚    ✦</Text>
          </Box>
          
          {/* Title */}
          <Box marginTop={2}>
            <Text color="yellow" bold>𝐍𝐈𝐋𝐀</Text>
            <Text color="white" bold> 𝐂𝐎𝐃𝐄</Text>
          </Box>
          
          {/* Subtitle */}
          <Box marginTop={1}>
            <Text color="gray" dimColor>{workingDir}</Text>
          </Box>
        </Box>
      )}

      {/* Content */}
      <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>
        {/* Messages (except last assistant if we have tool calls) */}
        {messages.map((msg, idx) => {
          if (idx === lastAssistantIdx && toolCalls.length > 0) return null;
          return (
            <Box key={idx} marginTop={idx > 0 ? 1 : 0}>
              <Message role={msg.role} content={msg.content} />
            </Box>
          );
        })}
        
        {/* Loading state - thinking */}
        {isLoading && activeToolCalls.length === 0 && toolCalls.length === 0 && (
          <Box marginTop={messages.length > 0 ? 1 : 0}>
            <Text color="yellow"><Spinner type="dots" /></Text>
            <Text color="gray"> thinking</Text>
          </Box>
        )}

        {/* Active tool calls */}
        {activeToolCalls.length > 0 && (
          <Box marginTop={messages.length > 0 ? 1 : 0} flexDirection="column">
            {activeToolCalls.map(tc => (
              <ToolCall
                key={tc.id}
                name={tc.name}
                input={tc.input}
                status={ToolCallStatus.RUNNING}
              />
            ))}
          </Box>
        )}

        {/* Completed tool calls - grouped */}
        {toolCalls.length > 0 && (
          <Box flexDirection="column" marginTop={messages.length > 0 && activeToolCalls.length === 0 ? 1 : 0}>
            {/* Grouped reads */}
            {reads.length > 0 && (
              <Box>
                <Text color="green">✓</Text>
                <Text color="gray"> read </Text>
                <Text color="white">{reads.map(r => getFileName(String(r.input?.file_path || ''))).join(', ')}</Text>
              </Box>
            )}
            
            {/* Grouped lists */}
            {lists.length > 0 && (
              <Box>
                <Text color="green">✓</Text>
                <Text color="gray"> listed </Text>
                <Text color="white">{lists.length} {lists.length === 1 ? 'directory' : 'directories'}</Text>
              </Box>
            )}
            
            {/* Individual edits */}
            {edits.map((tc, idx) => (
              <ToolCall
                key={`edit-${idx}`}
                name={tc.name}
                input={tc.input}
                status={tc.error ? ToolCallStatus.ERROR : ToolCallStatus.DONE}
                result={tc.result}
              />
            ))}
            
            {/* Individual runs */}
            {runs.map((tc, idx) => (
              <ToolCall
                key={`run-${idx}`}
                name={tc.name}
                input={tc.input}
                status={tc.error ? ToolCallStatus.ERROR : ToolCallStatus.DONE}
                result={tc.result}
              />
            ))}
          </Box>
        )}
        
        {/* Last assistant message (after tool calls) */}
        {lastAssistantIdx >= 0 && toolCalls.length > 0 && (
          <Box marginTop={1}>
            <Message role={MessageRole.ASSISTANT} content={messages[lastAssistantIdx].content} />
          </Box>
        )}
        
        {/* Error */}
        {error && (
          <Box marginTop={1}>
            <Text color="red">error: {error}</Text>
          </Box>
        )}
      </Box>

      {/* Input */}
      <Box paddingX={2} paddingBottom={1}>
        <Input onSubmit={handleSubmit} disabled={isLoading} />
      </Box>
    </Box>
  );
}
