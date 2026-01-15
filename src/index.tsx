import { parseArgs } from 'node:util';
import { render } from 'ink';
import { App } from './components/App';
import {
  generateRunId,
  findLatestRunId,
  loadSessionData,
  initializeDefaultStore,
} from './stores/session';
import { ThemeProvider } from './components/ThemeProvider';

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

render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
  { exitOnCtrlC: true }
);
