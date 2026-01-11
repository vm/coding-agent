import type Anthropic from '@anthropic-ai/sdk';

export type MessageParam = Anthropic.MessageParam;
export type ContentBlock = Anthropic.ContentBlock;
export type ToolResultBlockParam = Anthropic.ToolResultBlockParam;

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant'
}

export enum ToolCallStatus {
  RUNNING = 'running',
  DONE = 'done',
  ERROR = 'error'
}

export enum ToolName {
  READ_FILE = 'read_file',
  EDIT_FILE = 'edit_file',
  RUN_COMMAND = 'run_command',
  LIST_FILES = 'list_files'
}

export enum ContentBlockType {
  TEXT = 'text',
  TOOL_USE = 'tool_use'
}

export enum StopReason {
  MAX_TOKENS = 'max_tokens',
  END_TURN = 'end_turn',
  STOP_SEQUENCE = 'stop_sequence',
  TOOL_USE = 'tool_use'
}

export enum ModelName {
  CLAUDE_SONNET_4 = 'claude-sonnet-4-20250514'
}

export type ToolCall = {
  name: string;
  input: Record<string, unknown>;
  result: string;
  error?: boolean;
};

export type AgentResponse = {
  text: string;
  toolCalls: ToolCall[];
  tokenUsage?: {
    input: number;
    output: number;
  };
  error?: string;
};

export type AgentOptions = {
  maxRetries?: number;
  retryDelay?: number;
  enableParallelTools?: boolean;
  onToolStart?: (id: string, name: string, input: Record<string, unknown>) => void;
  onToolComplete?: (id: string, name: string, result: string, error?: boolean) => void;
};

