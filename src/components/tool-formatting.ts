import { ToolName } from '../agent/types';

const COMMAND_TRUNCATE_LENGTH = 60;

export function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

export function formatToolCallName(name: string): string {
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

export function formatToolCallTarget(
  name: string,
  input?: Record<string, unknown>
): string | null {
  const safeInput = input ?? {};
  const path = safeInput.path ? String(safeInput.path) : null;
  const command = safeInput.command ? String(safeInput.command) : null;

  if (name === ToolName.RUN_COMMAND && command) {
    return command.length > COMMAND_TRUNCATE_LENGTH
      ? command.slice(0, COMMAND_TRUNCATE_LENGTH) + '…'
      : command;
  }

  if (path) {
    if (name === ToolName.LIST_FILES) return path === '.' ? './' : path;
    return getFileName(path);
  }

  return null;
}

export function countLines(str: string): number {
  if (!str) return 0;
  return str.split('\n').length;
}

type DiffLine = {
  type: 'context' | 'deletion' | 'addition';
  content: string;
};

type DiffHunk = {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
};

function computeDiff(oldLines: string[], newLines: string[]): DiffHunk[] {
  const CONTEXT_LINES = 3;
  const MAX_DIFF_LINES = 50;
  const hunks: DiffHunk[] = [];
  
  const maxLen = Math.max(oldLines.length, newLines.length);
  const maxShow = Math.min(MAX_DIFF_LINES, maxLen);
  
  const diffLines: DiffLine[] = [];
  let oldCount = 0;
  let newCount = 0;
  let oldStart = 1;
  let newStart = 1;
  let hasChanges = false;

  for (let i = 0; i < maxShow && diffLines.length < MAX_DIFF_LINES; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : null;
    const newLine = i < newLines.length ? newLines[i] : null;

    if (oldLine === newLine) {
      if (hasChanges && diffLines.filter(l => l.type !== 'context').length > 0) {
        diffLines.push({ type: 'context', content: oldLine || '' });
        oldCount++;
        newCount++;
      }
    } else {
      if (!hasChanges) {
        oldStart = Math.max(1, i + 1 - CONTEXT_LINES);
        newStart = Math.max(1, i + 1 - CONTEXT_LINES);
        const contextStart = Math.max(0, i - CONTEXT_LINES);
        for (let j = contextStart; j < i; j++) {
          if (j < oldLines.length && j < newLines.length && oldLines[j] === newLines[j]) {
            diffLines.push({ type: 'context', content: oldLines[j] });
            oldCount++;
            newCount++;
          }
        }
        hasChanges = true;
      }

      if (oldLine !== null) {
        diffLines.push({ type: 'deletion', content: oldLine });
        oldCount++;
      }
      if (newLine !== null) {
        diffLines.push({ type: 'addition', content: newLine });
        newCount++;
      }
    }
  }

  if (diffLines.length > 0 && hasChanges) {
    const contextEnd = Math.min(maxShow + CONTEXT_LINES, maxLen);
    for (let i = maxShow; i < contextEnd && diffLines.length < MAX_DIFF_LINES; i++) {
      if (i < oldLines.length && i < newLines.length && oldLines[i] === newLines[i]) {
        diffLines.push({ type: 'context', content: oldLines[i] });
        oldCount++;
        newCount++;
      } else {
        break;
      }
    }

    hunks.push({
      oldStart,
      oldCount,
      newStart,
      newCount,
      lines: diffLines,
    });
  }

  if (hunks.length === 0 && oldLines.length > 0 && newLines.length > 0) {
    const fallbackLines: DiffLine[] = [];
    const maxLines = Math.max(oldLines.length, newLines.length);
    const showLines = Math.min(25, maxLines);
    for (let i = 0; i < showLines; i++) {
      const oldLine = i < oldLines.length ? oldLines[i] : null;
      const newLine = i < newLines.length ? newLines[i] : null;
      if (oldLine === newLine && oldLine !== null) {
        fallbackLines.push({ type: 'context', content: oldLine });
      } else {
        if (oldLine !== null) {
          fallbackLines.push({ type: 'deletion', content: oldLine });
        }
        if (newLine !== null) {
          fallbackLines.push({ type: 'addition', content: newLine });
        }
      }
    }
    hunks.push({
      oldStart: 1,
      oldCount: oldLines.length,
      newStart: 1,
      newCount: newLines.length,
      lines: fallbackLines,
    });
  }

  return hunks;

  return hunks;
}

export function generateUnifiedDiff(
  oldStr: string,
  newStr: string,
  filename: string
): string[] {
  const lines: string[] = [];
  const headerWidth = 60;
  const headerLine = `── edit file: ${filename} ${'─'.repeat(Math.max(0, headerWidth - filename.length - 13))}`;
  lines.push(headerLine);

  if (oldStr === '') {
    const newLines = newStr.split('\n');
    const maxShow = Math.min(newLines.length, 50);
    lines.push(`@@ -0,0 +1,${newLines.length} @@`);
    for (let i = 0; i < maxShow; i++) {
      lines.push(`+ ${newLines[i]}`);
    }
    if (newLines.length > maxShow) {
      lines.push(`... (truncated, showing ${maxShow} of ${newLines.length} lines)`);
    }
    lines.push('─'.repeat(headerWidth));
    return lines;
  }

  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const hunks = computeDiff(oldLines, newLines);
  const MAX_DISPLAY_LINES = 50;
  let totalDisplayed = 0;
  let wasTruncated = false;

  for (const hunk of hunks) {
    if (totalDisplayed >= MAX_DISPLAY_LINES) {
      wasTruncated = true;
      break;
    }
    lines.push(`@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`);
    for (const diffLine of hunk.lines) {
      if (totalDisplayed >= MAX_DISPLAY_LINES) {
        wasTruncated = true;
        break;
      }
      if (diffLine.type === 'context') {
        lines.push(`  ${diffLine.content}`);
      } else if (diffLine.type === 'deletion') {
        lines.push(`- ${diffLine.content}`);
      } else if (diffLine.type === 'addition') {
        lines.push(`+ ${diffLine.content}`);
      }
      totalDisplayed++;
    }
    if (wasTruncated) break;
  }

  const totalLines = Math.max(oldLines.length, newLines.length);
  if (wasTruncated || totalDisplayed < totalLines) {
    const shown = Math.min(totalDisplayed, MAX_DISPLAY_LINES);
    if (shown < totalLines) {
      lines.push(`... (truncated, showing ${shown} of ${totalLines} lines)`);
    }
  }

  lines.push('─'.repeat(headerWidth));
  return lines;
}

