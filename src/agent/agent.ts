import Anthropic from '@anthropic-ai/sdk';
import { tools, executeTool } from '../tools/index';
import type { MessageParam, AgentResponse, ToolCall, ContentBlock, ToolResultBlockParam } from './types';
import { cwd } from 'node:process';

const getSystemPrompt = (): string => {
  const workingDir = cwd();
  return `You are a helpful coding assistant with access to tools for reading, editing, and creating files, listing directory contents, and running shell commands.

Current working directory: ${workingDir}

All file paths should be relative to this directory unless the user specifies an absolute path. When the user mentions "this directory" or "current directory", they mean: ${workingDir}

When the user asks you to perform a task:
1. Break it down into steps
2. Use the available tools to accomplish each step
3. Explain what you're doing as you go

Always prefer editing existing files over creating new ones when appropriate. Be concise but informative.`;
};

export class Agent {
  private client: Anthropic;
  private conversation: MessageParam[] = [];

  constructor(client?: Anthropic) {
    this.client = client ?? new Anthropic();
  }

  async chat(userMessage: string): Promise<AgentResponse> {
    // Add user message to conversation
    this.conversation.push({
      role: 'user',
      content: userMessage,
    });

    const toolCalls: ToolCall[] = [];

    // Loop until we get a text response
    while (true) {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8096,
        system: getSystemPrompt(),
        tools: tools,
        messages: this.conversation,
      });

      const content = response.content;
      const stopReason = response.stop_reason;

      // Check if we have tool_use blocks
      const toolUseBlocks = content.filter(
        (block): block is Extract<ContentBlock, { type: 'tool_use' }> =>
          block.type === 'tool_use'
      );

      if (toolUseBlocks.length > 0) {
        // Execute tools and collect results
        const toolResults: ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          const result = executeTool(toolUse.name, toolUse.input);
          
          toolCalls.push({
            name: toolUse.name,
            input: toolUse.input,
            result: result,
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          });
        }

        // Add assistant message with tool_use and our response with tool_results
        this.conversation.push({
          role: 'assistant',
          content: [
            ...toolUseBlocks,
            ...toolResults,
          ],
        });

        // Continue loop to get next response
        continue;
      }

      // We have a text response
      const textBlocks = content.filter(
        (block): block is Extract<ContentBlock, { type: 'text' }> =>
          block.type === 'text'
      );

      if (textBlocks.length > 0) {
        const text = textBlocks.map(block => block.text).join('\n');

        // Add assistant message to conversation
        this.conversation.push({
          role: 'assistant',
          content: text,
        });

        return {
          text,
          toolCalls,
        };
      }

      // Fallback: if no text blocks, return empty response
      return {
        text: '',
        toolCalls,
      };
    }
  }
}

