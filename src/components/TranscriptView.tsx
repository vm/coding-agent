import { MessageRole, ToolCallStatus, ToolName } from '../shared/types';
import {
  formatToolCallName,
  formatToolCallTarget,
  generateUnifiedDiff,
  getFileName,
} from '../shared/tool-formatting';
import { TranscriptLines } from './TranscriptLines';
import type { TranscriptLine } from '../shared/types';
import { useThinkingElapsedSeconds } from '../hooks/useThinkingElapsedSeconds';
import { useTheme } from './ThemeProvider';
import type { Theme } from '../shared/themes';

type MessageItem = {
  role: MessageRole;
  content: string;
};

type ToolCallItem = {
  id?: string;
  name: string;
  input?: Record<string, unknown>;
  status: ToolCallStatus;
  result?: string;
};

const READ_FILE_MAX_LINES = 50;
const RUN_COMMAND_MAX_LINES = 100;

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

function wrapLine(line: string, width: number): string[] {
  if (width <= 0) return [''];
  if (line.length <= width) return [line];
  const out: string[] = [];
  for (let i = 0; i < line.length; i += width) {
    out.push(line.slice(i, i + width));
  }
  return out;
}

function wrapText(text: string, width: number): string[] {
  const logicalLines = splitLines(text);
  const out: string[] = [];
  for (const l of logicalLines) {
    out.push(...wrapLine(l, width));
  }
  return out;
}

function toolStatusLabel(status: ToolCallStatus): string {
  switch (status) {
    case ToolCallStatus.RUNNING:
      return 'running';
    case ToolCallStatus.DONE:
      return 'done';
    case ToolCallStatus.ERROR:
      return 'error';
  }
}

function toolStatusColor(status: ToolCallStatus, theme: Theme): string {
  switch (status) {
    case ToolCallStatus.RUNNING:
      return theme.toolStatus.running;
    case ToolCallStatus.DONE:
      return theme.toolStatus.done;
    case ToolCallStatus.ERROR:
      return theme.toolStatus.error;
  }
}

function formatEditFileDiff(input?: Record<string, unknown>): string | null {
  if (!input) return null;

  const oldStr = input.old_str as string | undefined;
  const newStr = input.new_str as string | undefined;
  const path = input.path as string | undefined;

  if (oldStr === undefined || newStr === undefined) return null;

  const filename = path ? getFileName(path) : 'file';
  const diffLines = generateUnifiedDiff(oldStr, newStr, filename);
  return diffLines.join('\n');
}

function truncateToolResult(
  name: string,
  result: string,
  input?: Record<string, unknown>
): string {
  if (name === ToolName.EDIT_FILE) {
    const diff = formatEditFileDiff(input);
    return diff || result;
  }

  const lines = result.split('\n');
  const totalLines = lines.length;

  let maxLines: number;
  switch (name) {
    case ToolName.READ_FILE:
      maxLines = READ_FILE_MAX_LINES;
      break;
    case ToolName.RUN_COMMAND:
      maxLines = RUN_COMMAND_MAX_LINES;
      break;
    case ToolName.LIST_FILES:
    default:
      return result;
  }

  if (totalLines <= maxLines) {
    return result;
  }

  const truncated = lines.slice(0, maxLines).join('\n');
  return `${truncated}\n\n... (truncated, showing ${maxLines} of ${totalLines} lines)`;
}

function parseDiffLine(line: string, width: number, theme: Theme): TranscriptLine[] {
  const lines: TranscriptLine[] = [];

  if (line.startsWith('@@')) {
    const wrapped = wrapLine(line, width);
    for (const w of wrapped) {
      lines.push({ text: w, color: theme.diff.hunkHeader, dimColor: false });
    }
  } else if (/^─+$/.test(line)) {
    const wrapped = wrapLine(line, width);
    for (const w of wrapped) {
      lines.push({ text: w, color: theme.diff.separator, dimColor: true });
    }
  } else if (line.startsWith('──')) {
    const wrapped = wrapLine(line, width);
    for (const w of wrapped) {
      lines.push({ text: w, color: theme.diff.separator, dimColor: true });
    }
  } else if (line.startsWith('- ')) {
    const wrapped = wrapLine(line, width);
    for (const w of wrapped) {
      lines.push({ text: w, color: theme.diff.deletion, dimColor: true });
    }
  } else if (line.startsWith('+ ')) {
    const wrapped = wrapLine(line, width);
    for (const w of wrapped) {
      lines.push({ text: w, color: theme.diff.addition });
    }
  } else if (line.startsWith('  ')) {
    const wrapped = wrapLine(line, width);
    for (const w of wrapped) {
      lines.push({ text: w, color: theme.diff.context, dimColor: true });
    }
  } else if (line.includes('truncated')) {
    const wrapped = wrapLine(line, width);
    for (const w of wrapped) {
      lines.push({ text: w, color: theme.diff.truncated, dimColor: true });
    }
  } else {
    const wrapped = wrapLine(line, width);
    for (const w of wrapped) {
      lines.push({ text: w, color: theme.diff.context });
    }
  }

  return lines;
}

function renderCodeBlock(
  title: string,
  content: string,
  width: number,
  contentColor: string,
  dimColor: boolean,
  theme: Theme
): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  const headerWidth = Math.min(60, width);
  const titlePart = `── ${title} `;
  const remainingWidth = Math.max(0, headerWidth - titlePart.length);
  const headerLine = titlePart + '─'.repeat(remainingWidth);
  lines.push({ text: headerLine, color: theme.codeBlock.border, dimColor: true });

  const contentLines = splitLines(content);
  const borderWidth = Math.min(width, headerWidth);

  if (
    contentLines.length === 0 ||
    (contentLines.length === 1 && contentLines[0] === '')
  ) {
    lines.push({ text: '│', color: theme.codeBlock.border, dimColor: true });
  } else {
    for (const logicalLine of contentLines) {
      const wrapped = wrapLine(logicalLine, borderWidth - 2);
      for (const w of wrapped) {
        const borderedLine = `│ ${w}`;
        lines.push({ text: borderedLine, color: contentColor, dimColor });
      }
    }
  }

  const footerLine = '─'.repeat(borderWidth);
  lines.push({ text: footerLine, color: theme.codeBlock.border, dimColor: true });

  return lines;
}

function parseToolResultLines(
  text: string,
  toolName: string,
  width: number,
  input: Record<string, unknown> | undefined,
  theme: Theme
): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  const logicalLines = splitLines(text);

  if (toolName === ToolName.EDIT_FILE) {
    for (const logicalLine of logicalLines) {
      const diffLines = parseDiffLine(logicalLine, width, theme);
      lines.push(...diffLines);
    }
  } else if (toolName === ToolName.READ_FILE) {
    const path = input?.path as string | undefined;
    const filename = path ? getFileName(path) : 'file';
    const title = `read file: ${filename}`;
    return renderCodeBlock(title, text, width, theme.codeBlock.content, true, theme);
  } else if (toolName === ToolName.RUN_COMMAND) {
    const command = input?.command as string | undefined;
    const commandText = command || 'command';
    const truncatedCommand =
      commandText.length > 50 ? commandText.slice(0, 47) + '…' : commandText;
    const title = `run command: ${truncatedCommand}`;

    const headerWidth = Math.min(60, width);
    const titlePart = `── ${title} `;
    const remainingWidth = Math.max(0, headerWidth - titlePart.length);
    const headerLine = titlePart + '─'.repeat(remainingWidth);
    const lines: TranscriptLine[] = [];
    lines.push({ text: headerLine, color: theme.codeBlock.border, dimColor: true });

    const borderWidth = Math.min(width, headerWidth);
    const commandPrefix = '│ $ ';
    const commandMaxWidth = borderWidth - commandPrefix.length;
    const wrappedCommand = wrapLine(commandText, commandMaxWidth);
    for (const w of wrappedCommand) {
      lines.push({
        text: `${commandPrefix}${w}`,
        color: theme.codeBlock.commandPrefix,
        dimColor: false,
      });
    }

    const contentLines = splitLines(text);
    if (
      contentLines.length === 0 ||
      (contentLines.length === 1 && contentLines[0] === '')
    ) {
      lines.push({ text: '│', color: theme.codeBlock.border, dimColor: true });
    } else {
      for (const logicalLine of contentLines) {
        const wrapped = wrapLine(logicalLine, borderWidth - 2);
        for (const w of wrapped) {
          const borderedLine = `│ ${w}`;
          lines.push({ text: borderedLine, color: theme.text.primary, dimColor: false });
        }
      }
    }

    const footerLine = '─'.repeat(borderWidth);
    lines.push({ text: footerLine, color: theme.codeBlock.border, dimColor: true });

    return lines;
  } else {
    for (const logicalLine of logicalLines) {
      const wrapped = wrapLine(logicalLine, width);
      for (const w of wrapped) {
        lines.push({ text: w, color: theme.text.secondary, dimColor: true });
      }
    }
  }

  return lines;
}

function formatToolCallHeaderColored(
  tc: ToolCallItem,
  collapsed: boolean,
  theme: Theme
): TranscriptLine {
  const name = formatToolCallName(tc.name);
  const target = formatToolCallTarget(tc.name, tc.input);
  const status = toolStatusLabel(tc.status);
  const statusColor = toolStatusColor(tc.status, theme);

  const indicator = collapsed ? '▶' : '▼';
  let headerText = `${indicator} ${name}`;
  if (target) {
    headerText += `: ${target}`;
  }
  headerText += ` (${status})`;

  return { text: headerText, color: statusColor };
}

function buildTranscriptLines(params: {
  messages: MessageItem[];
  toolCalls: ToolCallItem[];
  isLoading: boolean;
  thinkingElapsedSeconds: number | null;
  error: string | null;
  width: number;
  collapsed: boolean;
  theme: Theme;
}): TranscriptLine[] {
  const {
    messages,
    toolCalls,
    isLoading,
    thinkingElapsedSeconds,
    error,
    width,
    collapsed,
    theme,
  } = params;
  const lines: TranscriptLine[] = [];

  for (const msg of messages) {
    if (msg.role === MessageRole.USER) {
      const prefix = 'you ';
      const wrapped = wrapText(prefix + msg.content, width);
      for (const w of wrapped)
        lines.push({ text: w, color: theme.userMessage, dimColor: false });
      lines.push({ text: '' });
      continue;
    }

    const wrapped = wrapText(msg.content, width);
    for (const w of wrapped) lines.push({ text: w, color: theme.assistantMessage });
    lines.push({ text: '' });
  }

  if (isLoading && toolCalls.length === 0) {
    const thinkingText =
      thinkingElapsedSeconds !== null
        ? `Thinking for ${thinkingElapsedSeconds}s`
        : 'thinking…';
    lines.push({ text: thinkingText, color: theme.thinking, dimColor: true });
    lines.push({ text: '' });
  }

  for (const tc of toolCalls) {
    const header = formatToolCallHeaderColored(tc, collapsed, theme);
    lines.push(header);
    if (!collapsed && tc.result !== undefined && tc.result !== null) {
      const truncated = truncateToolResult(tc.name, tc.result, tc.input);
      const resultLines = parseToolResultLines(
        truncated,
        tc.name,
        width,
        tc.input,
        theme
      );
      lines.push(...resultLines);
    }
    lines.push({ text: '' });
  }

  if (error) {
    const wrapped = wrapText(`error: ${error}`, width);
    for (const w of wrapped)
      lines.push({ text: w, color: theme.error, dimColor: false });
    lines.push({ text: '' });
  }

  return lines;
}

export function TranscriptView(props: {
  messages: MessageItem[];
  afterAssistant?: MessageItem | null;
  toolCalls: ToolCallItem[];
  isLoading: boolean;
  thinkingStartTime?: number | null;
  error: string | null;
  width: number;
  height: number;
  scrollOffset?: number;
  collapsed: boolean;
}) {
  const { theme } = useTheme();
  const width = Math.max(1, props.width);
  const height = Math.max(1, props.height);
  const thinkingElapsedSeconds = useThinkingElapsedSeconds({
    isLoading: props.isLoading,
    hasToolCalls: props.toolCalls.length > 0,
    thinkingStartTime: props.thinkingStartTime,
  });

  const allLines = buildTranscriptLines({
    messages: props.messages,
    toolCalls: props.toolCalls,
    isLoading: props.isLoading,
    thinkingElapsedSeconds,
    error: props.error,
    width,
    collapsed: props.collapsed,
    theme,
  });

  if (props.afterAssistant) {
    const assistantLines = buildTranscriptLines({
      messages: [props.afterAssistant],
      toolCalls: [],
      isLoading: false,
      thinkingElapsedSeconds: null,
      error: null,
      width,
      collapsed: props.collapsed,
      theme,
    });
    allLines.push(...assistantLines);
  }

  return (
    <TranscriptLines
      lines={allLines}
      height={height}
      scrollOffset={props.scrollOffset}
    />
  );
}
