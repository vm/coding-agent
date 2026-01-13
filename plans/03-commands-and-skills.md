# Commands and Skills

Slash commands for reusable prompts, with optional supporting files.

- **Commands**: Single markdown file (`.prompts/review.md`)
- **Skills**: Directory with markdown + scripts (`.skills/qr-code/skill.md`)
- **Safety**: Skills and commands only expand into a prompt. They must never automatically run scripts or shell commands.

---

# Phase 1: Simple Tests

Write these tests first. They define the interface for the simple implementation.

## Test File Structure

```
tests/
  commands/
    index.test.ts         # Command discovery and parsing tests
```

## Command Discovery Tests

```typescript
// tests/commands/index.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { findCommand, listCommands, parseSlashCommand, expandInput } from '../../src/commands';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dir, '../tmp/commands-test');

describe('parseSlashCommand', () => {
  test('parses /command → name="command", rest=""', () => {
    const result = parseSlashCommand('/review');
    
    expect(result).not.toBeNull();
    expect(result!.name).toBe('review');
    expect(result!.rest).toBe('');
  });

  test('parses /command extra text → name="command", rest="extra text"', () => {
    const result = parseSlashCommand('/review the auth module');
    
    expect(result!.name).toBe('review');
    expect(result!.rest).toBe('the auth module');
  });

  test('non-slash input returns null', () => {
    const result = parseSlashCommand('just a message');
    
    expect(result).toBeNull();
  });

  test('/help is recognized', () => {
    const result = parseSlashCommand('/help');
    
    expect(result!.name).toBe('help');
  });
});

describe('expandInput', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, '.prompts'), { recursive: true });
    mkdirSync(join(TEST_DIR, '.skills', 'qr-code'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  test('/help returns a local response and does not call the agent', () => {
    writeFileSync(join(TEST_DIR, '.prompts', 'review.md'), 'Review code.');
    const result = expandInput('/help', TEST_DIR);
    expect(result.kind).toBe('local');
    if (result.kind === 'local') {
      expect(result.userText).toBe('/help');
      expect(result.outputText).toContain('/review');
    }
  });

  test('unknown command returns a local error', () => {
    const result = expandInput('/nope', TEST_DIR);
    expect(result.kind).toBe('local');
    if (result.kind === 'local') {
      expect(result.error).toBe(true);
      expect(result.outputText).toContain('Unknown command');
    }
  });

  test('command expands to an agent prompt, appending rest text', () => {
    writeFileSync(join(TEST_DIR, '.prompts', 'review.md'), 'Review this.');
    const result = expandInput('/review the auth module', TEST_DIR);
    expect(result.kind).toBe('agent');
    if (result.kind === 'agent') {
      expect(result.userText).toBe('/review the auth module');
      expect(result.prompt).toContain('Review this.');
      expect(result.prompt).toContain('the auth module');
    }
  });

  test('skill expansion includes skill file listing but does not execute anything', () => {
    const skillPath = join(TEST_DIR, '.skills', 'qr-code');
    writeFileSync(join(skillPath, 'skill.md'), 'Generate a QR.');
    writeFileSync(join(skillPath, 'make_qr.py'), 'print("qr")');
    const result = expandInput('/qr-code', TEST_DIR);
    expect(result.kind).toBe('agent');
    if (result.kind === 'agent') {
      expect(result.prompt).toContain('Generate a QR.');
      expect(result.prompt).toContain('Files in skill');
      expect(result.prompt).toContain('make_qr.py');
    }
  });
});

describe('findCommand', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, '.prompts'), { recursive: true });
    mkdirSync(join(TEST_DIR, '.skills', 'qr-code'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  test('finds command file at .prompts/name.md', () => {
    writeFileSync(join(TEST_DIR, '.prompts', 'review.md'), 'Review code.');
    
    const result = findCommand('review', TEST_DIR);
    
    expect(result).not.toBeNull();
    expect(result!.type).toBe('command');
    expect(result!.content).toBe('Review code.');
  });

  test('finds skill at .skills/name/skill.md', () => {
    writeFileSync(join(TEST_DIR, '.skills', 'qr-code', 'skill.md'), 'Generate QR.');
    
    const result = findCommand('qr-code', TEST_DIR);
    
    expect(result).not.toBeNull();
    expect(result!.type).toBe('skill');
    expect(result!.content).toBe('Generate QR.');
  });

  test('returns null for nonexistent commands', () => {
    const result = findCommand('nonexistent', TEST_DIR);
    
    expect(result).toBeNull();
  });

  test('skill {{skill_path}} is replaced with actual path', () => {
    const skillPath = join(TEST_DIR, '.skills', 'qr-code');
    writeFileSync(join(skillPath, 'skill.md'), 'Run {{skill_path}}/script.py');
    
    const result = findCommand('qr-code', TEST_DIR);
    
    expect(result!.content).toContain(skillPath);
    expect(result!.content).not.toContain('{{skill_path}}');
  });

  test('skill files are listed', () => {
    const skillPath = join(TEST_DIR, '.skills', 'qr-code');
    writeFileSync(join(skillPath, 'skill.md'), 'Skill');
    writeFileSync(join(skillPath, 'make_qr.py'), '# Python');
    
    const result = findCommand('qr-code', TEST_DIR);
    
    expect(result!.skillFiles).toContain('make_qr.py');
  });
});

describe('listCommands', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, '.prompts'), { recursive: true });
    mkdirSync(join(TEST_DIR, '.skills', 'qr-code'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  test('returns all available commands and skills', () => {
    writeFileSync(join(TEST_DIR, '.prompts', 'review.md'), 'Review');
    writeFileSync(join(TEST_DIR, '.skills', 'qr-code', 'skill.md'), 'QR');
    
    const commands = listCommands(TEST_DIR);
    
    expect(commands).toContain('review');
    expect(commands).toContain('qr-code');
  });
});
```

## Simple Test Checklist

- [ ] `parseSlashCommand('/command')` returns name and empty rest
- [ ] `parseSlashCommand('/command text')` returns name and rest
- [ ] `parseSlashCommand('text')` returns null
- [ ] `findCommand('name')` finds `.prompts/name.md`
- [ ] `findCommand('name')` finds `.skills/name/skill.md`
- [ ] `findCommand('missing')` returns null
- [ ] Skill `{{skill_path}}` is replaced
- [ ] Skill files are listed in result
- [ ] `listCommands()` returns all commands and skills

---

# Phase 2: Simple Implementation

Implement this to make the tests pass.

## Core Implementation (~60 LOC)

```typescript
// src/commands/index.ts
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';

interface CommandResult {
  type: 'command' | 'skill';
  name: string;
  content: string;
  skillPath?: string;
  skillFiles?: string[];
}

type ExpandResult =
  | { kind: 'agent'; userText: string; prompt: string }
  | { kind: 'local'; userText: string; outputText: string; error?: boolean };

export function findCommand(name: string, workingDir: string = process.cwd()): CommandResult | null {
  const commandDirs = [
    join(workingDir, '.prompts'),
    join(homedir(), '.config', 'coding-agent', 'prompts'),
  ];
  
  const skillDirs = [
    join(workingDir, '.skills'),
    join(homedir(), '.config', 'coding-agent', 'skills'),
  ];

  // Check commands first
  for (const dir of commandDirs) {
    const path = join(dir, `${name}.md`);
    if (existsSync(path)) {
      return {
        type: 'command',
        name,
        content: readFileSync(path, 'utf-8'),
      };
    }
  }

  // Check skills
  for (const dir of skillDirs) {
    const skillPath = join(dir, name);
    const skillMdPath = join(skillPath, 'skill.md');
    if (existsSync(skillMdPath)) {
      const content = readFileSync(skillMdPath, 'utf-8');
      const files = listSkillFiles(skillPath);
      
      return {
        type: 'skill',
        name,
        content: content.replace(/\{\{skill_path\}\}/g, skillPath),
        skillPath,
        skillFiles: files,
      };
    }
  }

  return null;
}

function listSkillFiles(skillPath: string): string[] {
  const files: string[] = [];
  
  function walk(dir: string, prefix = '') {
    for (const entry of readdirSync(dir)) {
      if (entry === 'skill.md') continue;
      
      const fullPath = join(dir, entry);
      const relativePath = prefix ? `${prefix}/${entry}` : entry;
      
      if (statSync(fullPath).isDirectory()) {
        walk(fullPath, relativePath);
      } else {
        files.push(relativePath);
      }
    }
  }
  
  walk(skillPath);
  return files;
}

export function listCommands(workingDir: string = process.cwd()): string[] {
  const commands: string[] = [];
  
  const commandDirs = [
    join(workingDir, '.prompts'),
    join(homedir(), '.config', 'coding-agent', 'prompts'),
  ];
  
  const skillDirs = [
    join(workingDir, '.skills'),
    join(homedir(), '.config', 'coding-agent', 'skills'),
  ];
  
  for (const dir of commandDirs) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter(f => f.endsWith('.md'));
    commands.push(...files.map(f => f.replace('.md', '')));
  }
  
  for (const dir of skillDirs) {
    if (!existsSync(dir)) continue;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && existsSync(join(dir, entry.name, 'skill.md'))) {
        commands.push(entry.name);
      }
    }
  }
  
  return [...new Set(commands)];
}

export function parseSlashCommand(input: string): { name: string; rest: string } | null {
  if (!input.startsWith('/')) return null;
  
  const spaceIndex = input.indexOf(' ');
  if (spaceIndex === -1) {
    return { name: input.slice(1), rest: '' };
  }
  
  return {
    name: input.slice(1, spaceIndex),
    rest: input.slice(spaceIndex + 1),
  };
}

export function expandInput(input: string, workingDir: string = process.cwd()): ExpandResult {
  const parsed = parseSlashCommand(input);
  if (!parsed) return { kind: 'agent', userText: input, prompt: input };

  if (parsed.name === 'help') {
    const commands = listCommands(workingDir);
    const outputText =
      commands.length > 0
        ? `Available commands:\n${commands.map(c => `  /${c}`).join('\n')}`
        : 'No custom commands found. Add .md files to .prompts/';
    return { kind: 'local', userText: input, outputText };
  }

  const command = findCommand(parsed.name, workingDir);
  if (!command) {
    return {
      kind: 'local',
      userText: input,
      outputText: `Unknown command: /${parsed.name}. Type /help for available commands.`,
      error: true,
    };
  }

  let prompt = command.content;

  if (command.type === 'skill' && command.skillFiles && command.skillFiles.length > 0) {
    prompt += `\n\nFiles in skill (${command.skillPath}):\n`;
    prompt += command.skillFiles.map(f => `- ${f}`).join('\n');
  }

  if (parsed.rest) {
    prompt += `\n\n${parsed.rest}`;
  }

  return { kind: 'agent', userText: input, prompt };
}
```

## App.tsx Integration

```typescript
// src/components/App.tsx - Update handleSubmit
import { expandInput } from '../commands';

const handleSubmit = async (text: string) => {
  const expanded = expandInput(text);
  setMessages(prev => [...prev, { role: MessageRole.USER, content: expanded.userText }]);

  if (expanded.kind === 'local') {
    setMessages(prev => [...prev, { role: MessageRole.ASSISTANT, content: expanded.outputText }]);
    if (expanded.error) setError(expanded.outputText);
    return;
  }

  const response = await agent.chat(expanded.prompt);
};
```

## Simple Implementation Checklist

- [ ] Create `src/commands/index.ts`
- [ ] Implement `parseSlashCommand(input)`
- [ ] Implement `expandInput(input, workingDir)`
- [ ] Implement `findCommand(name, workingDir)`
- [ ] Check `.prompts/` for commands
- [ ] Check `.skills/` for skills
- [ ] Replace `{{skill_path}}` in skill content
- [ ] List skill files
- [ ] Implement `listCommands(workingDir)`
- [ ] Update App.tsx to intercept slash commands
- [ ] Handle `/help` built-in
- [ ] Handle unknown commands with error
- [ ] Ensure skills only expand prompts and never auto-run scripts

---

# Phase 3: Production Tests

After simple implementation works, add these tests for production features.

## Additional Test Files

```
tests/
  commands/
    registry.test.ts      # CommandRegistry tests
    parser.test.ts        # Input parsing tests
    executor.test.ts      # Command execution tests
```

## Frontmatter Parsing Tests

```typescript
// tests/commands/parser.test.ts
describe('frontmatter parsing', () => {
  test('extracts name from YAML frontmatter', () => {
    const content = `---
name: review
description: Code review prompt
---

Review this code.`;
    
    const { frontmatter, body } = parseFrontmatter(content);
    
    expect(frontmatter.name).toBe('review');
    expect(frontmatter.description).toBe('Code review prompt');
    expect(body).toBe('Review this code.');
  });

  test('handles files without frontmatter', () => {
    const content = 'Just content, no frontmatter.';
    
    const { frontmatter, body } = parseFrontmatter(content);
    
    expect(frontmatter).toEqual({});
    expect(body).toBe(content);
  });

  test('extracts parameters array', () => {
    const content = `---
parameters:
  - name: env
    required: true
  - name: dry_run
    default: "false"
---
Deploy.`;
    
    const { frontmatter } = parseFrontmatter(content);
    
    expect(frontmatter.parameters).toHaveLength(2);
  });
});
```

## Parameter Tests

```typescript
// tests/commands/executor.test.ts
describe('parameter handling', () => {
  test('parses key=value arguments', () => {
    const result = parseSlashCommand('/deploy env=staging');
    
    expect(result!.args).toEqual({ env: 'staging' });
  });

  test('parses quoted values with spaces', () => {
    const result = parseSlashCommand('/deploy env="my staging server"');
    
    expect(result!.args.env).toBe('my staging server');
  });

  test('substitutes {{param}} in content', () => {
    const content = 'Deploy to {{env}}.';
    const args = { env: 'staging' };
    
    const result = renderTemplate(content, args);
    
    expect(result).toBe('Deploy to staging.');
  });

  test('applies default values for missing params', () => {
    const params = [{ name: 'env', required: true }, { name: 'dry_run', default: 'false' }];
    const provided = { env: 'prod' };
    
    const resolved = resolveArgs(params, provided);
    
    expect(resolved.dry_run).toBe('false');
  });

  test('errors on missing required params', () => {
    const params = [{ name: 'env', required: true }];
    const provided = {};
    
    expect(() => resolveArgs(params, provided)).toThrow('env');
  });
});
```

## Conditional Template Tests

```typescript
describe('template conditionals', () => {
  test('{{#if param}}...{{/if}} includes when param present', () => {
    const content = '{{#if verbose}}Verbose output{{/if}}';
    const args = { verbose: 'true' };
    
    const result = renderTemplate(content, args);
    
    expect(result).toContain('Verbose output');
  });

  test('{{#if param}}...{{else}}...{{/if}} handles else', () => {
    const content = '{{#if verbose}}Verbose{{else}}Quiet{{/if}}';
    const args = {};
    
    const result = renderTemplate(content, args);
    
    expect(result).toBe('Quiet');
  });
});
```

## Fuzzy Search Tests

```typescript
describe('fuzzy search', () => {
  test('suggests similar commands for typos', () => {
    registry.add('review', { content: '...' });
    
    const suggestions = registry.search('revew');
    
    expect(suggestions.map(s => s.name)).toContain('review');
  });

  test('/help query filters results', () => {
    registry.add('review', { description: 'Code review' });
    registry.add('deploy', { description: 'Deploy app' });
    
    const results = registry.search('review');
    
    expect(results.map(r => r.name)).toContain('review');
    expect(results.map(r => r.name)).not.toContain('deploy');
  });
});
```

## Production Test Checklist

- [ ] Frontmatter parsing extracts name/description
- [ ] Frontmatter parsing extracts parameters array
- [ ] Files without frontmatter use filename as name
- [ ] `key=value` arguments parsed from input
- [ ] Quoted values with spaces handled
- [ ] `{{param}}` substituted in content
- [ ] Default values applied
- [ ] Missing required params throw error
- [ ] `{{#if}}` conditionals work
- [ ] `{{else}}` branch works
- [ ] Fuzzy search finds partial matches
- [ ] Help filters by query

---

# Phase 4: Production Implementation

Implement after production tests are written.

## Dependencies

```bash
bun add yaml fuse.js
```

## Architecture

```
src/
  commands/
    registry.ts       # Unified discovery
    parser.ts         # Frontmatter and input parsing
    executor.ts       # Command execution with templates
    types.ts          # Shared types
    index.ts          # Barrel export
```

## Types

```typescript
// src/commands/types.ts
export interface Parameter {
  name: string;
  description?: string;
  required?: boolean;
  default?: string;
}

export interface BaseCommand {
  name: string;
  description: string;
  parameters: Parameter[];
  source: 'project' | 'global';
  path: string;
}

export interface SimpleCommand extends BaseCommand {
  type: 'command';
  content: string;
}

export interface Skill extends BaseCommand {
  type: 'skill';
  content: string;
  skillPath: string;
  files: string[];
}

export type Command = SimpleCommand | Skill;

export interface ParsedInput {
  name: string;
  args: Record<string, string>;
  rest: string;
}
```

## CommandRegistry

```typescript
// src/commands/registry.ts
import Fuse from 'fuse.js';
import yaml from 'yaml';
import { Command } from './types';

export class CommandRegistry {
  private commands = new Map<string, Command>();
  private searchIndex: Fuse<Command>;

  async initialize(workingDir: string): Promise<void> {
    // Load from .prompts/ and .skills/
    // Build fuzzy search index
    this.searchIndex = new Fuse(Array.from(this.commands.values()), {
      keys: ['name', 'description'],
      threshold: 0.4,
    });
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  search(query: string): Command[] {
    return this.searchIndex.search(query).map(r => r.item);
  }

  list(): Command[] {
    return Array.from(this.commands.values());
  }
}
```

## Input Parser

```typescript
// src/commands/parser.ts
export function parseSlashCommand(input: string): ParsedInput | null {
  if (!input.startsWith('/')) return null;

  const trimmed = input.slice(1).trim();
  if (!trimmed) return null;

  const firstSpace = trimmed.indexOf(' ');
  const name = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
  const remainder = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1);

  const tokens = tokenize(remainder);
  const args: Record<string, string> = {};
  const restTokens: string[] = [];

  for (const token of tokens) {
    const eqIndex = token.indexOf('=');
    if (eqIndex > 0) {
      const key = token.slice(0, eqIndex);
      const value = token.slice(eqIndex + 1);
      args[key] = value;
      continue;
    }
    restTokens.push(token);
  }

  return { name, args, rest: restTokens.join(' ') };
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && /\s/.test(ch)) {
      if (current.length > 0) tokens.push(current);
      current = '';
      continue;
    }
    current += ch;
  }

  if (current.length > 0) tokens.push(current);
  return tokens;
}

export function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!match) return { frontmatter: {}, body: content };
  
  try {
    return { frontmatter: yaml.parse(match[1]), body: match[2].trim() };
  } catch {
    return { frontmatter: {}, body: content };
  }
}
```

## CommandExecutor

```typescript
// src/commands/executor.ts
export class CommandExecutor {
  constructor(private registry: CommandRegistry) {}

  execute(input: string): ExecuteResult {
    const parsed = parseSlashCommand(input);
    if (!parsed) return { type: 'not_command' };
    
    if (parsed.name === 'help') {
      return this.handleHelp(parsed.rest);
    }
    
    const command = this.registry.get(parsed.name);
    
    if (!command) {
      const suggestions = this.registry.search(parsed.name).slice(0, 3);
      return {
        type: 'error',
        message: `Unknown command: /${parsed.name}`,
        suggestions: suggestions.map(s => s.name),
      };
    }
    
    const resolvedArgs = this.resolveArgs(command.parameters, parsed.args);
    const prompt = this.renderTemplate(command, resolvedArgs, parsed.rest);
    
    return { type: 'success', prompt, command };
  }

  private renderTemplate(command: Command, args: Record<string, string>, rest: string): string {
    let content = command.content;
    
    // Substitute {{variable}}
    content = content.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      if (name === 'skill_path' && command.type === 'skill') return command.skillPath;
      return args[name] ?? '';
    });
    
    // Handle {{#if var}}...{{else}}...{{/if}}
    content = content.replace(
      /\{\{#if (\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
      (_, name, ifContent, elseContent = '') => args[name] ? ifContent.trim() : elseContent.trim()
    );
    
    if (rest) content += `\n\n${rest}`;
    
    return content.trim();
  }
}
```

## Production Implementation Checklist

### Registry
- [ ] Create `CommandRegistry` class
- [ ] Load from `.prompts/` and `.skills/`
- [ ] Load from global config directory
- [ ] Parse YAML frontmatter
- [ ] Build fuzzy search index
- [ ] Project takes precedence over global

### Input Parsing
- [ ] Parse `key=value` arguments
- [ ] Handle quoted values with spaces
- [ ] Capture remaining text as rest

### Execution
- [ ] Validate required parameters
- [ ] Apply default values
- [ ] Substitute `{{variable}}`
- [ ] Handle `{{#if}}` conditionals

### Help System
- [ ] `/help` lists all commands
- [ ] `/help query` filters by search
- [ ] Show parameters (required vs optional)
- [ ] Show descriptions

