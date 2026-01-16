import { describe, it, expect } from 'bun:test';
import { MessageRole, ToolCallStatus } from '../../src/shared/types';
import { deriveTranscript, splitForToolCalls } from '../../src/shared/transcript';

describe('splitForToolCalls', () => {
  it('returns full message list when there are no tool calls', () => {
    const messages = [
      { role: MessageRole.USER, content: 'question' },
      { role: MessageRole.ASSISTANT, content: 'answer' },
    ];

    const partition = splitForToolCalls({
      messages,
      toolCalls: [],
    });

    expect(partition.before).toEqual(messages);
    expect(partition.afterAssistant).toBeNull();
  });

  it('keeps the assistant message after tool calls when tool calls exist and the last message is assistant', () => {
    const messages = [
      { role: MessageRole.USER, content: 'question' },
      { role: MessageRole.ASSISTANT, content: 'answer' },
    ];

    const toolCalls = [
      {
        id: 'tool_1',
        name: 'list_files',
        input: { path: '.' },
        status: ToolCallStatus.DONE,
        result: 'src/',
      },
    ];

    const partition = splitForToolCalls({
      messages,
      toolCalls,
    });

    expect(partition.before).toEqual([messages[0]]);
    expect(partition.afterAssistant).toEqual(messages[1]);
  });

  it('does not move messages when tool calls exist and the last message is user', () => {
    const messages = [{ role: MessageRole.USER, content: 'question' }];

    const toolCalls = [
      {
        id: 'tool_1',
        name: 'list_files',
        input: { path: '.' },
        status: ToolCallStatus.RUNNING,
      },
    ];

    const partition = splitForToolCalls({
      messages,
      toolCalls,
    });

    expect(partition.before).toEqual(messages);
    expect(partition.afterAssistant).toBeNull();
  });
});

describe('deriveTranscript', () => {
  it('extracts user and assistant text messages', () => {
    const conversation = [
      { role: 'user' as const, content: 'question' },
      { role: 'assistant' as const, content: 'answer' },
    ];

    const result = deriveTranscript(conversation);

    expect(result.messages).toEqual([
      { role: MessageRole.USER, content: 'question' },
      { role: MessageRole.ASSISTANT, content: 'answer' },
    ]);
    expect(result.toolCalls).toEqual([]);
  });

  it('derives tool calls with results from the latest turn', () => {
    const conversation = [
      { role: 'user' as const, content: 'question' },
      {
        role: 'assistant' as const,
        content: [
          {
            id: 'tool_1',
            type: 'function',
            function: { name: 'list_files', arguments: '{"path":"."}' },
          },
        ],
      },
      { role: 'tool' as const, tool_call_id: 'tool_1', content: 'src/' },
      { role: 'assistant' as const, content: 'done' },
    ];

    const result = deriveTranscript(conversation);

    expect(result.toolCalls).toEqual([
      {
        id: 'tool_1',
        name: 'list_files',
        input: { path: '.' },
        status: ToolCallStatus.DONE,
        result: 'src/',
        error: false,
      },
    ]);
  });

  it('marks tool calls without results as running', () => {
    const conversation = [
      { role: 'user' as const, content: 'question' },
      {
        role: 'assistant' as const,
        content: [
          {
            id: 'tool_1',
            type: 'function',
            function: { name: 'list_files', arguments: '{"path":"."}' },
          },
        ],
      },
    ];

    const result = deriveTranscript(conversation);

    expect(result.toolCalls[0]?.status).toBe(ToolCallStatus.RUNNING);
  });

  it('marks error tool calls from error results', () => {
    const conversation = [
      { role: 'user' as const, content: 'question' },
      {
        role: 'assistant' as const,
        content: [
          {
            id: 'tool_1',
            type: 'function',
            function: { name: 'read_file', arguments: '{"path":"/missing"}' },
          },
        ],
      },
      {
        role: 'tool' as const,
        tool_call_id: 'tool_1',
        content: 'Error: File not found',
      },
    ];

    const result = deriveTranscript(conversation);

    expect(result.toolCalls[0]?.status).toBe(ToolCallStatus.ERROR);
    expect(result.toolCalls[0]?.error).toBe(true);
  });
});
