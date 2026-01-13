import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Agent } from '../../src/agent/agent';
import type OpenAI from 'openai';

interface MockChatCompletion {
  choices: Array<{
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

interface CreateChatCompletionParams {
  model: string;
  max_tokens: number;
  messages: unknown[];
  tools?: unknown[];
}

const createMockResponse = (content: string | null, finish_reason: string, tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>): MockChatCompletion => ({
  choices: [{
    message: {
      role: 'assistant',
      content,
      tool_calls,
    },
    finish_reason,
  }],
  usage: { prompt_tokens: 10, completion_tokens: 5 },
});

const mockCreate = mock<(params: CreateChatCompletionParams) => Promise<MockChatCompletion>>(() => 
  Promise.resolve(createMockResponse('Hello!', 'stop'))
);

const mockClient = {
  chat: {
    completions: {
      create: mockCreate,
    },
  },
} as unknown as OpenAI;

describe('Agent', () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  describe('Basic text response', () => {
    it('returns text content when no tools are called', async () => {
      mockCreate.mockResolvedValueOnce(
        createMockResponse('Hello, how can I help you?', 'stop')
      );

      const agent = new Agent(mockClient, { model: 'test-model' });
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
        null,
        'tool_calls',
        [{ id: 'tool_1', type: 'function', function: { name: 'read_file', arguments: '{"path":"test.txt"}' } }]
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        'File contents: Hello World',
        'stop'
      ));

      const agent = new Agent(mockClient, { model: 'test-model' });
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
        null,
        'tool_calls',
        [{ id: 'tool_1', type: 'function', function: { name: 'read_file', arguments: '{"path":"test.txt"}' } }]
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        null,
        'tool_calls',
        [{ id: 'tool_2', type: 'function', function: { name: 'edit_file', arguments: '{"path":"test.txt","old_str":"old","new_str":"new"}' } }]
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        'File updated successfully',
        'stop'
      ));

      const agent = new Agent(mockClient, { model: 'test-model' });
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
        null,
        'tool_calls',
        [{ id: 'tool_1', type: 'function', function: { name: 'read_file', arguments: '{"path":"nonexistent.txt"}' } }]
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        'I encountered an error reading that file',
        'stop'
      ));

      const agent = new Agent(mockClient, { model: 'test-model' });
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
        'Response',
        'stop'
      ));

      const agent = new Agent(mockClient, { model: 'test-model' });
      
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
        'Response',
        'stop'
      ));

      const agent = new Agent(mockClient, { model: 'test-model' });
      
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
        null,
        'tool_calls',
        [{ id: 'tool_1', type: 'function', function: { name: 'read_file', arguments: '{"path":"test.txt"}' } }]
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        null,
        'tool_calls',
        [{ id: 'tool_2', type: 'function', function: { name: 'read_file', arguments: '{"path":"test2.txt"}' } }]
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        'Done',
        'stop'
      ));

      const agent = new Agent(mockClient, { model: 'test-model', enableParallelTools: false });
      const response = await agent.chat('Read two files');

      expect(response.text).toBe('Done');
      expect(response.toolCalls).toHaveLength(2);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('executes single tool sequentially even when parallel is enabled', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse(
        null,
        'tool_calls',
        [{ id: 'tool_1', type: 'function', function: { name: 'read_file', arguments: '{"path":"test.txt"}' } }]
      ));

      mockCreate.mockResolvedValueOnce(createMockResponse(
        'File read',
        'stop'
      ));

      const agent = new Agent(mockClient, { model: 'test-model', enableParallelTools: true });
      const response = await agent.chat('Read test.txt');

      expect(response.text).toBe('File read');
      expect(response.toolCalls).toHaveLength(1);
    });
  });

  describe('Response handling', () => {
    it('handles response with no text blocks (fallback)', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse('', 'stop'));

      const agent = new Agent(mockClient, { model: 'test-model' });
      const response = await agent.chat('Test');

      expect(response.text).toBe('');
      expect(response.toolCalls).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    it('handles API errors gracefully', async () => {
      const apiError = new Error('API Error');
      mockCreate.mockRejectedValue(apiError);

      const agent = new Agent(mockClient, { model: 'test-model', maxRetries: 1 });
      const response = await agent.chat('Test');

      expect(response.error).toBe('API Error');
      expect(response.text).toContain('An error occurred');
    });

    it('handles max_tokens stop reason', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse(
        'Partial response',
        'length'
      ));

      const agent = new Agent(mockClient, { model: 'test-model' });
      const response = await agent.chat('Test');

      expect(response.error).toBe('length');
      expect(response.text).toContain('truncated');
    });

    it('handles non-Error exceptions in API retry', async () => {
      mockCreate.mockRejectedValue('String error');

      const agent = new Agent(mockClient, { model: 'test-model', maxRetries: 1 });
      const response = await agent.chat('Test');

      expect(response.error).toBeDefined();
      expect(response.text).toContain('An error occurred');
    });
  });
});
