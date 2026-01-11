import { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Agent } from '../agent/agent';
import { Message } from './Message';
import { ToolCall } from './ToolCall';
import { Input } from './Input';
import Spinner from 'ink-spinner';
import type { ToolCall as ToolCallType } from '../agent/types';
import { cwd, chdir } from 'node:process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

type MessageItem = {
  role: 'user' | 'assistant';
  content: string;
};

export function App() {
  const { exit } = useApp();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallType[]>([]);
  const [workingDir, setWorkingDir] = useState(() => cwd());
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
    // Handle cd command to change directory
    const cdMatch = text.trim().match(/^cd\s+(.+)$/i);
    if (cdMatch) {
      const newDir = cdMatch[1].trim();
      try {
        // Resolve path (handle ~, relative paths, etc.)
        let resolvedPath: string;
        if (newDir.startsWith('/')) {
          // Absolute path
          resolvedPath = newDir;
        } else if (newDir.startsWith('~')) {
          // Home directory
          resolvedPath = newDir.replace('~', process.env.HOME || '');
        } else {
          // Relative path - resolve from current working directory
          resolvedPath = resolve(workingDir, newDir);
        }
        
        if (!existsSync(resolvedPath)) {
          setMessages(prev => [...prev, { role: 'user', content: text }]);
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Error: Directory "${resolvedPath}" does not exist.` 
          }]);
          return;
        }

        const stats = statSync(resolvedPath);
        if (!stats.isDirectory()) {
          setMessages(prev => [...prev, { role: 'user', content: text }]);
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Error: "${resolvedPath}" is not a directory.` 
          }]);
          return;
        }

        chdir(resolvedPath);
        const newWorkingDir = cwd();
        setWorkingDir(newWorkingDir);
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Changed working directory to: ${newWorkingDir}` 
        }]);
        return;
      } catch (err) {
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Error changing directory: ${errorMessage}` 
        }]);
        return;
      }
    }

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
        <Box marginTop={1}>
          <Text color="yellow" bold>Working Directory: </Text>
          <Text color="yellow">{workingDir}</Text>
        </Box>
        <Text color="gray" marginTop={1}>
          All file operations and commands will run in this directory.
        </Text>
        <Text color="gray" marginTop={1}>
          Type your message and press Enter to send. Use "cd /path" to change directory. Press Ctrl+C to quit.
        </Text>
        {messages.length === 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="gray">Examples:</Text>
            <Text color="gray">  • "cd /path/to/project" - Change working directory</Text>
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

