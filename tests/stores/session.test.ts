import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createSessionStore,
  createFileStorage,
  generateRunId,
  listRunIds,
  loadSessionData,
  findLatestRunId,
  initializeDefaultStore,
  resetDefaultStore,
  persistSession,
  type SessionStore,
} from '../../src/stores/session';
import { MessageRole, ToolCallStatus } from '../../src/shared/types';

describe('session store', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = createSessionStore();
  });

  it('initializes with empty state', () => {
    const state = store.getState();
    expect(state.runId).toBeNull();
    expect(state.messages).toEqual([]);
    expect(state.toolCalls).toEqual([]);
    expect(state.conversation).toEqual([]);
    expect(typeof state.createdAt).toBe('number');
  });

  it('initializes with custom initial state', () => {
    const customStore = createSessionStore({
      initialState: {
        runId: 'custom-run-id',
        model: 'gpt-4',
      },
    });
    const state = customStore.getState();
    expect(state.runId).toBe('custom-run-id');
    expect(state.model).toBe('gpt-4');
  });

  describe('addMessage', () => {
    it('appends message to messages array', () => {
      store.getState().addMessage({ role: MessageRole.USER, content: 'Hello' });

      const state = store.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toEqual({
        role: MessageRole.USER,
        content: 'Hello',
      });
    });

    it('appends multiple messages in order', () => {
      store.getState().addMessage({ role: MessageRole.USER, content: 'Hello' });
      store
        .getState()
        .addMessage({ role: MessageRole.ASSISTANT, content: 'Hi there' });

      const state = store.getState();
      expect(state.messages).toHaveLength(2);
      expect(state.messages[0].role).toBe(MessageRole.USER);
      expect(state.messages[1].role).toBe(MessageRole.ASSISTANT);
    });
  });

  describe('addToolCall', () => {
    it('adds tool call with RUNNING status', () => {
      store.getState().addToolCall({
        id: 'tc_1',
        name: 'read_file',
        input: { path: '/test.txt' },
      });

      const state = store.getState();
      expect(state.toolCalls).toHaveLength(1);
      expect(state.toolCalls[0]).toEqual({
        id: 'tc_1',
        name: 'read_file',
        input: { path: '/test.txt' },
        status: ToolCallStatus.RUNNING,
      });
    });
  });

  describe('updateToolCall', () => {
    it('updates existing tool call', () => {
      store.getState().addToolCall({
        id: 'tc_1',
        name: 'read_file',
        input: { path: '/test.txt' },
      });
      store.getState().updateToolCall('tc_1', {
        status: ToolCallStatus.DONE,
        result: 'file contents',
      });

      const state = store.getState();
      expect(state.toolCalls[0]).toEqual({
        id: 'tc_1',
        name: 'read_file',
        input: { path: '/test.txt' },
        status: ToolCallStatus.DONE,
        result: 'file contents',
      });
    });

    it('does not modify other tool calls', () => {
      store.getState().addToolCall({
        id: 'tc_1',
        name: 'read_file',
        input: { path: '/test1.txt' },
      });
      store.getState().addToolCall({
        id: 'tc_2',
        name: 'read_file',
        input: { path: '/test2.txt' },
      });

      store.getState().updateToolCall('tc_1', { status: ToolCallStatus.DONE });

      const state = store.getState();
      expect(state.toolCalls[0].status).toBe(ToolCallStatus.DONE);
      expect(state.toolCalls[1].status).toBe(ToolCallStatus.RUNNING);
    });

    it('can mark tool call as error', () => {
      store.getState().addToolCall({
        id: 'tc_1',
        name: 'read_file',
        input: { path: '/missing.txt' },
      });
      store.getState().updateToolCall('tc_1', {
        status: ToolCallStatus.ERROR,
        result: 'File not found',
        error: true,
      });

      const state = store.getState();
      expect(state.toolCalls[0].status).toBe(ToolCallStatus.ERROR);
      expect(state.toolCalls[0].error).toBe(true);
    });
  });

  describe('clearToolCalls', () => {
    it('empties tool calls array', () => {
      store.getState().addToolCall({
        id: 'tc_1',
        name: 'read_file',
        input: { path: '/test.txt' },
      });
      store.getState().addToolCall({
        id: 'tc_2',
        name: 'edit_file',
        input: { path: '/test.txt' },
      });

      store.getState().clearToolCalls();

      const state = store.getState();
      expect(state.toolCalls).toEqual([]);
    });
  });

  describe('setConversation', () => {
    it('sets the conversation array', () => {
      const conversation = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi' },
      ];

      store.getState().setConversation(conversation);

      const state = store.getState();
      expect(state.conversation).toEqual(conversation);
    });
  });

  describe('setModel', () => {
    it('sets the model name', () => {
      store.getState().setModel('gpt-4-turbo');

      const state = store.getState();
      expect(state.model).toBe('gpt-4-turbo');
    });
  });

  describe('reset', () => {
    it('returns to initial state', () => {
      store.getState().addMessage({ role: MessageRole.USER, content: 'Hello' });
      store.getState().addToolCall({
        id: 'tc_1',
        name: 'read_file',
        input: { path: '/test.txt' },
      });

      store.getState().reset();

      const state = store.getState();
      expect(state.messages).toEqual([]);
      expect(state.toolCalls).toEqual([]);
      expect(state.runId).toBeNull();
    });
  });

  describe('getState outside React', () => {
    it('returns current state via getState()', () => {
      store.getState().addMessage({ role: MessageRole.USER, content: 'Test' });

      const state = store.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].content).toBe('Test');
    });
  });

  describe('generateRunId', () => {
    it('generates unique UUIDs', () => {
      const id1 = generateRunId();
      const id2 = generateRunId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });
  });

  describe('multiple stores', () => {
    it('can create independent stores for testing', () => {
      const store1 = createSessionStore();
      const store2 = createSessionStore();

      store1.getState().addMessage({ role: MessageRole.USER, content: 'Store 1' });
      store2.getState().addMessage({ role: MessageRole.USER, content: 'Store 2' });

      expect(store1.getState().messages[0].content).toBe('Store 1');
      expect(store2.getState().messages[0].content).toBe('Store 2');
    });
  });
});

describe('file storage', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'session-storage-test-'));
    resetDefaultStore();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    resetDefaultStore();
  });

  describe('createFileStorage', () => {
    it('setItem creates directory if missing', () => {
      const runId = 'test-run-id';
      const storage = createFileStorage(() => runId, { baseDir: testDir });

      storage.setItem('session', JSON.stringify({ test: 'data' }));

      const sessionPath = join(testDir, '.nila', 'sessions', runId, 'session.json');
      expect(existsSync(sessionPath)).toBe(true);
    });

    it('setItem writes atomically via temp file', () => {
      const runId = 'test-run-id';
      const storage = createFileStorage(() => runId, { baseDir: testDir });

      storage.setItem('session', JSON.stringify({ test: 'data' }));

      const tempPath = join(testDir, '.nila', 'sessions', runId, 'session.json.tmp');
      expect(existsSync(tempPath)).toBe(false);

      const finalPath = join(testDir, '.nila', 'sessions', runId, 'session.json');
      expect(existsSync(finalPath)).toBe(true);
    });

    it('getItem returns null for missing file', () => {
      const storage = createFileStorage(() => 'missing-run', { baseDir: testDir });

      const result = storage.getItem('session');

      expect(result).toBeNull();
    });

    it('getItem returns content for existing file', () => {
      const runId = 'test-run-id';
      const storage = createFileStorage(() => runId, { baseDir: testDir });
      const data = JSON.stringify({ test: 'value' });

      storage.setItem('session', data);
      const result = storage.getItem('session');

      expect(result).toBe(data);
    });

    it('returns null when runId is null', () => {
      const storage = createFileStorage(() => null, { baseDir: testDir });

      const result = storage.getItem('session');

      expect(result).toBeNull();
    });
  });

  describe('listRunIds', () => {
    it('returns empty array when no sessions exist', () => {
      const runIds = listRunIds(testDir);
      expect(runIds).toEqual([]);
    });

    it('returns run IDs with valid session files', () => {
      const storage1 = createFileStorage(() => 'run-1', { baseDir: testDir });
      const storage2 = createFileStorage(() => 'run-2', { baseDir: testDir });

      storage1.setItem('session', JSON.stringify({ state: { runId: 'run-1' } }));
      storage2.setItem('session', JSON.stringify({ state: { runId: 'run-2' } }));

      const runIds = listRunIds(testDir);

      expect(runIds).toContain('run-1');
      expect(runIds).toContain('run-2');
    });
  });

  describe('loadSessionData', () => {
    it('returns null for missing session', () => {
      const result = loadSessionData('missing-run', testDir);
      expect(result).toBeNull();
    });

    it('loads session data from persist format', () => {
      const storage = createFileStorage(() => 'run-1', { baseDir: testDir });
      const sessionData = {
        state: {
          runId: 'run-1',
          createdAt: 1000,
          workingDir: '/test',
          model: 'test-model',
          messages: [],
          toolCalls: [],
          conversation: [],
        },
      };

      storage.setItem('session', JSON.stringify(sessionData));

      const loaded = loadSessionData('run-1', testDir);

      expect(loaded?.runId).toBe('run-1');
      expect(loaded?.createdAt).toBe(1000);
      expect(loaded?.model).toBe('test-model');
    });

    it('loads legacy session data format', () => {
      const storage = createFileStorage(() => 'run-1', { baseDir: testDir });
      const legacyData = {
        runId: 'run-1',
        createdAt: 2000,
        workingDir: '/legacy',
        model: 'legacy-model',
        messages: [],
        toolCalls: [],
        conversation: [],
      };

      storage.setItem('session', JSON.stringify(legacyData));

      const loaded = loadSessionData('run-1', testDir);

      expect(loaded?.runId).toBe('run-1');
      expect(loaded?.createdAt).toBe(2000);
    });
  });

  describe('findLatestRunId', () => {
    it('returns null when no sessions exist', () => {
      const result = findLatestRunId(testDir);
      expect(result).toBeNull();
    });

    it('returns the run with latest createdAt', () => {
      const storage1 = createFileStorage(() => 'run-old', { baseDir: testDir });
      const storage2 = createFileStorage(() => 'run-new', { baseDir: testDir });

      storage1.setItem(
        'session',
        JSON.stringify({ state: { runId: 'run-old', createdAt: 1000 } })
      );
      storage2.setItem(
        'session',
        JSON.stringify({ state: { runId: 'run-new', createdAt: 2000 } })
      );

      const latest = findLatestRunId(testDir);

      expect(latest).toBe('run-new');
    });
  });

  describe('initializeDefaultStore', () => {
    it('creates store with run ID', () => {
      const runId = generateRunId();
      const store = initializeDefaultStore({ runId, baseDir: testDir });

      expect(store.getState().runId).toBe(runId);
    });

    it('restores from initial data', () => {
      const initialData = {
        runId: 'restored-run',
        createdAt: 5000,
        workingDir: '/restored',
        model: 'restored-model',
        messages: [{ role: MessageRole.USER, content: 'Restored message' }],
        toolCalls: [],
        conversation: [],
      };

      const store = initializeDefaultStore({ initialData, baseDir: testDir });

      expect(store.getState().runId).toBe('restored-run');
      expect(store.getState().messages[0].content).toBe('Restored message');
    });
  });

  describe('persistSession', () => {
    it('saves current state to file', () => {
      const runId = generateRunId();
      initializeDefaultStore({ runId, baseDir: testDir });

      const store = initializeDefaultStore({ runId, baseDir: testDir });
      store.getState().addMessage({ role: MessageRole.USER, content: 'Test persist' });

      persistSession();

      const sessionPath = join(testDir, '.nila', 'sessions', runId, 'session.json');
      expect(existsSync(sessionPath)).toBe(true);

      const content = readFileSync(sessionPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.state.messages[0].content).toBe('Test persist');
    });
  });
});
