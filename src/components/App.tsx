import { useCallback, useEffect, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { Agent } from '../agent/agent';
import { Input } from './Input';
import {
  MessageItem,
  MessageRole,
  ToolCallItem,
  ToolCallStatus,
} from '../shared/types';
import { splitForToolCalls } from '../shared/transcript';
import { TranscriptView } from './TranscriptView';
import { cwd } from 'node:process';
import { SessionData, SessionStore, saveSession } from '../session';

type AppProps = {
  initialSession?: SessionData | null;
  runId?: string | null;
  sessionStore?: SessionStore;
};

export function App({ initialSession, runId, sessionStore }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const initialMessages = initialSession?.messages ?? [];
  const initialToolCalls = initialSession?.toolCalls ?? [];
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [toolCalls, setToolCalls] =
    useState<ToolCallItem[]>(initialToolCalls);
  const [createdAt] = useState<number>(
    initialSession?.createdAt ?? Date.now()
  );
  const activeRunId = runId ?? initialSession?.runId ?? null;
  const store = sessionStore ?? { save: saveSession };

  const [agent] = useState(() => {
    const created = new Agent(undefined, {
      onToolStart: (id, name, input) => {
        setToolCalls((prev) => {
          const next = [
            ...prev,
            { id, name, input, status: ToolCallStatus.RUNNING },
          ];
          return next;
        });
      },
      onToolComplete: (id, _name, _input, result, error) => {
        setToolCalls((prev) =>
          prev.map((tc) => {
            if (tc.id !== id) return tc;
            return {
              ...tc,
              status: error ? ToolCallStatus.ERROR : ToolCallStatus.DONE,
              result,
              error,
            };
          })
        );
      },
    });
    if (initialSession?.conversation) {
      created.restoreConversation(initialSession.conversation);
    }
    return created;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [thinkingStartTime, setThinkingStartTime] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [terminalHeight, setTerminalHeight] = useState(stdout.rows || 24);
  const [terminalWidth, setTerminalWidth] = useState(stdout.columns || 80);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const handleExit = () => exit();
    process.on('SIGINT', handleExit);
    return () => {
      process.off('SIGINT', handleExit);
    };
  }, [exit]);

  useEffect(() => {
    const updateSize = () => {
      setTerminalHeight(stdout.rows || 24);
      setTerminalWidth(stdout.columns || 80);
    };
    updateSize();
    stdout.on('resize', updateSize);
    return () => {
      stdout.off('resize', updateSize);
    };
  }, [stdout]);

  const buildSessionData = useCallback(
    (nextMessages: MessageItem[], nextToolCalls: ToolCallItem[]): SessionData => {
      return {
        runId: activeRunId ?? '',
        createdAt,
        workingDir: cwd(),
        model: agent.getModel(),
        conversation: agent.getConversation(),
        messages: nextMessages,
        toolCalls: nextToolCalls,
      };
    },
    [activeRunId, agent, createdAt]
  );

  const persistSession = useCallback(
    (nextMessages: MessageItem[], nextToolCalls: ToolCallItem[]) => {
      if (!activeRunId) return;
      const sessionData = buildSessionData(nextMessages, nextToolCalls);
      store.save(activeRunId, sessionData);
    },
    [activeRunId, buildSessionData, store]
  );

  const handleSubmit = async (text: string) => {
    setMessages((prev) => [
      ...prev,
      { role: MessageRole.USER, content: text },
    ]);
    setScrollOffset(0);
    setIsLoading(true);
    setThinkingStartTime(Date.now());
    setError(null);
    setToolCalls([]);

    try {
      const response = await agent.chat(text);
      setMessages((prev) => [
        ...prev,
        { role: MessageRole.ASSISTANT, content: response.text },
      ]);
      if (response.error) setError(response.error);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setThinkingStartTime(null);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    persistSession(messages, toolCalls);
  }, [isLoading, messages, toolCalls, persistSession]);

  const banner = [
    '███╗   ██╗██╗██╗      █████╗      ██████╗ ██████╗ ██████╗ ███████╗',
    '████╗  ██║██║██║     ██╔══██╗    ██╔════╝██╔═══██╗██╔══██╗██╔════╝',
    '██╔██╗ ██║██║██║     ███████║    ██║     ██║   ██║██║  ██║█████╗  ',
    '██║╚██╗██║██║██║     ██╔══██║    ██║     ██║   ██║██║  ██║██╔══╝  ',
    '██║ ╚████║██║███████╗██║  ██║    ╚██████╗╚██████╔╝██████╔╝███████╗',
    '╚═╝  ╚═══╝╚═╝╚══════╝╚═╝  ╚═╝     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝',
  ];

  const gradientColors = [
    '#ff6b6b',
    '#feca57',
    '#48dbfb',
    '#1dd1a1',
    '#5f27cd',
    '#ff9ff3',
  ];

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

    if (input === 'c' && !key.ctrl && !key.meta) {
      setCollapsed((prev) => !prev);
      return;
    }

    if (key.upArrow) {
      setScrollOffset((prev) => prev + 1);
      return;
    }

    if (key.downArrow) {
      setScrollOffset((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.pageUp) {
      setScrollOffset((prev) => prev + page);
      return;
    }

    if (key.pageDown) {
      setScrollOffset((prev) => Math.max(0, prev - page));
      return;
    }
  });

  return (
    <Box flexDirection="column" height={terminalHeight}>
      {hasBanner && (
        <Box
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Box flexDirection="column">
            {banner.map((line, i) => (
              <Text key={i} color={gradientColors[i]}>
                {line}
              </Text>
            ))}
          </Box>

          <Box marginTop={2}>
            <Text color="gray" dimColor>
              {cwd()}
            </Text>
          </Box>
        </Box>
      )}

      {!hasBanner && (
        <Box paddingX={2} flexGrow={1} minHeight={0}>
          <TranscriptView
            messages={before}
            afterAssistant={afterAssistant}
            toolCalls={toolCalls.map((tc) => ({
              id: tc.id,
              name: tc.name,
              input: tc.input,
              status: tc.status,
              result: tc.result,
              error: tc.error,
            }))}
            isLoading={isLoading}
            thinkingStartTime={thinkingStartTime}
            error={error}
            width={contentWidth}
            height={transcriptHeight}
            scrollOffset={scrollOffset}
            collapsed={collapsed}
          />
        </Box>
      )}

      <Box paddingX={2} paddingBottom={1} flexShrink={0} height={inputHeight}>
        <Input onSubmit={handleSubmit} disabled={isLoading} />
      </Box>
    </Box>
  );
}
