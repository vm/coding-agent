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

    it('does not truncate edit_file results', () => {
      const result = 'File edited successfully';
      const { lastFrame } = render(
        <TranscriptView
          messages={[]}
          toolCalls={[{
            name: ToolName.EDIT_FILE,
            input: { path: 'test.ts', old_str: 'old', new_str: 'new' },
            status: ToolCallStatus.DONE,
            result,
          }]}
          isLoading={false}
          error={null}
          width={80}
          height={24}
        />
      );

      expect(lastFrame()).toContain(result);
      expect(lastFrame()).not.toContain('truncated');
    });
  });
});
