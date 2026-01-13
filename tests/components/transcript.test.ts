import { describe, it, expect } from 'bun:test';
import { MessageRole, ToolCallStatus } from '../../src/agent/types';
import { splitForToolCalls } from '../../src/components/transcript';

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
      { id: 'tool_1', name: 'list_files', input: { path: '.' }, status: ToolCallStatus.DONE, result: 'src/' },
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
      { id: 'tool_1', name: 'list_files', input: { path: '.' }, status: ToolCallStatus.RUNNING as const },
    ];

    const partition = splitForToolCalls({
      messages,
      toolCalls,
    });

    expect(partition.before).toEqual(messages);
    expect(partition.afterAssistant).toBeNull();
  });
});


