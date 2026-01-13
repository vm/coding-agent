import Anthropic from '@anthropic-ai/sdk';
import { tools, executeTool } from '../tools/index';
import { ModelName, StopReason, ContentBlockType } from './types';
import type { 
  MessageParam, 
  AgentResponse, 
  ToolCall, 
  ContentBlock, 
  ToolResultBlockParam, 
  AgentOptions,
} from './types';
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class Agent {
  private client: Anthropic;
  private conversation: MessageParam[] = [];
  private options: Required<AgentOptions>;

  constructor(client?: Anthropic, options?: AgentOptions) {
    this.client = client ?? new Anthropic();
    this.options = {
      maxRetries: options?.maxRetries ?? 3,
      retryDelay: options?.retryDelay ?? 1000,
      enableParallelTools: options?.enableParallelTools ?? true,
      onToolStart: options?.onToolStart ?? (() => {}),
      onToolComplete: options?.onToolComplete ?? (() => {}),
    };
  }

  clearHistory(): void {
    this.conversation = [];
  }

  getHistoryLength(): number {
    return this.conversation.length;
  }

  private async executeToolWithErrorHandling(
    toolUse: Extract<ContentBlock, { type: 'tool_use' }>
  ): Promise<{ result: string; error: boolean }> {
    try {
      const toolInput = toolUse.input as Record<string, unknown>;
      this.options.onToolStart(toolUse.id, toolUse.name, toolInput);
      const result = executeTool(toolUse.name, toolUse.input);
      const isError = result.startsWith('Error:');
      this.options.onToolComplete(toolUse.id, toolUse.name, toolInput, result, isError);
      return { result, error: isError };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result = `Error: Tool execution failed: ${errorMessage}`;
      const toolInput = toolUse.input as Record<string, unknown>;
      this.options.onToolComplete(toolUse.id, toolUse.name, toolInput, result, true);
      return { result, error: true };
    }
  }

  private async executeToolsParallel(
    toolUseBlocks: Extract<ContentBlock, { type: 'tool_use' }>[]
  ): Promise<ToolCall[]> {
    const toolCalls: ToolCall[] = [];

    if (this.options.enableParallelTools && toolUseBlocks.length > 1) {
      const results = await Promise.all(
        toolUseBlocks.map(toolUse => this.executeToolWithErrorHandling(toolUse))
      );

      for (let i = 0; i < toolUseBlocks.length; i++) {
        const toolUse = toolUseBlocks[i];
        const { result, error } = results[i];
        toolCalls.push({
          name: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
          result,
          error,
        });
      }
    } else {
      for (const toolUse of toolUseBlocks) {
        const { result, error } = await this.executeToolWithErrorHandling(toolUse);
        toolCalls.push({
          name: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
          result,
          error,
        });
      }
    }

    return toolCalls;
  }

  private async makeApiCallWithRetry() {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: ModelName.CLAUDE_SONNET_4,
          max_tokens: 8096,
          system: getSystemPrompt(),
          tools: tools,
          messages: this.conversation,
        });
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown API error');
        
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('403') || 
              error.message.includes('400') || error.message.includes('invalid')) {
            throw error;
          }
        }

        if (attempt < this.options.maxRetries - 1) {
          const delay = this.options.retryDelay * Math.pow(2, attempt);
          await sleep(delay);
        }
      }
    }

    throw lastError || new Error('API call failed after retries');
  }

  async chat(userMessage: string): Promise<AgentResponse> {
    this.conversation.push({
      role: 'user',
      content: userMessage,
    });

    const toolCalls: ToolCall[] = [];
    let tokenUsage: { input: number; output: number } | undefined;

    try {
      while (true) {
        const response = await this.makeApiCallWithRetry();

        if (response.usage) {
          tokenUsage = {
            input: response.usage.input_tokens,
            output: response.usage.output_tokens,
          };
        }

        const content = response.content;
        const stopReason = response.stop_reason;

        if (stopReason === StopReason.MAX_TOKENS) {
          return {
            text: 'Response was truncated due to token limit. Please ask for a shorter response or break down your request.',
            toolCalls,
            tokenUsage,
            error: StopReason.MAX_TOKENS,
          };
        }

        const toolUseBlocks = content.filter(
          (block): block is Extract<ContentBlock, { type: 'tool_use' }> =>
            block.type === ContentBlockType.TOOL_USE
        );

        if (toolUseBlocks.length > 0) {
          const executedToolCalls = await this.executeToolsParallel(toolUseBlocks);
          toolCalls.push(...executedToolCalls);

          const toolResults: ToolResultBlockParam[] = toolUseBlocks.map((toolUse, idx) => ({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: executedToolCalls[idx].result,
            is_error: executedToolCalls[idx].error,
          }));

          this.conversation.push({
            role: 'assistant',
            content: toolUseBlocks,
          });

          this.conversation.push({
            role: 'user',
            content: toolResults,
          });

          continue;
        }

        const textBlocks = content.filter(
          (block): block is Extract<ContentBlock, { type: 'text' }> =>
            block.type === ContentBlockType.TEXT
        );

        if (textBlocks.length > 0) {
          const text = textBlocks.map(block => block.text).join('\n');

          this.conversation.push({
            role: 'assistant',
            content: text,
          });

          return {
            text,
            toolCalls,
            tokenUsage,
          };
        }

        return {
          text: '',
          toolCalls,
          tokenUsage,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        text: `An error occurred: ${errorMessage}`,
        toolCalls,
        tokenUsage,
        error: errorMessage,
      };
    }
  }
}

