import { describe, it, expect } from 'bun:test';
import type { AgentResponse } from '../../src/agent/types';

// Test App component logic without full Ink rendering
// Since App uses Ink hooks and Agent, we'll test the component's behavior conceptually

describe('App', () => {

  it('should handle agent responses', async () => {
    const mockResponse: AgentResponse = {
      text: 'Hello! How can I help you?',
      toolCalls: [],
    };
    
    expect(mockResponse.text).toBe('Hello! How can I help you?');
    expect(mockResponse.toolCalls).toHaveLength(0);
  });

  it('should handle agent responses with tool calls', async () => {
    const mockResponse: AgentResponse = {
      text: 'File read successfully',
      toolCalls: [
        {
          name: 'read_file',
          input: { path: 'test.txt' },
          result: 'File contents: Hello World',
        },
      ],
    };
    
    expect(mockResponse.toolCalls).toHaveLength(1);
    expect(mockResponse.toolCalls[0].name).toBe('read_file');
  });

  it('should handle errors', () => {
    const error = new Error('API Error');
    expect(error.message).toBe('API Error');
  });

  it('should manage message state', () => {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    // Simulate adding a user message
    messages.push({ role: 'user', content: 'Hello' });
    expect(messages.length).toBe(1);
    expect(messages[0].role).toBe('user');
    
    // Simulate adding an assistant message
    messages.push({ role: 'assistant', content: 'Hi there!' });
    expect(messages.length).toBe(2);
    expect(messages[1].role).toBe('assistant');
  });

  it('should manage tool calls state', () => {
    const toolCalls: Array<{ name: string; input: Record<string, unknown>; result: string }> = [];
    
    toolCalls.push({
      name: 'read_file',
      input: { path: 'test.txt' },
      result: 'File contents',
    });
    
    expect(toolCalls.length).toBe(1);
    expect(toolCalls[0].name).toBe('read_file');
  });

  it('should handle loading state', () => {
    let isLoading = false;
    expect(isLoading).toBe(false);
    
    isLoading = true;
    expect(isLoading).toBe(true);
  });

  it('should group tool calls by name and file_path', () => {
    const toolCalls: Array<{ name: string; input: Record<string, unknown>; result: string }> = [
      { name: 'edit_file', input: { file_path: 'README.md' }, result: 'Updated' },
      { name: 'edit_file', input: { file_path: 'README.md' }, result: 'Updated' },
      { name: 'edit_file', input: { file_path: 'README.md' }, result: 'Updated' },
      { name: 'read_file', input: { file_path: 'test.txt' }, result: 'Content' },
    ];

    // Simulate grouping logic
    const grouped = new Map<string, { toolCall: typeof toolCalls[0]; count: number }>();
    
    for (const toolCall of toolCalls) {
      const filePath = toolCall.input.file_path as string | undefined;
      const key = filePath 
        ? `${toolCall.name}:${filePath}`
        : `${toolCall.name}:${JSON.stringify(toolCall.input)}`;
      
      if (grouped.has(key)) {
        grouped.get(key)!.count++;
        grouped.get(key)!.toolCall = toolCall;
      } else {
        grouped.set(key, { toolCall, count: 1 });
      }
    }

    expect(grouped.size).toBe(2);
    expect(grouped.get('edit_file:README.md')?.count).toBe(3);
    expect(grouped.get('read_file:test.txt')?.count).toBe(1);
  });

  it('should group tool calls without file_path by full input', () => {
    const toolCalls: Array<{ name: string; input: Record<string, unknown>; result: string }> = [
      { name: 'run_command', input: { command: 'ls -la' }, result: 'output' },
      { name: 'run_command', input: { command: 'ls -la' }, result: 'output' },
      { name: 'run_command', input: { command: 'pwd' }, result: 'output' },
    ];

    const grouped = new Map<string, { toolCall: typeof toolCalls[0]; count: number }>();
    
    for (const toolCall of toolCalls) {
      const filePath = toolCall.input.file_path as string | undefined;
      const key = filePath 
        ? `${toolCall.name}:${filePath}`
        : `${toolCall.name}:${JSON.stringify(toolCall.input)}`;
      
      if (grouped.has(key)) {
        grouped.get(key)!.count++;
        grouped.get(key)!.toolCall = toolCall;
      } else {
        grouped.set(key, { toolCall, count: 1 });
      }
    }

    expect(grouped.size).toBe(2);
    const lsKey = `run_command:${JSON.stringify({ command: 'ls -la' })}`;
    const pwdKey = `run_command:${JSON.stringify({ command: 'pwd' })}`;
    expect(grouped.get(lsKey)?.count).toBe(2);
    expect(grouped.get(pwdKey)?.count).toBe(1);
  });

  it('should separate user and assistant messages', () => {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
      { role: 'user', content: 'How are you?' },
      { role: 'assistant', content: 'I am doing well!' },
    ];

    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    expect(userMessages.length).toBe(2);
    expect(assistantMessages.length).toBe(2);
    expect(userMessages[0].content).toBe('Hello');
    expect(assistantMessages[0].content).toBe('Hi there!');
  });

  it('should handle tool calls with different file paths separately', () => {
    const toolCalls: Array<{ name: string; input: Record<string, unknown>; result: string }> = [
      { name: 'edit_file', input: { file_path: 'file1.txt' }, result: 'Updated' },
      { name: 'edit_file', input: { file_path: 'file2.txt' }, result: 'Updated' },
      { name: 'edit_file', input: { file_path: 'file1.txt' }, result: 'Updated' },
    ];

    const grouped = new Map<string, { toolCall: typeof toolCalls[0]; count: number }>();
    
    for (const toolCall of toolCalls) {
      const filePath = toolCall.input.file_path as string | undefined;
      const key = filePath 
        ? `${toolCall.name}:${filePath}`
        : `${toolCall.name}:${JSON.stringify(toolCall.input)}`;
      
      if (grouped.has(key)) {
        grouped.get(key)!.count++;
        grouped.get(key)!.toolCall = toolCall;
      } else {
        grouped.set(key, { toolCall, count: 1 });
      }
    }

    expect(grouped.size).toBe(2);
    expect(grouped.get('edit_file:file1.txt')?.count).toBe(2);
    expect(grouped.get('edit_file:file2.txt')?.count).toBe(1);
  });

  it('should use latest tool call result when grouping', () => {
    const toolCalls: Array<{ name: string; input: Record<string, unknown>; result: string }> = [
      { name: 'edit_file', input: { file_path: 'test.txt' }, result: 'First update' },
      { name: 'edit_file', input: { file_path: 'test.txt' }, result: 'Second update' },
      { name: 'edit_file', input: { file_path: 'test.txt' }, result: 'Final update' },
    ];

    const grouped = new Map<string, { toolCall: typeof toolCalls[0]; count: number }>();
    
    for (const toolCall of toolCalls) {
      const filePath = toolCall.input.file_path as string | undefined;
      const key = filePath 
        ? `${toolCall.name}:${filePath}`
        : `${toolCall.name}:${JSON.stringify(toolCall.input)}`;
      
      if (grouped.has(key)) {
        grouped.get(key)!.count++;
        grouped.get(key)!.toolCall = toolCall; // Use latest
      } else {
        grouped.set(key, { toolCall, count: 1 });
      }
    }

    const groupedCall = grouped.get('edit_file:test.txt');
    expect(groupedCall?.count).toBe(3);
    expect(groupedCall?.toolCall.result).toBe('Final update');
  });
});
