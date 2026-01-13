import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { MessageRole, ToolCallStatus, ToolName } from '../agent/types';
import { formatToolCallName, formatToolCallTarget } from './tool-formatting';

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
  dimColor?: boolean;
};

const READ_FILE_MAX_LINES = 50;
const RUN_COMMAND_MAX_LINES = 100;
const EDIT_FILE_MAX_LINES = 50;

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

function formatEditFileDiff(input?: Record<string, unknown>): string | null {
  if (!input) return null;

  const oldStr = input.old_str as string | undefined;
  const newStr = input.new_str as string | undefined;

  if (oldStr === undefined || newStr === undefined) return null;

  const diffLines: string[] = [];

  if (oldStr === '') {
    const newLines = newStr.split('\n');
    const newShow = Math.min(newLines.length, EDIT_FILE_MAX_LINES);
    for (let i = 0; i < newShow; i++) {
      diffLines.push(`+ ${newLines[i]}`);
    }
    if (newLines.length > EDIT_FILE_MAX_LINES) {
      diffLines.push(`... (truncated, showing ${EDIT_FILE_MAX_LINES} of ${newLines.length} lines)`);
    }
    return diffLines.join('\n');
  }

  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const maxEach = Math.floor(EDIT_FILE_MAX_LINES / 2);

  const oldShow = Math.min(oldLines.length, maxEach);
  for (let i = 0; i < oldShow; i++) {
    diffLines.push(`- ${oldLines[i]}`);
  }
  if (oldLines.length > maxEach) {
    diffLines.push(`... (truncated, showing ${maxEach} of ${oldLines.length} removed lines)`);
  }

  const newShow = Math.min(newLines.length, maxEach);
  for (let i = 0; i < newShow; i++) {
    diffLines.push(`+ ${newLines[i]}`);
  }
  if (newLines.length > maxEach) {
    diffLines.push(`... (truncated, showing ${newShow} of ${newLines.length} added lines)`);
  }

  return diffLines.join('\n');
}

function truncateToolResult(name: string, result: string, input?: Record<string, unknown>): string {
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

function parseDiffLine(line: string, width: number): Line[] {
  const lines: Line[] = [];

  if (line.startsWith('- ')) {
    const wrapped = wrapLine(line, width);
    for (const w of wrapped) {
      lines.push({ text: w, color: 'red', dimColor: true });
    }
  } else if (line.startsWith('+ ')) {
    const wrapped = wrapLine(line, width);
    for (const w of wrapped) {
      lines.push({ text: w, color: 'green' });
    }
  } else if (line.startsWith('  ')) {
    const wrapped = wrapLine(line, width);
    for (const w of wrapped) {
      lines.push({ text: w, color: 'gray', dimColor: true });
    }
  } else if (line.includes('truncated')) {
    const wrapped = wrapLine(line, width);
    for (const w of wrapped) {
      lines.push({ text: w, color: 'yellow', dimColor: true });
    }
  } else {
    const wrapped = wrapLine(line, width);
    for (const w of wrapped) {
      lines.push({ text: w, color: 'gray' });
    }
  }

  return lines;
}

function parseToolResultLines(text: string, toolName: string, width: number): Line[] {
  const lines: Line[] = [];
  const logicalLines = splitLines(text);

  for (const logicalLine of logicalLines) {
    if (toolName === ToolName.EDIT_FILE) {
      const diffLines = parseDiffLine(logicalLine, width);
      lines.push(...diffLines);
    } else if (toolName === ToolName.READ_FILE) {
      const wrapped = wrapLine(logicalLine, width);
      for (const w of wrapped) {
        lines.push({ text: w, color: 'cyan', dimColor: true });
      }
    } else if (toolName === ToolName.RUN_COMMAND) {
      const wrapped = wrapLine(logicalLine, width);
      for (const w of wrapped) {
        lines.push({ text: w, color: 'gray' });
      }
    } else {
      const wrapped = wrapLine(logicalLine, width);
      for (const w of wrapped) {
        lines.push({ text: w, color: 'gray', dimColor: true });
      }
    }
  }

  return lines;
}

function formatToolCallHeaderColored(tc: ToolCallItem): Line {
  const name = formatToolCallName(tc.name);
  const target = formatToolCallTarget(tc.name, tc.input);
  const status = toolStatusLabel(tc.status);
  const statusColor = toolStatusColor(tc.status);

  let headerText = name;
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
}): Line[] {
  const { messages, toolCalls, isLoading, thinkingElapsedSeconds, error, width } = params;
  const lines: Line[] = [];

  for (const msg of messages) {
    if (msg.role === MessageRole.USER) {
      const prefix = 'you ';
      const wrapped = wrapText(prefix + msg.content, width);
      for (const w of wrapped) lines.push({ text: w, color: 'yellow', dimColor: false });
      lines.push({ text: '' });
      continue;
    }

    const wrapped = wrapText(msg.content, width);
    for (const w of wrapped) lines.push({ text: w, color: 'white' });
    lines.push({ text: '' });
  }

  if (isLoading && toolCalls.length === 0) {
    const thinkingText = thinkingElapsedSeconds !== null 
      ? `Thinking for ${thinkingElapsedSeconds}s`
      : 'thinking…';
    lines.push({ text: thinkingText, color: 'magenta', dimColor: true });
    lines.push({ text: '' });
  }

  for (const tc of toolCalls) {
    const header = formatToolCallHeaderColored(tc);
    lines.push(header);
    if (tc.result) {
      const truncated = truncateToolResult(tc.name, tc.result, tc.input);
      const resultLines = parseToolResultLines(truncated, tc.name, width);
      lines.push(...resultLines);
    }
    lines.push({ text: '' });
  }

  if (error) {
    const wrapped = wrapText(`error: ${error}`, width);
    for (const w of wrapped) lines.push({ text: w, color: 'red', dimColor: false });
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
}) {
  const width = Math.max(1, props.width);
  const height = Math.max(1, props.height);
  const scrollOffset = Math.max(0, props.scrollOffset ?? 0);

  const [thinkingElapsedSeconds, setThinkingElapsedSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!props.isLoading || props.toolCalls.length > 0 || !props.thinkingStartTime) {
      setThinkingElapsedSeconds(null);
      return;
    }

    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - props.thinkingStartTime!) / 1000);
      setThinkingElapsedSeconds(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 100);

    return () => {
      clearInterval(interval);
    };
  }, [props.isLoading, props.toolCalls.length, props.thinkingStartTime]);

  const allLines = buildTranscriptLines({
    messages: props.messages,
    toolCalls: props.toolCalls,
    isLoading: props.isLoading,
    thinkingElapsedSeconds,
    error: props.error,
    width,
  });

  if (props.afterAssistant) {
    const assistantLines = buildTranscriptLines({
      messages: [props.afterAssistant],
      toolCalls: [],
      isLoading: false,
      thinkingElapsedSeconds: null,
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
        <Text key={`line-${i}`} color={l.color} dimColor={l.dimColor}>
          {l.text.length === 0 ? ' ' : l.text}
        </Text>
      ))}
    </Box>
  );
}
