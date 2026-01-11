import type Anthropic from '@anthropic-ai/sdk';

export type MessageParam = Anthropic.MessageParam;
export type ContentBlock = Anthropic.ContentBlock;
export type ToolResultBlockParam = Anthropic.ToolResultBlockParam;

export type ToolCall = {
  name: string;
  input: Record<string, unknown>;
  result: string;
};

export type AgentResponse = {
  text: string;
  toolCalls: ToolCall[];
};

