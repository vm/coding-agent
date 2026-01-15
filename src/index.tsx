import { render } from 'ink';
import { App } from './components/App';
import {
  findLatestRunId,
  generateRunId,
  loadSession,
} from './session';

type ResumeSelection =
  | { mode: 'latest' }
  | { mode: 'id'; runId: string }
  | null;

function parseResumeSelection(args: string[]): ResumeSelection {
  const resumeIndex = args.indexOf('--resume');
  if (resumeIndex === -1) return null;
  const next = args[resumeIndex + 1];
  if (next && !next.startsWith('-')) {
    return { mode: 'id', runId: next };
  }
  return { mode: 'latest' };
}

const args = process.argv.slice(2);
const resumeSelection = parseResumeSelection(args);

let initialSession = null;
let runId: string | null = null;

if (resumeSelection) {
  const selectedRunId =
    resumeSelection.mode === 'latest'
      ? findLatestRunId()
      : resumeSelection.runId;

  if (!selectedRunId) {
    console.error('No saved sessions found to resume.');
    process.exit(1);
  }

  const loaded = loadSession(selectedRunId);
  if (!loaded) {
    console.error(`Failed to load session for run_id ${selectedRunId}.`);
    process.exit(1);
  }

  initialSession = loaded;
  runId = loaded.runId;
} else {
  runId = generateRunId();
}

render(<App initialSession={initialSession} runId={runId} />, {
  exitOnCtrlC: true,
});
