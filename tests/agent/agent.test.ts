import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Agent } from '../../src/agent/agent';
import type Anthropic from '@anthropic-ai/sdk';

type MockTextBlock = { type: 'text'; text: string };
type MockToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
type MockContentBlock = MockTextBlock | MockToolUseBlock;

interface MockApiResponse {
  content: MockContentBlock[];
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface CreateMessageParams {
  model: string;
  max_tokens: number;
  system: string;
  tools: unknown[];
  messages: unknown[];
}

const createMockResponse = (content: MockContentBlock[], stop_reason: string): MockApiResponse => ({
  content,
  stop_reason,
  usage: { input_tokens: 10, output_tokens: 5 },
});

const mockCreate = mock<(params: CreateMessageParams) => Promise<MockApiResponse>>(() => 
  Promise.resolve(createMockResponse([{ type: 'text', text: 'Hello!' }], 'end_turn'))
);

const mockClient = {
  messages: { create: mockCreate }
} as unknown as Anthropic;

describe('Agent', () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  describe('Basic text response', () => {
    it('returns text content when no tools are called', async () => {
      mockCreate.mockResolvedValueOnce(
        createMockResponse([{ type: 'text', text: 'Hello, how can I help you?' }], 'end_turn')
      );

      const agent = new Agent(mockClient);
      const response = await agent.chat('Hello');

      expect(response.text).toBe('Hello, how can I help you?');
      expect(response.toolCalls).toHaveLength(0);
      expect(response.tokenUsage).toEqual({ input: 10, output: 5 });
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Single tool call', () => {
    it('executes tool and returns final text response', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse(
        [{ type: 'tool_use', id: 'tool_1', name: 'read_file', input: { path: 'test.txt' } }],
        'tool_use'
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        [{ type: 'text', text: 'File contents: Hello World' }],
        'end_turn'
      ));

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
      mockCreate.mockResolvedValueOnce(createMockResponse(
        [{ type: 'tool_use', id: 'tool_1', name: 'read_file', input: { path: 'test.txt' } }],
        'tool_use'
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        [{ type: 'tool_use', id: 'tool_2', name: 'edit_file', input: { path: 'test.txt', old_str: 'old', new_str: 'new' } }],
        'tool_use'
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        [{ type: 'text', text: 'File updated successfully' }],
        'end_turn'
      ));

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
      mockCreate.mockResolvedValueOnce(createMockResponse(
        [{ type: 'tool_use', id: 'tool_1', name: 'read_file', input: { path: 'nonexistent.txt' } }],
        'tool_use'
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        [{ type: 'text', text: 'I encountered an error reading that file' }],
        'end_turn'
      ));

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
      mockCreate.mockResolvedValue(createMockResponse(
        [{ type: 'text', text: 'Response' }],
        'end_turn'
      ));

      const agent = new Agent(mockClient);
      
      await agent.chat('First message');
      await agent.chat('Second message');

      expect(mockCreate).toHaveBeenCalledTimes(2);
      
      const secondCall = mockCreate.mock.calls[1];
      expect(secondCall).toBeDefined();
      if (secondCall) {
        const params = secondCall[0];
        expect(params.messages).toBeDefined();
        expect(params.messages.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('can clear conversation history', async () => {
      mockCreate.mockResolvedValue(createMockResponse(
        [{ type: 'text', text: 'Response' }],
        'end_turn'
      ));

      const agent = new Agent(mockClient);
      
      await agent.chat('First message');
      expect(agent.getHistoryLength()).toBeGreaterThan(0);
      
      agent.clearHistory();
      expect(agent.getHistoryLength()).toBe(0);
      
      await agent.chat('Second message');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Sequential tool execution', () => {
    it('executes tools sequentially when parallel is disabled', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse(
        [{ type: 'tool_use', id: 'tool_1', name: 'read_file', input: { path: 'test.txt' } }],
        'tool_use'
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        [{ type: 'tool_use', id: 'tool_2', name: 'read_file', input: { path: 'test2.txt' } }],
        'tool_use'
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        [{ type: 'text', text: 'Done' }],
        'end_turn'
      ));

      const agent = new Agent(mockClient, { enableParallelTools: false });
      const response = await agent.chat('Read two files');

      expect(response.text).toBe('Done');
      expect(response.toolCalls).toHaveLength(2);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('executes single tool sequentially even when parallel is enabled', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse(
        [{ type: 'tool_use', id: 'tool_1', name: 'read_file', input: { path: 'test.txt' } }],
        'tool_use'
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        [{ type: 'text', text: 'File read' }],
        'end_turn'
      ));

      const agent = new Agent(mockClient, { enableParallelTools: true });
      const response = await agent.chat('Read test.txt');

      expect(response.text).toBe('File read');
      expect(response.toolCalls).toHaveLength(1);
    });
  });

  describe('Response handling', () => {
    it('handles response with no text blocks (fallback)', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse([], 'end_turn'));

      const agent = new Agent(mockClient);
      const response = await agent.chat('Test');

      expect(response.text).toBe('');
      expect(response.toolCalls).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    it('handles API errors gracefully', async () => {
      const apiError = new Error('API Error');
      mockCreate.mockRejectedValue(apiError);

      const agent = new Agent(mockClient, { maxRetries: 1 });
      const response = await agent.chat('Test');

      expect(response.error).toBe('API Error');
      expect(response.text).toContain('An error occurred');
    });

    it('handles max_tokens stop reason', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse(
        [{ type: 'text', text: 'Partial response' }],
        'max_tokens'
      ));

      const agent = new Agent(mockClient);
      const response = await agent.chat('Test');

      expect(response.error).toBe('max_tokens');
      expect(response.text).toContain('truncated');
    });

    it('handles non-Error exceptions in API retry', async () => {
      mockCreate.mockRejectedValue('String error');

      const agent = new Agent(mockClient, { maxRetries: 1 });
      const response = await agent.chat('Test');

      expect(response.error).toBeDefined();
      expect(response.text).toContain('An error occurred');
    });
  });
});
