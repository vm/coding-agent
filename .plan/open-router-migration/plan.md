# Open Router Migration (Async/Experimental)

## Overview
Make the agent work with non-Anthropic models via OpenRouter.

## Key Points from Discussion
- Tools represented completely differently between providers
- Anthropic: tools passed as separate `tools` parameter, tool results are user messages with `tool_result` content blocks
- OpenAI/others: tools are a `tools` array with `function` objects, tool results are separate `tool` role messages
- OpenRouter uses OpenAI format
- If starting from Anthropic, need to rebuild for OpenRouter
- If using OpenAI format with OpenRouter, it's just a URL change

## Complexity
- Need internal representation of tools that converts to provider format
- Message history format differs
- Considered lower priority / async task

## Files to Modify

### 1. `src/agent/agent.ts` (Lines 125-157)
- Main API call: `this.client.messages.create()` at line 130
- System prompt: Lines 14-28
- Tool result handling: Lines 208-225
- Message storage: Lines 162-165, 216-225

### 2. `src/agent/types.ts`
- `MessageParam` type: Line 3 (hardcoded to Anthropic)
- `ContentBlock` type: Line 4 (Anthropic-specific)
- `ToolResultBlockParam` type: Line 5 (Anthropic-specific)
- Tool enums: Lines 18-35

### 3. `src/tools/index.ts` (Lines 8-73)
- Tools array uses Anthropic format with `input_schema`
- Need to convert to OpenAI `function.parameters` format

### 4. NEW: `src/providers/` directory
- `provider.ts` - Abstract Provider interface
- `anthropic.ts` - AnthropicAdapter (refactor current logic)
- `openrouter.ts` - OpenRouterAdapter (OpenAI format)

## Provider Interface
```typescript
interface Provider {
  formatToolsForProvider(tools[]): ProviderToolFormat;
  convertMessageToProvider(msg: MessageParam): ProviderMessage;
  convertResponseFromProvider(response): InternalResponse;
  getModelName(): string;
}
```

## Implementation Steps
1. Create abstract Provider interface in `src/providers/provider.ts`
2. Refactor existing Anthropic logic into `AnthropicAdapter`
3. Create `OpenRouterAdapter` with format conversion
4. Update Agent constructor: `provider: 'anthropic' | 'openrouter'`
5. Store provider adapter as instance variable
6. Add provider selection to config

## Message Format Differences

**Note:** Verify these format differences via web search before implementation.

### Anthropic
```json
{
  "role": "assistant",
  "content": [
    {"type": "tool_use", "id": "...", "name": "...", "input": {...}}
  ]
}
```

### OpenAI/OpenRouter
```json
{
  "role": "assistant",
  "tool_calls": [
    {"id": "...", "type": "function", "function": {"name": "...", "arguments": "..."}}
  ]
}
```

## Key Conversion Points

**Tool Format:**
- Anthropic: `tools` with `input_schema: { type: 'object', properties: {...} }`
- OpenAI: `tools` with `function: { name, description, parameters: {...} }`

**Tool Response:**
- Anthropic: Assistant message with `content: [{type: 'tool_use', id, name, input}]`
- OpenAI: Assistant message with `tool_calls: [{type: 'function', id, function: {name, arguments: JSON string}}]`

**Dependencies:**
- Keep `@anthropic-ai/sdk` for Anthropic
- Add OpenRouter SDK or use axios for direct HTTP

## Streaming Differences
- Anthropic: Uses `stream=true`, yields `content_block_delta` events
- OpenAI: Uses `stream=true`, yields `delta` chunks with different structure
- Need to normalize streaming responses in adapters

## Testing
Location: `tests/providers/`

- Test Anthropic adapter (existing behavior)
- Test OpenRouter adapter with various models
- Test tool call/response conversion
- Test message round-trip: internal → provider → internal
- Test streaming normalization
