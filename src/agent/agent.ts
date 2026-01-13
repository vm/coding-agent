import OpenAI from 'openai';
import { tools, executeTool } from '../tools/index';
import { StopReason } from './types';
import type { 
  Message, 
  AgentResponse, 
  ToolCall, 
  ToolCallMessage,
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

function createOpenAIClient(): { client: OpenAI; model: string } {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;

  if (openaiApiKey) {
    const model = process.env.OPENAI_MODEL;
    if (!model) {
      throw new Error('OPENAI_MODEL environment variable is required when using OPENAI_API_KEY');
    }

    const client = new OpenAI({
      apiKey: openaiApiKey,
    });

    return { client, model };
  }

  if (openrouterApiKey) {
    const model = process.env.OPENROUTER_MODEL;
    if (!model) {
      throw new Error('OPENROUTER_MODEL environment variable is required when using OPENROUTER_API_KEY');
    }

    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openrouterApiKey,
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://github.com',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'Coding Agent',
      },
    });

    return { client, model };
  }

  throw new Error('Either OPENAI_API_KEY or OPENROUTER_API_KEY environment variable is required');
}

export class Agent {
  private client: OpenAI;
  private conversation: Message[] = [];
  private model: string;
  private options: Required<AgentOptions>;

  constructor(client?: OpenAI, options?: AgentOptions & { model?: string }) {
    if (client) {
      this.client = client;
      this.model = options?.model || process.env.OPENAI_MODEL || process.env.OPENROUTER_MODEL || '';
      if (!this.model) {
        throw new Error('Model must be provided in options or via OPENAI_MODEL/OPENROUTER_MODEL environment variable');
      }
    } else {
      const { client: createdClient, model: createdModel } = createOpenAIClient();
      this.client = createdClient;
      this.model = options?.model || createdModel;
    }
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
    toolCall: ToolCallMessage
  ): Promise<{ result: string; error: boolean }> {
    try {
      const toolInput = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
      this.options.onToolStart(toolCall.id, toolCall.function.name, toolInput);
      const result = executeTool(toolCall.function.name, toolInput);
      const isError = result.startsWith('Error:');
      this.options.onToolComplete(toolCall.id, toolCall.function.name, toolInput, result, isError);
      return { result, error: isError };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result = `Error: Tool execution failed: ${errorMessage}`;
      const toolInput = JSON.parse(toolCall.function.arguments || '{}') as Record<string, unknown>;
      this.options.onToolComplete(toolCall.id, toolCall.function.name, toolInput, result, true);
      return { result, error: true };
    }
  }

  private async executeToolsParallel(
    toolCalls: ToolCallMessage[]
  ): Promise<ToolCall[]> {
    const executedToolCalls: ToolCall[] = [];

    if (this.options.enableParallelTools && toolCalls.length > 1) {
      const results = await Promise.all(
        toolCalls.map(toolCall => this.executeToolWithErrorHandling(toolCall))
      );

      for (let i = 0; i < toolCalls.length; i++) {
        const toolCall = toolCalls[i];
        const { result, error } = results[i];
        const toolInput = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        executedToolCalls.push({
          name: toolCall.function.name,
          input: toolInput,
          result,
          error,
        });
      }
    } else {
      for (const toolCall of toolCalls) {
        const { result, error } = await this.executeToolWithErrorHandling(toolCall);
        const toolInput = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        executedToolCalls.push({
          name: toolCall.function.name,
          input: toolInput,
          result,
          error,
        });
      }
    }

    return executedToolCalls;
  }

  private async makeApiCallWithRetry() {
    let lastError: Error | null = null;
    
    const openAIMessages: Array<
      | { role: 'user'; content: string }
      | { role: 'assistant'; content: string }
      | { role: 'assistant'; content: null; tool_calls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> }
      | { role: 'tool'; tool_call_id: string; content: string }
    > = this.conversation.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          tool_call_id: msg.tool_call_id!,
          content: msg.content as string,
        };
      }
      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        return {
          role: 'assistant' as const,
          content: null,
          tool_calls: msg.content.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        };
      }
      return {
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content as string,
      };
    });
    
    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          max_tokens: 8096,
          messages: [
            { role: 'system', content: getSystemPrompt() },
            ...openAIMessages,
          ],
          tools: tools,
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

        const choice = response.choices[0];
        if (!choice) {
          return {
            text: '',
            toolCalls,
            tokenUsage,
          };
        }

        if (response.usage) {
          tokenUsage = {
            input: response.usage.prompt_tokens,
            output: response.usage.completion_tokens,
          };
        }

        const finishReason = choice.finish_reason;

        if (finishReason === StopReason.MAX_TOKENS) {
          return {
            text: 'Response was truncated due to token limit. Please ask for a shorter response or break down your request.',
            toolCalls,
            tokenUsage,
            error: StopReason.MAX_TOKENS,
          };
        }

        const message = choice.message;
        const openAIToolCalls = message.tool_calls || [];

        if (openAIToolCalls.length > 0) {
          const toolCallMessages: ToolCallMessage[] = openAIToolCalls.map(tc => {
            if (tc.type !== 'function' || !('function' in tc)) {
              throw new Error('Unexpected tool call type');
            }
            return {
              id: tc.id,
              type: 'function',
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments,
              },
            };
          });

          const executedToolCalls = await this.executeToolsParallel(toolCallMessages);
          toolCalls.push(...executedToolCalls);

          this.conversation.push({
            role: 'assistant',
            content: toolCallMessages,
          });

          for (let i = 0; i < toolCallMessages.length; i++) {
            this.conversation.push({
              role: 'tool',
              content: executedToolCalls[i].result,
              tool_call_id: toolCallMessages[i].id,
            });
          }

          continue;
        }

        const text = message.content || '';

        if (text) {
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

