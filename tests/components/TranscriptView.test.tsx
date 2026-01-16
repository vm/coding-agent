import { describe, it, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { TranscriptView } from '../../src/components/TranscriptView';
import { MessageRole, ToolCallStatus, ToolName } from '../../src/shared/types';

describe('TranscriptView', () => {
  it('renders error status for tool calls', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[
          {
            name: ToolName.READ_FILE,
            input: { path: 'test.ts' },
            status: ToolCallStatus.ERROR,
            result: 'Error: missing file',
          },
        ]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
        collapsed={true}
      />
    );

    expect(lastFrame()).toContain('(error)');
  });

  it('renders user messages with a you prefix and wraps text', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[{ role: MessageRole.USER, content: 'hello world' }]}
        toolCalls={[]}
        isLoading={false}
        error={null}
        width={6}
        height={24}
        collapsed={true}
      />
    );

    const output = lastFrame();
    expect(output).toContain('you he');
    expect(output).toContain('llo wo');
  });

  it('renders assistant messages and preserves explicit newlines', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[{ role: MessageRole.ASSISTANT, content: 'line1\nline2' }]}
        toolCalls={[]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
        collapsed={true}
      />
    );

    const output = lastFrame();
    expect(output).toContain('line1');
    expect(output).toContain('line2');
  });

  it('renders error text when error prop is set', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[]}
        isLoading={false}
        error={'Something went wrong'}
        width={80}
        height={24}
        collapsed={true}
      />
    );

    expect(lastFrame()).toContain('error: Something went wrong');
  });

  it('appends afterAssistant content after main transcript', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[{ role: MessageRole.ASSISTANT, content: 'first' }]}
        afterAssistant={{ role: MessageRole.ASSISTANT, content: 'second' }}
        toolCalls={[]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
        collapsed={true}
      />
    );

    const output = lastFrame();
    expect(output).toContain('first');
    expect(output).toContain('second');
  });

  it('renders a descriptive tool call label with the command', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[
          {
            name: ToolName.RUN_COMMAND,
            input: { command: 'bun test' },
            status: ToolCallStatus.DONE,
          },
        ]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
        collapsed={true}
      />
    );

    expect(lastFrame()).toContain('run command: bun test (done)');
  });

  it('truncates long commands', () => {
    const longCommand =
      'git commit -m "This is a very long commit message that should be truncated because it exceeds sixty characters"';
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[
          {
            name: ToolName.RUN_COMMAND,
            input: { command: longCommand },
            status: ToolCallStatus.RUNNING,
          },
        ]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
        collapsed={true}
      />
    );

    expect(lastFrame()).toContain('run command:');
    expect(lastFrame()).toContain('…');
    expect(lastFrame()).not.toContain('truncated');
  });

  it('renders a descriptive tool call label with a filename for read_file', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[
          {
            name: ToolName.READ_FILE,
            input: { path: 'src/agent/types.ts' },
            status: ToolCallStatus.DONE,
          },
        ]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
        collapsed={true}
      />
    );

    expect(lastFrame()).toContain('read file: types.ts (done)');
  });

  it('renders a descriptive tool call label with a filename for edit_file', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[
          {
            name: ToolName.EDIT_FILE,
            input: {
              path: 'src/components/App.tsx',
              old_str: 'old',
              new_str: 'new',
            },
            status: ToolCallStatus.RUNNING,
          },
        ]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
        collapsed={true}
      />
    );

    expect(lastFrame()).toContain('edit file: App.tsx (running)');
  });

  it('renders directory path for list_files', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[
          {
            name: ToolName.LIST_FILES,
            input: { path: 'src/tools' },
            status: ToolCallStatus.DONE,
          },
        ]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
        collapsed={true}
      />
    );

    expect(lastFrame()).toContain('list files: src/tools (done)');
  });

  it('renders ./ for list_files with current directory', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[
          {
            name: ToolName.LIST_FILES,
            input: { path: '.' },
            status: ToolCallStatus.DONE,
          },
        ]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
        collapsed={true}
      />
    );

    expect(lastFrame()).toContain('list files: ./ (done)');
  });

  describe('result truncation', () => {
    it('truncates read_file results to 50 lines', () => {
      const manyLines = Array.from(
        { length: 100 },
        (_, i) => `line ${i + 1}`
      ).join('\n');
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'test.ts' },
              status: ToolCallStatus.DONE,
              result: manyLines,
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={false}
        />
      );

      expect(lastFrame()).toContain('line 50');
      expect(lastFrame()).not.toContain('line 51');
      expect(lastFrame()).toContain('truncated, showing 50 of 100 lines');
    });

    it('does not truncate read_file results with 50 or fewer lines', () => {
      const fewLines = Array.from(
        { length: 30 },
        (_, i) => `line ${i + 1}`
      ).join('\n');
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'test.ts' },
              status: ToolCallStatus.DONE,
              result: fewLines,
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={false}
        />
      );

      expect(lastFrame()).toContain('line 30');
      expect(lastFrame()).not.toContain('truncated');
    });

    it('truncates run_command results to 100 lines', () => {
      const manyLines = Array.from(
        { length: 150 },
        (_, i) => `output ${i + 1}`
      ).join('\n');
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.RUN_COMMAND,
              input: { command: 'test' },
              status: ToolCallStatus.DONE,
              result: manyLines,
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={false}
        />
      );

      expect(lastFrame()).toContain('output 100');
      expect(lastFrame()).not.toContain('output 101');
      expect(lastFrame()).toContain('truncated, showing 100 of 150 lines');
    });

    it('does not truncate list_files results', () => {
      const manyLines = Array.from(
        { length: 200 },
        (_, i) => `file${i}.ts`
      ).join('\n');
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.LIST_FILES,
              input: { path: '.' },
              status: ToolCallStatus.DONE,
              result: manyLines,
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={false}
        />
      );

      expect(lastFrame()).toContain('file199');
      expect(lastFrame()).not.toContain('truncated');
    });

    it('shows diff for edit_file results', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.EDIT_FILE,
              input: { path: 'test.ts', old_str: 'old', new_str: 'new' },
              status: ToolCallStatus.DONE,
              result: 'Updated file "test.ts"',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={false}
        />
      );

      expect(lastFrame()).toContain('- old');
      expect(lastFrame()).toContain('+ new');
      expect(lastFrame()).not.toContain('truncated');
    });

    it('truncates large edit_file diffs', () => {
      const oldLines = Array.from(
        { length: 60 },
        (_, i) => `old line ${i + 1}`
      ).join('\n');
      const newLines = Array.from(
        { length: 60 },
        (_, i) => `new line ${i + 1}`
      ).join('\n');
      const { frames } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.EDIT_FILE,
              input: { path: 'test.ts', old_str: oldLines, new_str: newLines },
              status: ToolCallStatus.DONE,
              result: 'Updated file "test.ts"',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={200}
          collapsed={false}
        />
      );

      const fullOutput = frames.join('\n');
      expect(fullOutput).toContain('- old line 1');
      expect(fullOutput).toContain('- old line 25');
      expect(fullOutput).toContain('+ new line 1');
      expect(fullOutput).toContain('+ new line 25');
      expect(fullOutput).toMatch(/truncated.*\d+.*of.*\d+/);
    });

    it('shows new content with + prefix for file creation', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.EDIT_FILE,
              input: { path: 'new.ts', old_str: '', new_str: 'const x = 1;' },
              status: ToolCallStatus.DONE,
              result: 'Created file "new.ts"',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={false}
        />
      );

      const output = lastFrame();
      expect(output).toContain('+ const x = 1;');
      if (output) {
        const lines = output.split('\n');
        const contentLines = lines.filter(
          (l) => l.startsWith('- ') || l.startsWith('+ ') || l.startsWith('  ')
        );
        expect(contentLines.every((l) => !l.startsWith('- '))).toBe(true);
      }
    });
  });

  describe('thinking indicator', () => {
    it('shows thinking text when loading', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[]}
          isLoading={true}
          thinkingStartTime={Date.now()}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      expect(lastFrame()).toContain('thinking');
    });

    it('shows elapsed seconds when thinkingStartTime is set', async () => {
      const thinkingStartTime = Date.now() - 5000;
      const { stdout } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[]}
          isLoading={true}
          thinkingStartTime={thinkingStartTime}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(stdout.frames.join('\n')).toContain('Thinking for 5s');
    });

    it('does not show thinking when tool calls are present', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'test.ts' },
              status: ToolCallStatus.RUNNING,
            },
          ]}
          isLoading={true}
          thinkingStartTime={Date.now()}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      expect(lastFrame()).not.toContain('Thinking');
    });

    it('does not show thinking when not loading', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[]}
          isLoading={false}
          thinkingStartTime={null}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      expect(lastFrame()).not.toContain('Thinking');
    });
  });

  describe('styled code blocks', () => {
    it('renders read_file results in bordered block', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'config.ts' },
              status: ToolCallStatus.DONE,
              result: 'export const config = {\n  port: 3000,\n};',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={false}
        />
      );

      const output = lastFrame();
      expect(output).toContain('── read file: config.ts');
      expect(output).toContain('│ export const config = {');
      expect(output).toContain('│   port: 3000,');
      expect(output).toMatch(/─+/);
    });

    it('renders run_command results in bordered block', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.RUN_COMMAND,
              input: { command: 'bun test' },
              status: ToolCallStatus.DONE,
              result: 'Running tests...\nAll tests passed',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={false}
        />
      );

      const output = lastFrame();
      expect(output).toContain('── run command: bun test');
      expect(output).toContain('│ $ bun test');
      expect(output).toContain('│ Running tests...');
      expect(output).toContain('│ All tests passed');
      expect(output).toMatch(/─+/);
    });

    it('handles empty content in code block', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'empty.ts' },
              status: ToolCallStatus.DONE,
              result: '',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={false}
        />
      );

      const output = lastFrame();
      expect(output).toContain('── read file: empty.ts');
      expect(output).toContain('│');
    });

    it('handles empty run_command content in code block', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.RUN_COMMAND,
              input: { command: 'bun test' },
              status: ToolCallStatus.DONE,
              result: '',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={false}
        />
      );

      const output = lastFrame();
      expect(output).toContain('── run command: bun test');
      expect(output).toContain('│ $ bun test');
      expect(output).toContain('│');
    });

    it('truncates long command names in header', () => {
      const longCommand =
        'bun test --verbose --coverage --watch --reporter=verbose --timeout=5000';
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.RUN_COMMAND,
              input: { command: longCommand },
              status: ToolCallStatus.DONE,
              result: 'output',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={false}
        />
      );

      const output = lastFrame();
      expect(output).toContain('── run command:');
      expect(output).toContain('…');
    });
  });

  it('renders edit_file tool results as plain text when diff input is missing', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[
          {
            name: ToolName.EDIT_FILE,
            input: { path: 'test.ts' },
            status: ToolCallStatus.DONE,
            result: 'Updated file "test.ts"',
          },
        ]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
        collapsed={false}
      />
    );

    expect(lastFrame()).toContain('Updated file "test.ts"');
  });

  it('renders edit_file diff footer line', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[
          {
            name: ToolName.EDIT_FILE,
            input: { path: 'test.ts', old_str: 'old', new_str: 'new' },
            status: ToolCallStatus.DONE,
            result: 'Updated file "test.ts"',
          },
        ]}
        isLoading={false}
        error={null}
        width={80}
        height={40}
        collapsed={false}
      />
    );

    expect(lastFrame()).toContain('─'.repeat(60));
  });

  it('renders edit_file diff context lines', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[
          {
            name: ToolName.EDIT_FILE,
            input: {
              path: 'test.ts',
              old_str: 'same\nold',
              new_str: 'same\nnew',
            },
            status: ToolCallStatus.DONE,
            result: 'Updated file "test.ts"',
          },
        ]}
        isLoading={false}
        error={null}
        width={80}
        height={40}
        collapsed={false}
      />
    );

    expect(lastFrame()).toContain('  same');
  });

  describe('formatted text rendering', () => {
    it('wraps continuation segments at full width', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[{ role: MessageRole.ASSISTANT, content: 'AAABBBCCCDDDEEEFFFGGG' }]}
          toolCalls={[]}
          isLoading={false}
          error={null}
          width={10}
          height={24}
          collapsed={true}
        />
      );

      const output = lastFrame();
      const lines = output?.split('\n').filter(l => l.trim()) ?? [];
      expect(lines[0]).toBe('AAABBBCCCD');
      expect(lines[1]).toBe('DDEEEFFFGG');
      expect(lines[2]).toBe('G');
    });

    it('resets formatting state between markdown parts', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[{ role: MessageRole.ASSISTANT, content: '**bold** normal' }]}
          toolCalls={[]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('bold');
      expect(output).toContain('normal');
    });

    it('does not bleed bold formatting to subsequent parts on same line', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[{ role: MessageRole.ASSISTANT, content: '**B** N' }]}
          toolCalls={[]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('B');
      expect(output).toContain('N');
    });
  });

  describe('collapsed state', () => {
    it('shows collapse indicator when collapsed', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'test.ts' },
              status: ToolCallStatus.DONE,
              result: 'file content',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      expect(lastFrame()).toContain('▶');
      expect(lastFrame()).not.toContain('▼');
    });

    it('shows expand indicator when expanded', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'test.ts' },
              status: ToolCallStatus.DONE,
              result: 'file content',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={false}
        />
      );

      expect(lastFrame()).toContain('▼');
      expect(lastFrame()).not.toContain('▶');
    });

    it('hides result content when collapsed', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'test.ts' },
              status: ToolCallStatus.DONE,
              result: 'file content here',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('read file: test.ts (done)');
      expect(output).not.toContain('file content here');
    });

    it('shows result content when expanded', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'test.ts' },
              status: ToolCallStatus.DONE,
              result: 'file content here',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={false}
        />
      );

      const output = lastFrame();
      expect(output).toContain('read file: test.ts (done)');
      expect(output).toContain('file content here');
    });

    it('applies collapsed state to all tool calls', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'file1.ts' },
              status: ToolCallStatus.DONE,
              result: 'content 1',
            },
            {
              name: ToolName.EDIT_FILE,
              input: { path: 'file2.ts', old_str: 'old', new_str: 'new' },
              status: ToolCallStatus.DONE,
              result: 'Updated',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('▶ read file: file1.ts (done)');
      expect(output).toContain('▶ edit file: file2.ts (done)');
      expect(output).not.toContain('content 1');
      expect(output).not.toContain('- old');
      expect(output).not.toContain('+ new');
    });

    it('works with read_file tool type', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'test.ts' },
              status: ToolCallStatus.DONE,
              result: 'content',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      expect(lastFrame()).toContain('▶ read file: test.ts (done)');
      expect(lastFrame()).not.toContain('content');
    });

    it('works with edit_file tool type', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.EDIT_FILE,
              input: { path: 'test.ts', old_str: 'old', new_str: 'new' },
              status: ToolCallStatus.DONE,
              result: 'Updated',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      expect(lastFrame()).toContain('▶ edit file: test.ts (done)');
      expect(lastFrame()).not.toContain('- old');
      expect(lastFrame()).not.toContain('+ new');
    });

    it('works with run_command tool type', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.RUN_COMMAND,
              input: { command: 'bun test' },
              status: ToolCallStatus.DONE,
              result: 'test output',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      expect(lastFrame()).toContain('▶ run command: bun test (done)');
      expect(lastFrame()).not.toContain('test output');
    });

    it('works with list_files tool type', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.LIST_FILES,
              input: { path: '.' },
              status: ToolCallStatus.DONE,
              result: 'file1.ts\nfile2.ts',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      expect(lastFrame()).toContain('▶ list files: ./ (done)');
      expect(lastFrame()).not.toContain('file1.ts');
      expect(lastFrame()).not.toContain('file2.ts');
    });

    it('works with running status', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'test.ts' },
              status: ToolCallStatus.RUNNING,
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      expect(lastFrame()).toContain('▶ read file: test.ts (running)');
    });

    it('works with done status', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'test.ts' },
              status: ToolCallStatus.DONE,
              result: 'content',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      expect(lastFrame()).toContain('▶ read file: test.ts (done)');
    });

    it('works with error status', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[
            {
              name: ToolName.READ_FILE,
              input: { path: 'test.ts' },
              status: ToolCallStatus.ERROR,
              result: 'Error message',
            },
          ]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
          collapsed={true}
        />
      );

      expect(lastFrame()).toContain('▶ read file: test.ts (error)');
      expect(lastFrame()).not.toContain('Error message');
    });
  });
});
