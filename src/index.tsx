import { parseArgs } from 'node:util';
import { render } from 'ink';
import { App } from './components/App';
import {
  generateRunId,
  findLatestRunId,
  loadSessionData,
  initializeDefaultStore,
} from './stores/session';

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
  const isLatest = resumeArg === true || resumeArg === '';
  const selectedRunId = isLatest ? findLatestRunId() : resumeArg;

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

render(<App />, { exitOnCtrlC: true });
