import { useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { Agent } from '../agent/agent';
import { Input } from './Input';
import { splitForToolCalls, deriveTranscript } from '../shared/transcript';
import { TranscriptView } from './TranscriptView';
import { useTheme } from './ThemeProvider';
import { cwd } from 'node:process';
import {
  useSessionStore,
  getDefaultStore,
  type SessionStore,
} from '../stores/session';
import type { AgentOptions, AgentResponse, Message } from '../agent/types';

export type AppAgent = {
  getModel: () => string;
  getConversation: () => Message[];
  restoreConversation: (messages: Message[]) => void;
  chat: (userMessage: string) => Promise<AgentResponse>;
};

export type AppAgentFactory = (options: AgentOptions) => AppAgent;

type AppProps = {
  store?: SessionStore;
  agentFactory?: AppAgentFactory;
};

export function App({ store: injectedStore, agentFactory }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { theme, themeName, setTheme } = useTheme();
  const store = injectedStore ?? getDefaultStore();
  const conversation = useSessionStore((s) => s.conversation, store);
  const { messages, toolCalls } = useMemo(
    () => deriveTranscript(conversation),
    [conversation]
  );

  const [agent] = useState(() => {
    const factory = agentFactory ?? ((options: AgentOptions) => new Agent(undefined, options));
    const created = factory({
      onToolStart: () => {
        store.getState().setConversation(created.getConversation());
      },
      onToolComplete: () => {
        store.getState().setConversation(created.getConversation());
      },
    });
    if (conversation.length > 0) {
      created.restoreConversation(conversation);
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

  useEffect(() => {
    store.getState().setModel(agent.getModel());
  }, [agent, store]);

  const handleSubmit = async (text: string) => {
    store.getState().addConversationMessage({ role: 'user', content: text });
    setScrollOffset(0);
    setIsLoading(true);
    setThinkingStartTime(Date.now());
    setError(null);

    try {
      const responsePromise = agent.chat(text);
      store.getState().setConversation(agent.getConversation());
      const response = await responsePromise;
      store.getState().setConversation(agent.getConversation());
      if (response.error) setError(response.error);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setThinkingStartTime(null);
    }
  };

  const banner = [
    '███╗   ██╗██╗██╗      █████╗      ██████╗ ██████╗ ██████╗ ███████╗',
    '████╗  ██║██║██║     ██╔══██╗    ██╔════╝██╔═══██╗██╔══██╗██╔════╝',
    '██╔██╗ ██║██║██║     ███████║    ██║     ██║   ██║██║  ██║█████╗  ',
    '██║╚██╗██║██║██║     ██╔══██║    ██║     ██║   ██║██║  ██║██╔══╝  ',
    '██║ ╚████║██║███████╗██║  ██║    ╚██████╗╚██████╔╝██████╔╝███████╗',
    '╚═╝  ╚═══╝╚═╝╚══════╝╚═╝  ╚═╝     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝',
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
    if (key.ctrl && input === 't') {
      setTheme(themeName === 'dark' ? 'light' : 'dark');
      return;
    }

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
              <Text key={i} color={theme.banner[i]}>
                {line}
              </Text>
            ))}
          </Box>

          <Box marginTop={2}>
            <Text color={theme.text.secondary} dimColor>
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
              name: tc.name,
              input: tc.input,
              status: tc.status,
              result: tc.result,
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
