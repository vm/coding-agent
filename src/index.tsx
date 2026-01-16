import { render } from 'ink';
import { App } from './components/App';
import { parseArgs } from 'node:util';
import { findLatestRunId, generateRunId, loadSession } from './session';
import type { SessionData } from './session';

type ResumeSelection =
  | { mode: 'latest' }
  | { mode: 'id'; runId: string }
  | null;

function parseResumeSelection(args: string[]): ResumeSelection {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      resume: {
        type: 'boolean',
      },
    },
  });

  if (!values.resume) return null;
  const [candidate] = positionals;
  if (candidate && !candidate.startsWith('-')) {
    return { mode: 'id', runId: candidate };
  }
  return { mode: 'latest' };
}

function resolveResumeSession(args: string[]): {
  initialSession: SessionData | null;
  runId: string;
} {
  const resumeSelection = parseResumeSelection(args);
  if (!resumeSelection) {
    return { initialSession: null, runId: generateRunId() };
  }

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

  return { initialSession: loaded, runId: loaded.runId };
}

const { initialSession, runId } = resolveResumeSession(process.argv.slice(2));

render(<App initialSession={initialSession} runId={runId} />, {
  exitOnCtrlC: true,
});
