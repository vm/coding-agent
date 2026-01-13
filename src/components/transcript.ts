import { MessageRole } from '../agent/types';

type MessageItem = {
  role: MessageRole;
  content: string;
};

type ToolCallItem = {
  id: string;
  name: string;
};

export type TranscriptPartition = {
  before: MessageItem[];
  afterAssistant: MessageItem | null;
};

export function splitForToolCalls(params: {
  messages: MessageItem[];
  toolCalls: ToolCallItem[];
}): TranscriptPartition {
  const { messages, toolCalls } = params;
  if (toolCalls.length === 0) {
    return { before: messages, afterAssistant: null };
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === MessageRole.ASSISTANT) {
    return {
      before: messages.slice(0, -1),
      afterAssistant: lastMessage,
    };
  }

  return { before: messages, afterAssistant: null };
}


