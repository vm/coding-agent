# Code-Editing Agent in TypeScript

Based on [How to Build an Agent](https://ampcode.com/how-to-build-an-agent) by Thorsten Ball.

---

## Tech Stack

| Component | Choice |
|-----------|--------|
| Runtime | **Bun** |
| Language | TypeScript |
| LLM SDK | `@anthropic-ai/sdk` |
| CLI UI | **Ink** (React for terminal) |
| Testing | `bun test` (built-in) |

---

## Final File Structure

```
coding-agent/
├── package.json
├── tsconfig.json
├── .gitignore
├── PLAN.md
├── src/
│   ├── index.tsx              # Entry point - renders Ink app
│   ├── components/
│   │   ├── App.tsx            # Main app component
│   │   ├── Message.tsx        # User/Assistant message display
│   │   ├── ToolCall.tsx       # Tool execution display
│   │   └── Input.tsx          # User input component
│   ├── agent/
│   │   ├── agent.ts           # Agent class - conversation + inference
│   │   └── types.ts           # Shared types
│   └── tools/
│       ├── index.ts           # Tool definitions & dispatcher
│       ├── read-file.ts       # read_file implementation
│       ├── edit-file.ts       # edit_file implementation
│       └── run-command.ts     # run_command implementation
└── tests/
    ├── tools/
    │   ├── read-file.test.ts
    │   ├── edit-file.test.ts
    │   ├── run-command.test.ts
    │   └── index.test.ts      # Dispatcher tests
    └── agent/
        └── agent.test.ts      # Agent tests with mocked API
```

---

## Development Approach: TDD

Each feature follows **Red → Green → Refactor**:
1. ✍️ Write a failing test
2. ✅ Write minimal code to make it pass
3. 🔄 Refactor if needed

---

## Checklist

### Phase 1: Scaffold Project

- [ ] **1.1** Create `package.json`:
  ```json
  {
    "name": "coding-agent",
    "type": "module",
    "scripts": {
      "start": "bun run src/index.tsx",
      "test": "bun test",
      "test:watch": "bun test --watch"
    },
    "dependencies": {
      "@anthropic-ai/sdk": "latest",
      "ink": "^5.0.1",
      "react": "^18.3.1"
    },
    "devDependencies": {
      "@types/bun": "latest",
      "@types/react": "^18.3.12"
    }
  }
  ```

- [ ] **1.2** Create `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "jsx": "react-jsx",
      "strict": true,
      "skipLibCheck": true,
      "types": ["bun-types"]
    },
    "include": ["src/**/*", "tests/**/*"]
  }
  ```

- [ ] **1.3** Create `.gitignore`:
  ```
  node_modules/
  .env
  test-workspace/
  ```

- [ ] **1.4** Create directory structure:
  - `src/components/`
  - `src/agent/`
  - `src/tools/`
  - `tests/tools/`
  - `tests/agent/`

- [ ] **1.5** Create placeholder files (empty or minimal exports):
  - `src/index.tsx`
  - `src/components/App.tsx`
  - `src/components/Message.tsx`
  - `src/components/ToolCall.tsx`
  - `src/components/Input.tsx`
  - `src/agent/agent.ts`
  - `src/agent/types.ts`
  - `src/tools/index.ts`
  - `src/tools/read-file.ts`
  - `src/tools/edit-file.ts`
  - `src/tools/run-command.ts`

- [ ] **1.6** Create placeholder test files:
  - `tests/tools/read-file.test.ts`
  - `tests/tools/edit-file.test.ts`
  - `tests/tools/run-command.test.ts`
  - `tests/tools/index.test.ts`
  - `tests/agent/agent.test.ts`

- [ ] **1.7** Run `bun install`

- [ ] **1.8** Verify `bun test` runs (0 tests, no errors)

---

### Phase 2: Tool Tests (Red)

Write all tool tests BEFORE implementing the tools.

- [ ] **2.1** `tests/tools/read-file.test.ts`:
  ```typescript
  import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
  import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
  import { tmpdir } from 'node:os';
  import { join } from 'node:path';
  ```
  
  Test cases:
  - [ ] Returns file contents for existing file
  - [ ] Returns error message for non-existent file
  - [ ] Handles files with special characters

- [ ] **2.2** `tests/tools/edit-file.test.ts`:
  
  Test cases:
  - [ ] Creates new file when `old_str` is empty
  - [ ] Creates parent directories if they don't exist
  - [ ] Replaces `old_str` with `new_str` in existing file
  - [ ] Returns error when `old_str` not found
  - [ ] Returns error when `old_str` appears multiple times
  - [ ] Handles empty `new_str` (deletion)

- [ ] **2.3** `tests/tools/run-command.test.ts`:
  
  Test cases:
  - [ ] Returns stdout for successful command
  - [ ] Returns combined stdout+stderr
  - [ ] Returns error message for failing command
  - [ ] Handles commands with arguments

- [ ] **2.4** `tests/tools/index.test.ts` (dispatcher):
  
  Test cases:
  - [ ] Routes `read_file` to readFile function
  - [ ] Routes `edit_file` to editFile function
  - [ ] Routes `run_command` to runCommand function
  - [ ] Returns error for unknown tool name

- [ ] **2.5** Run `bun test` - all tests should FAIL (Red)

---

### Phase 3: Tool Implementations (Green)

Implement tools to make tests pass.

- [ ] **3.1** `src/tools/read-file.ts`:
  ```typescript
  import { readFileSync } from 'node:fs';
  
  export function readFile(path: string): string {
    // Implementation
  }
  ```

- [ ] **3.2** `src/tools/edit-file.ts`:
  ```typescript
  import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
  import { dirname } from 'node:path';
  
  export function editFile(path: string, oldStr: string, newStr: string): string {
    // Implementation
  }
  ```

- [ ] **3.3** `src/tools/run-command.ts`:
  ```typescript
  import { spawnSync } from 'bun';
  
  export function runCommand(command: string): string {
    // Implementation
  }
  ```

- [ ] **3.4** `src/tools/index.ts`:
  - Export tool definitions array (JSON schemas for Claude)
  - Export `executeTool(name: string, input: unknown): string`

- [ ] **3.5** Run `bun test` - all tool tests should PASS (Green)

---

### Phase 4: Agent Tests (Red)

Write agent tests with mocked Anthropic client.

- [ ] **4.1** `tests/agent/agent.test.ts` setup:
  ```typescript
  import { describe, it, expect, mock, beforeEach } from 'bun:test';
  import { Agent } from '../src/agent/agent';
  
  // Mock Anthropic client
  const mockCreate = mock(() => {});
  const mockClient = {
    messages: { create: mockCreate }
  };
  ```

- [ ] **4.2** Test: Basic text response
  - Mock returns text content only
  - Agent extracts and returns text
  - No tools executed

- [ ] **4.3** Test: Single tool call
  - Mock returns `tool_use` block
  - Agent executes tool
  - Agent sends `tool_result` back
  - Mock returns text on second call
  - Agent returns final text

- [ ] **4.4** Test: Multi-tool chain
  - Mock returns `tool_use` (read_file)
  - Mock returns another `tool_use` (edit_file)
  - Mock returns text
  - Verify all tools executed in order

- [ ] **4.5** Test: Tool error handling
  - Tool returns error message
  - Agent continues without crashing
  - Error sent back as `tool_result`

- [ ] **4.6** Test: Conversation history maintained
  - Multiple turns
  - Verify messages accumulate correctly

- [ ] **4.7** Run `bun test` - agent tests should FAIL (Red)

---

### Phase 5: Agent Implementation (Green)

- [ ] **5.1** `src/agent/types.ts`:
  ```typescript
  import type Anthropic from '@anthropic-ai/sdk';
  
  export type MessageParam = Anthropic.MessageParam;
  export type ContentBlock = Anthropic.ContentBlock;
  export type ToolResultBlockParam = Anthropic.ToolResultBlockParam;
  ```

- [ ] **5.2** `src/agent/agent.ts`:
  ```typescript
  import Anthropic from '@anthropic-ai/sdk';
  import { tools, executeTool } from '../tools/index';
  
  export class Agent {
    private client: Anthropic;
    private conversation: MessageParam[] = [];
    
    constructor(client?: Anthropic) {
      this.client = client ?? new Anthropic();
    }
    
    async chat(userMessage: string): Promise<AgentResponse> {
      // Add user message to conversation
      // Loop: call API, execute tools, until text response
      // Return response with text and tool calls made
    }
  }
  ```

- [ ] **5.3** Implement `chat()` method:
  - Add user message to conversation
  - Call `client.messages.create()` with tools
  - If `tool_use`: execute tool, add result, loop
  - If text only: return response
  - Track tool calls made for UI

- [ ] **5.4** Run `bun test` - all tests should PASS (Green)

---

### Phase 6: Ink UI Components

- [ ] **6.1** `src/components/Message.tsx`:
  ```tsx
  import { Text, Box } from 'ink';
  
  type Props = {
    role: 'user' | 'assistant';
    content: string;
  };
  
  export function Message({ role, content }: Props) {
    return (
      <Box>
        <Text color={role === 'user' ? 'blue' : 'yellow'}>
          {role === 'user' ? 'You' : 'Claude'}:
        </Text>
        <Text> {content}</Text>
      </Box>
    );
  }
  ```

- [ ] **6.2** `src/components/ToolCall.tsx`:
  ```tsx
  import { Text, Box } from 'ink';
  
  type Props = {
    name: string;
    status: 'running' | 'done' | 'error';
    result?: string;
  };
  
  export function ToolCall({ name, status, result }: Props) {
    // Show spinner when running
    // Show result summary when done
  }
  ```

- [ ] **6.3** `src/components/Input.tsx`:
  - Use `useInput` hook from Ink
  - Handle text input
  - Submit on Enter

- [ ] **6.4** `src/components/App.tsx`:
  ```tsx
  import { useState } from 'react';
  import { Box, Text } from 'ink';
  import { Agent } from '../agent/agent';
  import { Message } from './Message';
  import { ToolCall } from './ToolCall';
  import { Input } from './Input';
  
  export function App() {
    const [messages, setMessages] = useState<...>([]);
    const [agent] = useState(() => new Agent());
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSubmit = async (text: string) => {
      // Add user message
      // Call agent.chat()
      // Add assistant response
    };
    
    return (
      <Box flexDirection="column">
        {messages.map(...)}
        <Input onSubmit={handleSubmit} disabled={isLoading} />
      </Box>
    );
  }
  ```

- [ ] **6.5** `src/index.tsx`:
  ```tsx
  import { render } from 'ink';
  import { App } from './components/App';
  
  render(<App />);
  ```

- [ ] **6.6** Run `bun start` - verify UI renders

---

### Phase 7: Integration & Polish

- [ ] **7.1** Add loading spinner while waiting for Claude:
  ```tsx
  import Spinner from 'ink-spinner';
  
  {isLoading && (
    <Text>
      <Spinner type="dots" /> Thinking...
    </Text>
  )}
  ```

- [ ] **7.2** Add system prompt:
  ```typescript
  const SYSTEM_PROMPT = `You are a helpful coding assistant...`;
  ```

- [ ] **7.3** Handle Ctrl+C gracefully:
  ```tsx
  import { useApp } from 'ink';
  
  const { exit } = useApp();
  // Handle exit
  ```

- [ ] **7.4** Add welcome message:
  ```tsx
  <Text color="gray">
    Chat with Claude (Ctrl+C to quit)
  </Text>
  ```

- [ ] **7.5** Error display:
  ```tsx
  <Text color="red">Error: {error.message}</Text>
  ```

- [ ] **7.6** Final manual testing:
  - Create a new file
  - Read an existing file
  - Edit a file
  - Run a command
  - Multi-step task: "Create fizzbuzz.js and run it"

---

## Quick Reference

### Bun Commands
```bash
bun install          # Install dependencies
bun start            # Run the agent
bun test             # Run tests once
bun test --watch     # Run tests in watch mode
```

### Anthropic API Call
```typescript
const response = await this.client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8096,
  system: SYSTEM_PROMPT,
  tools: tools,
  messages: this.conversation,
});
```

### Tool Schema Format
```typescript
{
  name: 'read_file',
  description: 'Read the contents of a file',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to file' }
    },
    required: ['path']
  }
}
```

### Tool Result Format
```typescript
{
  type: 'tool_result',
  tool_use_id: block.id,
  content: resultString,
}
```

### Ink Components
```tsx
import { render, Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
```

### Test Helpers
```typescript
import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let testDir: string;
beforeEach(() => {
  testDir = mkdtempSync(join(tmpdir(), 'agent-test-'));
});
afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});
```

### Mock Anthropic Client
```typescript
const mockCreate = mock(() => Promise.resolve({
  content: [{ type: 'text', text: 'Hello!' }],
  stop_reason: 'end_turn',
}));

const mockClient = {
  messages: { create: mockCreate }
} as unknown as Anthropic;

const agent = new Agent(mockClient);
```
