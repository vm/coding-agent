import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Agent } from '../../src/agent/agent';
import type Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic client
const mockCreate = mock(() => Promise.resolve({
  content: [{ type: 'text', text: 'Hello!' }],
  stop_reason: 'end_turn',
}));

const mockClient = {
  messages: { create: mockCreate }
} as unknown as Anthropic;

describe('Agent', () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  describe('Basic text response', () => {
    it('returns text content when no tools are called', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Hello, how can I help you?' }],
        stop_reason: 'end_turn',
      });

      const agent = new Agent(mockClient);
      const response = await agent.chat('Hello');

      expect(response.text).toBe('Hello, how can I help you?');
      expect(response.toolCalls).toHaveLength(0);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Single tool call', () => {
    it('executes tool and returns final text response', async () => {
      // First call: returns tool_use
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          id: 'tool_1',
          name: 'read_file',
          input: { path: 'test.txt' }
        }],
        stop_reason: 'tool_use',
      });

      // Second call: returns text after tool result
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'File contents: Hello World' }],
        stop_reason: 'end_turn',
      });

      const agent = new Agent(mockClient);
      const response = await agent.chat('Read test.txt');

      expect(response.text).toBe('File contents: Hello World');
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls[0].name).toBe('read_file');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Multi-tool chain', () => {
    it('executes multiple tools in sequence', async () => {
      // First call: returns read_file tool_use
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          id: 'tool_1',
          name: 'read_file',
          input: { path: 'test.txt' }
        }],
        stop_reason: 'tool_use',
      });

      // Second call: returns edit_file tool_use
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          id: 'tool_2',
          name: 'edit_file',
          input: { path: 'test.txt', old_str: 'old', new_str: 'new' }
        }],
        stop_reason: 'tool_use',
      });

      // Third call: returns final text
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'File updated successfully' }],
        stop_reason: 'end_turn',
      });

      const agent = new Agent(mockClient);
      const response = await agent.chat('Read and update test.txt');

      expect(response.text).toBe('File updated successfully');
      expect(response.toolCalls).toHaveLength(2);
      expect(response.toolCalls[0].name).toBe('read_file');
      expect(response.toolCalls[1].name).toBe('edit_file');
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
  });

  describe('Tool error handling', () => {
    it('handles tool errors gracefully and continues', async () => {
      // First call: returns tool_use
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          id: 'tool_1',
          name: 'read_file',
          input: { path: 'nonexistent.txt' }
        }],
        stop_reason: 'tool_use',
      });

      // Second call: returns text after receiving error
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'I encountered an error reading that file' }],
        stop_reason: 'end_turn',
      });

      const agent = new Agent(mockClient);
      const response = await agent.chat('Read nonexistent.txt');

      expect(response.text).toBe('I encountered an error reading that file');
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls[0].result).toContain('Error');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Conversation history', () => {
    it('maintains conversation history across multiple turns', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
      });

      const agent = new Agent(mockClient);
      
      await agent.chat('First message');
      await agent.chat('Second message');

      expect(mockCreate).toHaveBeenCalledTimes(2);
      
      // Verify second call includes both messages
      const secondCall = mockCreate.mock.calls[1];
      expect(secondCall).toBeDefined();
      const messages = secondCall[0]?.messages;
      expect(messages).toBeDefined();
      expect(messages?.length).toBeGreaterThanOrEqual(2);
    });
  });
});

