# Plan Mode

A mode where the agent creates implementation plans without editing files.

---

# Phase 1: Simple Tests

Write these tests first. They define the interface for the simple implementation.

## Test File Structure

```
tests/
  agent/
    agent.test.ts         # Update existing - add mode tests
  index.test.ts           # Update existing - add CLI tests
```

## Agent Mode Tests

```typescript
// tests/agent/agent.test.ts - Add these tests
describe('Agent plan mode', () => {
  test('tool interceptor blocks edit_file', async () => {
    const mockCreate = mock<(params: CreateMessageParams) => Promise<MockApiResponse>>(() =>
      Promise.resolve({
        content: [
          { type: 'tool_use', id: 'tool1', name: 'edit_file', input: { path: 'test.txt', old_str: '', new_str: 'content' } }
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 200 },
      })
    );
    
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic;
    
    const agent = new Agent(mockClient, {
      toolInterceptor: (name, input) => {
        if (name === 'edit_file') {
          const { path } = input as { path: string };
          return `[PLAN MODE] Would edit: ${path} - No changes made.`;
        }
        return null;
      },
    });
    
    await agent.chat('Create a file');
    
    // Tool was intercepted, not actually executed
  });

  test('custom system prompt is used', async () => {
    const mockCreate = mock<(params: CreateMessageParams) => Promise<MockApiResponse>>(() =>
      Promise.resolve({
        content: [{ type: 'text', text: 'Plan response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 200 },
      })
    );
    
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic;
    
    const customPrompt = 'You are a planning assistant.';
    const agent = new Agent(mockClient, { systemPrompt: customPrompt });
    
    await agent.chat('Plan something');
    
    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toBe(customPrompt);
  });

  test('read_file tool works normally with interceptor', async () => {
    const mockCreate = mock<(params: CreateMessageParams) => Promise<MockApiResponse>>(() =>
      Promise.resolve({
        content: [
          { type: 'tool_use', id: 'tool1', name: 'read_file', input: { path: 'test.txt' } }
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 200 },
      })
    );
    
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic;
    
    const agent = new Agent(mockClient, {
      toolInterceptor: (name) => {
        if (name === 'edit_file') return '[BLOCKED]';
        return null; // Allow other tools
      },
    });
    
    // read_file should execute normally
  });
});
```

## CLI Tests

```typescript
// tests/index.test.ts - Add these tests
describe('CLI argument parsing', () => {
  test('plan subcommand detected', () => {
    const args = ['plan', 'Create a feature'];
    
    expect(args[0]).toBe('plan');
    expect(args.slice(1).join(' ')).toBe('Create a feature');
  });

  test('--output flag parsed', () => {
    const args = ['plan', 'prompt', '--output', 'plan.md'];
    
    const outputIndex = args.indexOf('--output');
    expect(outputIndex).toBe(2);
    expect(args[outputIndex + 1]).toBe('plan.md');
  });

  test('prompt extracted excluding flags', () => {
    const args = ['plan', 'Create', 'a', 'feature', '--output', 'plan.md'];
    const prompt = args.slice(1).filter(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--output').join(' ');
    
    // Should get "Create a feature" without "--output" or "plan.md"
  });
});
```

## Simple Test Checklist

- [ ] `toolInterceptor` option can block edit_file
- [ ] `toolInterceptor` returns custom message for blocked tools
- [ ] `toolInterceptor` returns null to allow tool execution
- [ ] `systemPrompt` option overrides default system prompt
- [ ] CLI detects `plan` as first argument
- [ ] CLI extracts prompt from remaining arguments
- [ ] CLI parses `--output` flag

---

# Phase 2: Simple Implementation

Implement this to make the tests pass.

## Agent Options Extension

```typescript
// src/agent/types.ts - Add to AgentOptions
export type AgentOptions = {
  maxRetries?: number;
  retryDelay?: number;
  enableParallelTools?: boolean;
  onToolStart?: (id: string, name: string, input: Record<string, unknown>) => void;
  onToolComplete?: (id: string, name: string, input: Record<string, unknown>, result: string, error?: boolean) => void;
  systemPrompt?: string;
  toolInterceptor?: (name: string, input: unknown) => string | null;
};
```

## Agent Class Updates

```typescript
// src/agent/agent.ts - Update constructor
constructor(client?: Anthropic, options?: AgentOptions) {
  this.client = client ?? new Anthropic();
  this.options = {
    maxRetries: options?.maxRetries ?? 3,
    retryDelay: options?.retryDelay ?? 1000,
    enableParallelTools: options?.enableParallelTools ?? true,
    onToolStart: options?.onToolStart ?? (() => {}),
    onToolComplete: options?.onToolComplete ?? (() => {}),
    systemPrompt: options?.systemPrompt,
    toolInterceptor: options?.toolInterceptor,
  };
}

// Update makeApiCallWithRetry to use custom system prompt
private async makeApiCallWithRetry() {
  const response = await this.client.messages.create({
    model: ModelName.CLAUDE_SONNET_4,
    max_tokens: 8096,
    system: this.options.systemPrompt ?? getSystemPrompt(),
    tools: tools,
    messages: this.conversation,
  });
  return response;
}

// Update executeToolWithErrorHandling to check interceptor
private async executeToolWithErrorHandling(
  toolUse: Extract<ContentBlock, { type: 'tool_use' }>
): Promise<{ result: string; error: boolean }> {
  // Check interceptor first
  if (this.options.toolInterceptor) {
    const intercepted = this.options.toolInterceptor(toolUse.name, toolUse.input);
    if (intercepted !== null) {
      const toolInput = toolUse.input as Record<string, unknown>;
      this.options.onToolStart(toolUse.id, toolUse.name, toolInput);
      this.options.onToolComplete(toolUse.id, toolUse.name, toolInput, intercepted, false);
      return { result: intercepted, error: false };
    }
  }
  
  // ... existing implementation
}
```

## Plan Agent Factory

```typescript
// src/agent/plan-agent.ts
import Anthropic from '@anthropic-ai/sdk';
import { Agent } from './agent';
import { cwd } from 'node:process';

const PLAN_SYSTEM_PROMPT = `You are a planning assistant analyzing a codebase.

Current working directory: ${cwd()}

YOUR TASK: Create a detailed implementation plan. DO NOT edit any files.

When planning:
1. Read and analyze relevant files to understand the codebase
2. Identify what files need to be created or modified
3. Break down the work into specific, actionable steps
4. Include code snippets showing exactly what to add/change

OUTPUT FORMAT:
# Plan: [Title]

## Files to Modify
- [ ] \`path/to/file.ts\` - description

## Steps
### Step 1: [Title]
\`\`\`typescript
// Code to add/change
\`\`\`
`;

export function createPlanAgent(client?: Anthropic): Agent {
  return new Agent(client, {
    systemPrompt: PLAN_SYSTEM_PROMPT,
    toolInterceptor: (name, input) => {
      if (name === 'edit_file') {
        const { path } = input as { path: string };
        return `[PLAN MODE] Would edit: ${path} - No changes made.`;
      }
      return null;
    },
  });
}
```

## CLI Integration

```typescript
// src/index.tsx - Update entry point
import { render } from 'ink';
import { App } from './components/App';
import { createPlanAgent } from './agent/plan-agent';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);

if (args[0] === 'plan') {
  const prompt = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
  
  if (!prompt) {
    console.error('Usage: bun run start plan "your request" [--output file.md]');
    process.exit(1);
  }
  
  const agent = createPlanAgent();
  agent.chat(prompt).then(response => {
    console.log(response.text);
    
    const outputIndex = args.indexOf('--output');
    if (outputIndex !== -1) {
      const outputPath = args[outputIndex + 1];
      writeFileSync(outputPath, response.text);
      console.log(`\nSaved to ${outputPath}`);
    }
    
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
} else {
  render(<App />, { exitOnCtrlC: true });
}
```

## Simple Implementation Checklist

- [ ] Add `systemPrompt` to AgentOptions type
- [ ] Add `toolInterceptor` to AgentOptions type
- [ ] Update Agent constructor to store new options
- [ ] Update `makeApiCallWithRetry` to use `this.options.systemPrompt`
- [ ] Update `executeToolWithErrorHandling` to check interceptor first
- [ ] Create `src/agent/plan-agent.ts` with factory function
- [ ] Create plan-focused system prompt
- [ ] Implement tool interceptor to block edit_file
- [ ] Update `src/index.tsx` to handle `plan` subcommand
- [ ] Parse prompt from args
- [ ] Handle `--output` flag

---

# Phase 3: Production Tests

After simple implementation works, add these tests for production features.

## Additional Test Files

```
tests/
  agent/
    modes.test.ts         # Mode configuration tests
  plan/
    parser.test.ts        # Plan parsing tests
  cli/
    plan.test.ts          # CLI tests
```

## Mode Configuration Tests

```typescript
// tests/agent/modes.test.ts
import { describe, test, expect } from 'bun:test';
import { getModeConfig } from '../../src/agent/modes';
import { ToolName } from '../../src/agent/types';

describe('getModeConfig', () => {
  test('normal mode includes all tools', () => {
    const config = getModeConfig('normal', '/test');
    
    const toolNames = config.tools.map(t => t.name);
    expect(toolNames).toContain(ToolName.READ_FILE);
    expect(toolNames).toContain(ToolName.EDIT_FILE);
    expect(toolNames).toContain(ToolName.RUN_COMMAND);
    expect(toolNames).toContain(ToolName.LIST_FILES);
  });

  test('plan mode excludes edit_file', () => {
    const config = getModeConfig('plan', '/test');
    
    const toolNames = config.tools.map(t => t.name);
    expect(toolNames).toContain(ToolName.READ_FILE);
    expect(toolNames).not.toContain(ToolName.EDIT_FILE);
    expect(toolNames).toContain(ToolName.RUN_COMMAND);
    expect(toolNames).toContain(ToolName.LIST_FILES);
  });

  test('plan mode has different system prompt', () => {
    const normalConfig = getModeConfig('normal', '/test');
    const planConfig = getModeConfig('plan', '/test');
    
    expect(planConfig.systemPrompt).not.toBe(normalConfig.systemPrompt);
    expect(planConfig.systemPrompt).toContain('PLAN MODE');
  });

  test('working directory is included in prompts', () => {
    const config = getModeConfig('plan', '/my/project');
    
    expect(config.systemPrompt).toContain('/my/project');
  });
});
```

## Plan Parser Tests

```typescript
// tests/plan/parser.test.ts
import { describe, test, expect } from 'bun:test';
import { parsePlan, validatePlan } from '../../src/plan/parser';

describe('parsePlan', () => {
  test('extracts plan from code block', () => {
    const response = `
Here's my analysis.

\`\`\`plan
title: Add User Authentication
summary: Implement JWT-based auth with login/logout endpoints.

files:
  - path: src/auth/login.ts
    action: create
    description: Login endpoint

steps:
  - title: Create auth module
    file: src/auth/login.ts
    description: Add login function
    code: |
      export function login() {}

testing:
  - Test login with valid credentials

risks:
  - Token expiry handling
\`\`\`

Let me know if you have questions.
`;
    
    const plan = parsePlan(response);
    
    expect(plan).not.toBeNull();
    expect(plan!.title).toBe('Add User Authentication');
    expect(plan!.files).toHaveLength(1);
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.testing).toHaveLength(1);
    expect(plan!.risks).toHaveLength(1);
  });

  test('returns null for no plan block', () => {
    const response = 'Just a regular response without plan block.';
    
    const plan = parsePlan(response);
    
    expect(plan).toBeNull();
  });

  test('handles malformed YAML gracefully', () => {
    const response = `
\`\`\`plan
title: [invalid
yaml: {{
\`\`\`
`;
    
    const plan = parsePlan(response);
    expect(plan).toBeNull();
  });
});

describe('validatePlan', () => {
  test('returns errors for missing fields', () => {
    const plan = {
      title: '',
      summary: '',
      files: [],
      steps: [],
      testing: [],
      risks: [],
      raw: '',
    };
    
    const errors = validatePlan(plan);
    
    expect(errors).toContain('Missing title');
    expect(errors).toContain('No files listed');
    expect(errors).toContain('No steps listed');
  });

  test('validates step structure', () => {
    const plan = {
      title: 'Test',
      summary: 'Test',
      files: [{ path: 'a.ts', action: 'create' as const, description: 'test' }],
      steps: [{ title: '', description: '', file: 'a.ts' }],
      testing: [],
      risks: [],
      raw: '',
    };
    
    const errors = validatePlan(plan);
    
    expect(errors).toContain('Step missing title');
  });
});
```

## Agent Mode Tests

```typescript
// tests/agent/agent.test.ts - Add these tests
describe('Agent mode support', () => {
  test('plan mode uses restricted tools', async () => {
    const mockCreate = mock<(params: CreateMessageParams) => Promise<MockApiResponse>>(() =>
      Promise.resolve({
        content: [{ type: 'text', text: 'Here is the plan...' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 200 },
      })
    );
    
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic;
    const agent = new Agent(mockClient, { mode: 'plan' });
    
    await agent.chat('Plan a feature');
    
    const call = mockCreate.mock.calls[0][0];
    const toolNames = call.tools.map((t: { name: string }) => t.name);
    
    expect(toolNames).not.toContain('edit_file');
    expect(toolNames).toContain('read_file');
  });

  test('plan mode uses plan system prompt', async () => {
    const mockCreate = mock<(params: CreateMessageParams) => Promise<MockApiResponse>>(() =>
      Promise.resolve({
        content: [{ type: 'text', text: 'Plan' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 200 },
      })
    );
    
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic;
    const agent = new Agent(mockClient, { mode: 'plan' });
    
    await agent.chat('Plan');
    
    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toContain('PLAN MODE');
  });
});
```

## Production Test Checklist

- [ ] `getModeConfig('normal')` includes all tools
- [ ] `getModeConfig('plan')` excludes edit_file
- [ ] Plan mode has different system prompt
- [ ] Working directory appears in system prompt
- [ ] `parsePlan()` extracts plan from code block
- [ ] `parsePlan()` returns null when no plan block
- [ ] `parsePlan()` handles malformed YAML
- [ ] `validatePlan()` catches missing title
- [ ] `validatePlan()` catches empty files array
- [ ] `validatePlan()` catches empty steps array
- [ ] Agent with `mode: 'plan'` uses restricted tools
- [ ] Agent with `mode: 'plan'` uses plan system prompt

---

# Phase 4: Production Implementation

Implement after production tests are written.

## Architecture

```
src/
  agent/
    agent.ts              # Modified to support modes
    modes/
      index.ts            # Mode definitions
      normal.ts           # Normal mode config
      plan.ts             # Plan mode config
  plan/
    parser.ts             # Parse plan output into structured data
  cli/
    plan.ts               # CLI handler
```

## Dependencies

```bash
bun add yaml
```

## Type Updates

```typescript
// src/agent/types.ts - Add mode type
export type AgentMode = 'normal' | 'plan';

export type AgentOptions = {
  // ... existing options
  mode?: AgentMode;
};
```

## Mode System

```typescript
// src/agent/modes/index.ts
import { Tool } from '../../tools';
import { tools as allTools } from '../../tools';
import { ToolName } from '../types';

export type AgentMode = 'normal' | 'plan';

export interface ModeConfig {
  systemPrompt: string;
  tools: Tool[];
}

const READ_ONLY_TOOLS = [
  ToolName.READ_FILE,
  ToolName.LIST_FILES,
  ToolName.RUN_COMMAND,
];

export function getModeConfig(mode: AgentMode, workingDir: string): ModeConfig {
  switch (mode) {
    case 'plan':
      return {
        systemPrompt: getPlanSystemPrompt(workingDir),
        tools: allTools.filter(t => READ_ONLY_TOOLS.includes(t.name as ToolName)),
      };
    case 'normal':
    default:
      return {
        systemPrompt: getNormalSystemPrompt(workingDir),
        tools: allTools,
      };
  }
}

function getNormalSystemPrompt(workingDir: string): string {
  return `You are a helpful coding assistant...
Current working directory: ${workingDir}
...`;
}

function getPlanSystemPrompt(workingDir: string): string {
  return `You are a senior software architect creating implementation plans.

IMPORTANT: You are in PLAN MODE. You cannot edit files - the edit_file tool is not available. Your job is to create a detailed, actionable plan.

Current working directory: ${workingDir}

## Your Process
1. Understand the request thoroughly
2. Explore the codebase using read_file and list_files
3. Run read-only commands if needed (git status, grep, etc.)
4. Create a step-by-step implementation plan

## Required Output Format

You MUST structure your response with a plan block:

\`\`\`plan
title: Brief Title Here
summary: 2-3 sentence overview

files:
  - path: path/to/file.ts
    action: create|modify|delete
    description: What changes to make

steps:
  - title: Step 1 Title
    file: path/to/file.ts
    description: What to do
    code: |
      // Exact code to add or change

testing:
  - Description of test case 1

risks:
  - Potential issue to watch for
\`\`\`
`;
}
```

## Plan Parser

```typescript
// src/plan/parser.ts
import yaml from 'yaml';

export interface PlanFile {
  path: string;
  action: 'create' | 'modify' | 'delete';
  description: string;
}

export interface PlanStep {
  title: string;
  file?: string;
  description: string;
  code?: string;
}

export interface Plan {
  title: string;
  summary: string;
  files: PlanFile[];
  steps: PlanStep[];
  testing: string[];
  risks: string[];
  raw: string;
}

export function parsePlan(response: string): Plan | null {
  const planMatch = response.match(/```plan\n([\s\S]*?)```/);
  if (!planMatch) return null;

  const planYaml = planMatch[1];
  
  try {
    const parsed = yaml.parse(planYaml);
    
    return {
      title: parsed.title ?? 'Untitled Plan',
      summary: parsed.summary ?? '',
      files: (parsed.files ?? []).map((f: Record<string, unknown>) => ({
        path: f.path as string,
        action: f.action as 'create' | 'modify' | 'delete',
        description: f.description as string,
      })),
      steps: (parsed.steps ?? []).map((s: Record<string, unknown>) => ({
        title: s.title as string,
        file: s.file as string | undefined,
        description: s.description as string,
        code: s.code as string | undefined,
      })),
      testing: parsed.testing ?? [],
      risks: parsed.risks ?? [],
      raw: response,
    };
  } catch {
    return null;
  }
}

export function validatePlan(plan: Plan): string[] {
  const errors: string[] = [];
  
  if (!plan.title) errors.push('Missing title');
  if (!plan.summary) errors.push('Missing summary');
  if (plan.files.length === 0) errors.push('No files listed');
  if (plan.steps.length === 0) errors.push('No steps listed');
  
  for (const step of plan.steps) {
    if (!step.title) errors.push('Step missing title');
    if (!step.description) errors.push('Step missing description');
  }
  
  return errors;
}
```

## Agent Updates

```typescript
// src/agent/agent.ts - Update to use mode system
import { getModeConfig, AgentMode, ModeConfig } from './modes';

export class Agent {
  private modeConfig: ModeConfig;

  constructor(client?: Anthropic, options?: AgentOptions) {
    const mode = options?.mode ?? 'normal';
    this.modeConfig = getModeConfig(mode, cwd());
    // ... rest of constructor
  }

  private async makeApiCallWithRetry() {
    const response = await this.client.messages.create({
      model: ModelName.CLAUDE_SONNET_4,
      max_tokens: 8096,
      system: this.options.systemPrompt ?? this.modeConfig.systemPrompt,
      tools: this.modeConfig.tools,
      messages: this.conversation,
    });
    return response;
  }
}
```

## CLI Handler

```typescript
// src/cli/plan.ts
import { Agent } from '../agent/agent';
import { parsePlan, validatePlan } from '../plan/parser';
import { writeFileSync } from 'node:fs';

interface PlanOptions {
  outputPath?: string;
  jsonOutput?: boolean;
}

export async function runPlanMode(prompt: string, options: PlanOptions): Promise<void> {
  if (!prompt) {
    console.error('Usage: bun run start plan "your request" [--output file.md] [--json]');
    process.exit(1);
  }

  console.log('Analyzing codebase and creating plan...\n');
  
  const agent = new Agent(undefined, { mode: 'plan' });
  const response = await agent.chat(prompt);
  
  const plan = parsePlan(response.text);
  
  if (plan) {
    const errors = validatePlan(plan);
    if (errors.length > 0) {
      console.warn('Plan validation warnings:', errors.join(', '));
    }
    
    if (options.jsonOutput) {
      console.log(JSON.stringify(plan, null, 2));
    } else {
      console.log(response.text);
      console.log('\n---');
      console.log(`Files to modify: ${plan.files.length}`);
      console.log(`Steps: ${plan.steps.length}`);
    }
  } else {
    console.warn('Warning: Could not parse structured plan from response');
    console.log(response.text);
  }

  if (options.outputPath) {
    writeFileSync(options.outputPath, response.text);
    console.log(`\nPlan saved to ${options.outputPath}`);
  }
}
```

## Updated Entry Point

```typescript
// src/index.tsx
import { render } from 'ink';
import { App } from './components/App';
import { runPlanMode } from './cli/plan';

const args = process.argv.slice(2);

if (args[0] === 'plan') {
  const prompt = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
  const outputPath = args.includes('--output') 
    ? args[args.indexOf('--output') + 1] 
    : undefined;
  const jsonOutput = args.includes('--json');
  
  runPlanMode(prompt, { outputPath, jsonOutput })
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
} else {
  render(<App />, { exitOnCtrlC: true });
}
```

## Production Implementation Checklist

### Mode System
- [ ] Create `src/agent/modes/` directory
- [ ] Define `AgentMode` type
- [ ] Define `ModeConfig` interface
- [ ] Implement `getModeConfig()` function
- [ ] Add `mode` option to AgentOptions
- [ ] Update Agent to use mode config
- [ ] Filter tools based on mode

### Plan Parser
- [ ] Create `src/plan/parser.ts`
- [ ] Define Plan interfaces
- [ ] Extract plan block from response
- [ ] Parse YAML content
- [ ] Map to typed Plan interface
- [ ] Validate required fields

### CLI
- [ ] Create `src/cli/plan.ts`
- [ ] Parse and display structured output
- [ ] Add `--json` flag for JSON output
- [ ] Handle validation warnings

### Integration
- [ ] Update `src/index.tsx` to use `runPlanMode`
- [ ] Pass parsed options to CLI handler

