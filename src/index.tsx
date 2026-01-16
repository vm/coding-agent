import { parseArgs } from 'node:util';
import { render } from 'ink';
import { PassThrough } from 'stream';
import { App } from './components/App';
import {
  generateRunId,
  findLatestRunId,
  loadSessionData,
  initializeDefaultStore,
} from './stores/session';
import { emitScroll } from './shared/scroll';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    resume: { type: 'string', short: 'r' },
  },
  strict: false,
  allowPositionals: true,
});

const resumeArg = values.resume;
const wantsResume = resumeArg !== undefined;

let runId: string;

if (wantsResume) {
  const resumeValue = typeof resumeArg === 'string' ? resumeArg : '';
  const isLatest = resumeValue === '';
  const selectedRunId = isLatest ? findLatestRunId() : resumeValue;

  if (!selectedRunId) {
    console.error('No saved sessions found to resume.');
    process.exit(1);
  }

  const loaded = loadSessionData(selectedRunId);
  if (!loaded) {
    console.error(`Failed to load session for run_id ${selectedRunId}.`);
    process.exit(1);
  }

  runId = loaded.runId ?? selectedRunId;
  initializeDefaultStore({ runId, initialData: loaded });
} else {
  runId = generateRunId();
  initializeDefaultStore({ runId });
}

// SGR mouse mode escape sequences
const ENABLE_MOUSE = '\x1b[?1000h\x1b[?1006h';
const DISABLE_MOUSE = '\x1b[?1000l\x1b[?1006l';
// eslint-disable-next-line no-control-regex
const SGR_MOUSE_RE = /\x1b\[<(\d+);(\d+);(\d+)[Mm]/g;

// Create filtered stdin with TTY-like interface for Ink
const filteredStdin = new PassThrough();
Object.assign(filteredStdin, {
  isTTY: true,
  setRawMode: () => {},
  ref: () => {},
  unref: () => {},
});

// Enable mouse mode and raw mode
process.stdout.write(ENABLE_MOUSE);
process.stdin.setRawMode?.(true);

// Filter stdin data before passing to Ink
process.stdin.on('data', (data: Buffer) => {
  const str = data.toString();

  // Handle Ctrl+C - exit cleanly
  if (str.includes('\x03')) {
    process.stdout.write(DISABLE_MOUSE);
    process.exit(0);
  }

  // Extract and emit scroll events
  SGR_MOUSE_RE.lastIndex = 0;
  let match;
  while ((match = SGR_MOUSE_RE.exec(str)) !== null) {
    const btn = parseInt(match[1], 10);
    if (btn === 64) emitScroll('up');
    else if (btn === 65) emitScroll('down');
  }

  // Strip all mouse sequences before passing to Ink
  const filtered = str.replace(SGR_MOUSE_RE, '');
  if (filtered) {
    filteredStdin.push(filtered);
  }
});

// Cleanup on exit
process.on('exit', () => process.stdout.write(DISABLE_MOUSE));

render(<App />, { stdin: filteredStdin as unknown as typeof process.stdin });
