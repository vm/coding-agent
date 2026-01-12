# Open Router Migration (Async/Experimental)

## Overview
Make the agent work with non-Anthropic models via OpenRouter.

## Key Points from Discussion
- Tools represented completely differently between providers
- Anthropic: tools in system message, tool response is assistant message with type "tool_response"
- OpenAI/others: tools are a tool_call object, separate tool response message type
- OpenRouter uses OpenAI format
- If starting from Anthropic, need to rebuild for OpenRouter
- If using OpenAI format with OpenRouter, it's just a URL change

## Complexity
- Need internal representation of tools that converts to provider format
- Message history format differs
- Considered lower priority / async task

## Implementation Steps
1. Create abstract message/tool interface
2. Create provider adapters:
   - AnthropicAdapter (current)
   - OpenRouterAdapter (OpenAI format)
3. Convert internal format to provider format on API call
4. Convert provider response back to internal format
5. Add provider selection config

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

## Testing
- Test Anthropic adapter (existing behavior)
- Test OpenRouter adapter with various models
- Test tool call/response conversion
