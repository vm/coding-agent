import { Box, Text } from 'ink';
import { MessageRole, ToolCallStatus, ToolName } from '../agent/types';

type MessageItem = {
  role: MessageRole;
  content: string;
};

type ToolCallItem = {
  name: string;
  input?: Record<string, unknown>;
  status: ToolCallStatus;
  result?: string;
};

type Line = {
  text: string;
  color?: string;
};

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

function toolStatusColor(status: ToolCallStatus): string {
  switch (status) {
    case ToolCallStatus.RUNNING:
      return 'yellow';
    case ToolCallStatus.DONE:
      return 'green';
    case ToolCallStatus.ERROR:
      return 'red';
  }
}

function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function formatToolCallName(name: string): string {
  switch (name) {
    case ToolName.READ_FILE:
      return 'read file';
    case ToolName.EDIT_FILE:
      return 'edit file';
    case ToolName.LIST_FILES:
      return 'list files';
    case ToolName.RUN_COMMAND:
      return 'run command';
    default:
      return name.replace(/_/g, ' ');
  }
}

function formatToolCallTarget(name: string, input?: Record<string, unknown>): string | null {
  const safeInput = input ?? {};
  const path = safeInput.path ? String(safeInput.path) : null;
  const command = safeInput.command ? String(safeInput.command) : null;

  if (name === ToolName.RUN_COMMAND && command) {
    return command.length > 60 ? command.slice(0, 60) + '…' : command;
  }

  if (path) {
    if (name === ToolName.LIST_FILES) return path === '.' ? './' : path;
    return getFileName(path);
  }

  return null;
}

function formatToolCallHeader(tc: ToolCallItem): string {
  const name = formatToolCallName(tc.name);
  const target = formatToolCallTarget(tc.name, tc.input);
  const status = toolStatusLabel(tc.status);
  return target ? `${name}: ${target} (${status})` : `${name} (${status})`;
}

function truncateToolResult(name: string, result: string): string {
  const lines = result.split('\n');
  const totalLines = lines.length;
  
  let maxLines: number;
  switch (name) {
    case ToolName.READ_FILE:
      maxLines = 50;
      break;
    case ToolName.RUN_COMMAND:
      maxLines = 100;
      break;
    case ToolName.LIST_FILES:
    case ToolName.EDIT_FILE:
    default:
      return result;
  }
  
  if (totalLines <= maxLines) {
    return result;
  }
  
  const truncated = lines.slice(0, maxLines).join('\n');
  return `${truncated}\n\n... (truncated, showing ${maxLines} of ${totalLines} lines)`;
}

function buildTranscriptLines(params: {
  messages: MessageItem[];
  toolCalls: ToolCallItem[];
  isLoading: boolean;
  error: string | null;
  width: number;
}): Line[] {
  const { messages, toolCalls, isLoading, error, width } = params;
  const lines: Line[] = [];

  for (const msg of messages) {
    if (msg.role === MessageRole.USER) {
      const prefix = 'you ';
      const wrapped = wrapText(prefix + msg.content, width);
      for (const w of wrapped) lines.push({ text: w, color: 'yellow' });
      lines.push({ text: '' });
      continue;
    }

    const wrapped = wrapText(msg.content, width);
    for (const w of wrapped) lines.push({ text: w, color: 'white' });
    lines.push({ text: '' });
  }

  if (isLoading && toolCalls.length === 0) {
    lines.push({ text: 'thinking…', color: 'gray' });
    lines.push({ text: '' });
  }

  for (const tc of toolCalls) {
    const header = formatToolCallHeader(tc);
    lines.push({ text: header, color: toolStatusColor(tc.status) });
    if (tc.result) {
      const truncated = truncateToolResult(tc.name, tc.result);
      const wrapped = wrapText(truncated, width);
      for (const w of wrapped) lines.push({ text: w, color: 'gray' });
    }
    lines.push({ text: '' });
  }

  if (error) {
    const wrapped = wrapText(`error: ${error}`, width);
    for (const w of wrapped) lines.push({ text: w, color: 'red' });
    lines.push({ text: '' });
  }

  return lines;
}

export function TranscriptView(props: {
  messages: MessageItem[];
  afterAssistant?: MessageItem | null;
  toolCalls: ToolCallItem[];
  isLoading: boolean;
  error: string | null;
  width: number;
  height: number;
  scrollOffset?: number;
}) {
  const width = Math.max(1, props.width);
  const height = Math.max(1, props.height);
  const scrollOffset = Math.max(0, props.scrollOffset ?? 0);

  const allLines = buildTranscriptLines({
    messages: props.messages,
    toolCalls: props.toolCalls,
    isLoading: props.isLoading,
    error: props.error,
    width,
  });

  if (props.afterAssistant) {
    const assistantLines = buildTranscriptLines({
      messages: [props.afterAssistant],
      toolCalls: [],
      isLoading: false,
      error: null,
      width,
    });
    allLines.push(...assistantLines);
  }

  const maxScrollOffset = Math.max(0, allLines.length - height);
  const clampedOffset = Math.min(scrollOffset, maxScrollOffset);
  const start = Math.max(0, allLines.length - height - clampedOffset);
  const visible = allLines.slice(start, start + height);
  const fillerCount = Math.max(0, height - visible.length);

  return (
    <Box flexDirection="column" height={height}>
      {Array.from({ length: fillerCount }).map((_, i) => (
        <Text key={`pad-${i}`}> </Text>
      ))}
      {visible.map((l, i) => (
        <Text key={`line-${i}`} color={l.color}>
          {l.text.length === 0 ? ' ' : l.text}
        </Text>
      ))}
    </Box>
  );
}


