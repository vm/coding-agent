import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SessionData } from '../src/session';
import {
  findLatestRunId,
  generateRunId,
  loadSession,
  saveSession,
} from '../src/session';

const createSessionData = (overrides: Partial<SessionData>): SessionData => {
  return {
    runId: overrides.runId ?? 'run_1',
    createdAt: overrides.createdAt ?? Date.now(),
    workingDir: overrides.workingDir ?? '/tmp',
    model: overrides.model ?? 'test-model',
    conversation: overrides.conversation ?? [],
    messages: overrides.messages ?? [],
    toolCalls: overrides.toolCalls ?? [],
  };
};

describe('session', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'session-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('saves and loads sessions', () => {
    const runId = generateRunId();
    const session = createSessionData({ runId });
    saveSession(runId, session, testDir);

    const loaded = loadSession(runId, testDir);
    expect(loaded).toEqual(session);
  });

  it('returns null when session is missing', () => {
    const loaded = loadSession('missing', testDir);
    expect(loaded).toBeNull();
  });

  it('finds the latest run id by createdAt', () => {
    const runId1 = 'run_old';
    const runId2 = 'run_new';
    const session1 = createSessionData({ runId: runId1, createdAt: 1000 });
    const session2 = createSessionData({ runId: runId2, createdAt: 2000 });

    saveSession(runId1, session1, testDir);
    saveSession(runId2, session2, testDir);

    const latest = findLatestRunId(testDir);
    expect(latest).toBe(runId2);
  });
});
