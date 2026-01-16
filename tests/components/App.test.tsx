import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { render } from 'ink-testing-library';
import { App } from '../../src/components/App';
import { MessageRole } from '../../src/shared/types';
import {
  createSessionStore,
  initializeDefaultStore,
  resetDefaultStore,
} from '../../src/stores/session';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('App', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'app-test-'));
    resetDefaultStore();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    resetDefaultStore();
  });

  it('renders banner when no messages', () => {
    const store = createSessionStore();
    const { lastFrame } = render(<App store={store} />);

    const output = lastFrame() ?? '';
    expect(output).toContain('███╗   ██╗');
  });

  it('renders input component', () => {
    const store = createSessionStore();
    const { lastFrame } = render(<App store={store} />);

    const output = lastFrame() ?? '';
    expect(output).toContain('›');
  });

  it('restores messages from store', () => {
    const store = createSessionStore({
      initialState: {
        runId: 'run_1',
        messages: [{ role: MessageRole.USER, content: 'Hello from store' }],
      },
    });

    const { lastFrame, unmount } = render(<App store={store} />);

    const output = lastFrame() ?? '';
    expect(output).toContain('Hello from store');
    unmount();
  });

  it('reads messages from initialized default store', () => {
    initializeDefaultStore({
      runId: 'run_2',
      initialData: {
        runId: 'run_2',
        createdAt: Date.now(),
        workingDir: '/test',
        model: 'test-model',
        messages: [{ role: MessageRole.USER, content: 'Default store message' }],
        toolCalls: [],
        conversation: [],
      },
      baseDir: testDir,
    });

    const { lastFrame, unmount } = render(<App />);

    const output = lastFrame() ?? '';
    expect(output).toContain('Default store message');
    unmount();
  });
});
