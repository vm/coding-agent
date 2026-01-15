import { describe, it, expect, mock } from 'bun:test';
import { render } from 'ink-testing-library';
import { App } from '../../src/components/App';
import { MessageRole } from '../../src/shared/types';
import type { SessionData } from '../../src/session';

const saveMock = mock<(runId: string, data: SessionData) => void>(() => {});

describe('App', () => {
  it('renders banner when no messages', () => {
    const { lastFrame } = render(<App />);

    const output = lastFrame() ?? '';
    expect(output).toContain('███╗   ██╗');
  });

  it('renders input component', () => {
    const { lastFrame } = render(<App />);

    const output = lastFrame() ?? '';
    expect(output).toContain('›');
  });

  it('restores messages from initial session', () => {
    const session: SessionData = {
      runId: 'run_1',
      createdAt: Date.now(),
      workingDir: '/tmp',
      model: 'test-model',
      conversation: [],
      messages: [{ role: MessageRole.USER, content: 'Hello from session' }],
      toolCalls: [],
    };

    const { lastFrame, unmount } = render(
      <App
        initialSession={session}
        runId={session.runId}
        sessionStore={{ save: saveMock }}
      />
    );

    const output = lastFrame() ?? '';
    expect(output).toContain('Hello from session');
    unmount();
  });
});
