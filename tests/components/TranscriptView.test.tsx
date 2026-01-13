import { describe, it, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { TranscriptView } from '../../src/components/TranscriptView';
import { MessageRole, ToolCallStatus, ToolName } from '../../src/agent/types';


describe('TranscriptView', () => {
  it('renders a descriptive tool call label with the command', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[{
          name: ToolName.RUN_COMMAND,
          input: { command: 'bun test' },
          status: ToolCallStatus.DONE,
        }]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
      />
    );

    expect(lastFrame()).toContain('run command: bun test (done)');
  });

  it('truncates long commands', () => {
    const longCommand = 'git commit -m "This is a very long commit message that should be truncated because it exceeds sixty characters"';
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[{
          name: ToolName.RUN_COMMAND,
          input: { command: longCommand },
          status: ToolCallStatus.RUNNING,
        }]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
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
        toolCalls={[{
          name: ToolName.READ_FILE,
          input: { path: 'src/agent/types.ts' },
          status: ToolCallStatus.DONE,
        }]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
      />
    );

    expect(lastFrame()).toContain('read file: types.ts (done)');
  });

  it('renders a descriptive tool call label with a filename for edit_file', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[{
          name: ToolName.EDIT_FILE,
          input: { path: 'src/components/App.tsx', old_str: 'old', new_str: 'new' },
          status: ToolCallStatus.RUNNING,
        }]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
      />
    );

    expect(lastFrame()).toContain('edit file: App.tsx (running)');
  });

  it('renders directory path for list_files', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[{
          name: ToolName.LIST_FILES,
          input: { path: 'src/tools' },
          status: ToolCallStatus.DONE,
        }]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
      />
    );

    expect(lastFrame()).toContain('list files: src/tools (done)');
  });

  it('renders ./ for list_files with current directory', () => {
    const { lastFrame } = render(
      <TranscriptView
        messages={[]}
        toolCalls={[{
          name: ToolName.LIST_FILES,
          input: { path: '.' },
          status: ToolCallStatus.DONE,
        }]}
        isLoading={false}
        error={null}
        width={80}
        height={24}
      />
    );

    expect(lastFrame()).toContain('list files: ./ (done)');
  });

  describe('result truncation', () => {
    it('truncates read_file results to 50 lines', () => {
      const manyLines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join('\n');
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[{
            name: ToolName.READ_FILE,
            input: { path: 'test.ts' },
            status: ToolCallStatus.DONE,
            result: manyLines,
          }]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
        />
      );

      expect(lastFrame()).toContain('line 50');
      expect(lastFrame()).not.toContain('line 51');
      expect(lastFrame()).toContain('truncated, showing 50 of 100 lines');
    });

    it('does not truncate read_file results with 50 or fewer lines', () => {
      const fewLines = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n');
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[{
            name: ToolName.READ_FILE,
            input: { path: 'test.ts' },
            status: ToolCallStatus.DONE,
            result: fewLines,
          }]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
        />
      );

      expect(lastFrame()).toContain('line 30');
      expect(lastFrame()).not.toContain('truncated');
    });

    it('truncates run_command results to 100 lines', () => {
      const manyLines = Array.from({ length: 150 }, (_, i) => `output ${i + 1}`).join('\n');
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[{
            name: ToolName.RUN_COMMAND,
            input: { command: 'test' },
            status: ToolCallStatus.DONE,
            result: manyLines,
          }]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
        />
      );

      expect(lastFrame()).toContain('output 100');
      expect(lastFrame()).not.toContain('output 101');
      expect(lastFrame()).toContain('truncated, showing 100 of 150 lines');
    });

    it('does not truncate list_files results', () => {
      const manyLines = Array.from({ length: 200 }, (_, i) => `file${i}.ts`).join('\n');
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[{
            name: ToolName.LIST_FILES,
            input: { path: '.' },
            status: ToolCallStatus.DONE,
            result: manyLines,
          }]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
        />
      );

      expect(lastFrame()).toContain('file199');
      expect(lastFrame()).not.toContain('truncated');
    });

    it('shows diff for edit_file results', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[{
            name: ToolName.EDIT_FILE,
            input: { path: 'test.ts', old_str: 'old', new_str: 'new' },
            status: ToolCallStatus.DONE,
            result: 'Updated file "test.ts"',
          }]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
        />
      );

      expect(lastFrame()).toContain('- old');
      expect(lastFrame()).toContain('+ new');
      expect(lastFrame()).not.toContain('truncated');
    });

    it('truncates large edit_file diffs', () => {
      const oldLines = Array.from({ length: 60 }, (_, i) => `old line ${i + 1}`).join('\n');
      const newLines = Array.from({ length: 60 }, (_, i) => `new line ${i + 1}`).join('\n');
      const { frames } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[{
            name: ToolName.EDIT_FILE,
            input: { path: 'test.ts', old_str: oldLines, new_str: newLines },
            status: ToolCallStatus.DONE,
            result: 'Updated file "test.ts"',
          }]}
          isLoading={false}
          error={null}
          width={80}
          height={200}
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
          toolCalls={[{
            name: ToolName.EDIT_FILE,
            input: { path: 'new.ts', old_str: '', new_str: 'const x = 1;' },
            status: ToolCallStatus.DONE,
            result: 'Created file "new.ts"',
          }]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
        />
      );

      const output = lastFrame();
      expect(output).toContain('+ const x = 1;');
      if (output) {
        const lines = output.split('\n');
        const contentLines = lines.filter(l => l.startsWith('- ') || l.startsWith('+ ') || l.startsWith('  '));
        expect(contentLines.every(l => !l.startsWith('- '))).toBe(true);
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
        />
      );

      expect(lastFrame()).toContain('thinking');
    });

    it('does not show thinking when tool calls are present', () => {
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[{
            name: ToolName.READ_FILE,
            input: { path: 'test.ts' },
            status: ToolCallStatus.RUNNING,
          }]}
          isLoading={true}
          thinkingStartTime={Date.now()}
          error={null}
          width={80}
          height={24}
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
          toolCalls={[{
            name: ToolName.READ_FILE,
            input: { path: 'config.ts' },
            status: ToolCallStatus.DONE,
            result: 'export const config = {\n  port: 3000,\n};',
          }]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
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
          toolCalls={[{
            name: ToolName.RUN_COMMAND,
            input: { command: 'bun test' },
            status: ToolCallStatus.DONE,
            result: 'Running tests...\nAll tests passed',
          }]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
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
          toolCalls={[{
            name: ToolName.READ_FILE,
            input: { path: 'empty.ts' },
            status: ToolCallStatus.DONE,
            result: '',
          }]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
        />
      );

      const output = lastFrame();
      expect(output).toContain('── read file: empty.ts');
      expect(output).toContain('│');
    });

    it('truncates long command names in header', () => {
      const longCommand = 'bun test --verbose --coverage --watch --reporter=verbose --timeout=5000';
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[{
            name: ToolName.RUN_COMMAND,
            input: { command: longCommand },
            status: ToolCallStatus.DONE,
            result: 'output',
          }]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
        />
      );

      const output = lastFrame();
      expect(output).toContain('── run command:');
      expect(output).toContain('…');
    });
  });
});
