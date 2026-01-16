import { createStore, useStore } from 'zustand';
import { persist, type StateStorage } from 'zustand/middleware';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { Message } from '../agent/types';
import {
  ToolCallStatus,
  type MessageItem,
  type ToolCallItem,
} from '../shared/types';

export type SessionData = {
  runId: string | null;
  createdAt: number;
  workingDir: string;
  model: string;
  messages: MessageItem[];
  toolCalls: ToolCallItem[];
  conversation: Message[];
};

export type SessionState = SessionData & {
  addMessage: (msg: MessageItem) => void;
  addToolCall: (tc: Omit<ToolCallItem, 'status'>) => void;
  updateToolCall: (id: string, update: Partial<ToolCallItem>) => void;
  clearToolCalls: () => void;
  setConversation: (conv: Message[]) => void;
  setModel: (model: string) => void;
  reset: () => void;
};

export type SessionStore = ReturnType<typeof createSessionStore>;

type StorageOptions = {
  baseDir?: string;
};

function getSessionsBaseDir(baseDir?: string): string {
  return join(baseDir ?? process.cwd(), '.nila', 'sessions');
}

function getSessionFilePath(runId: string, baseDir?: string): string {
  return join(getSessionsBaseDir(baseDir), runId, 'session.json');
}

function ensureRunDir(runId: string, baseDir?: string): string {
  const runDir = join(getSessionsBaseDir(baseDir), runId);
  mkdirSync(runDir, { recursive: true });
  return runDir;
}

export function createFileStorage(
  getRunId: () => string | null,
  options?: StorageOptions
): StateStorage {
  return {
    getItem: (_name: string): string | null => {
      const runId = getRunId();
      if (!runId) return null;
      const sessionPath = getSessionFilePath(runId, options?.baseDir);
      if (!existsSync(sessionPath)) return null;
      try {
        return readFileSync(sessionPath, 'utf-8');
      } catch {
        return null;
      }
    },
    setItem: (_name: string, value: string): void => {
      const runId = getRunId();
      if (!runId) return;
      const runDir = ensureRunDir(runId, options?.baseDir);
      const tempPath = join(runDir, 'session.json.tmp');
      const finalPath = join(runDir, 'session.json');
      writeFileSync(tempPath, value, 'utf-8');
      renameSync(tempPath, finalPath);
    },
    removeItem: (_name: string): void => {
      const runId = getRunId();
      if (!runId) return;
      const sessionPath = getSessionFilePath(runId, options?.baseDir);
      try {
        if (existsSync(sessionPath)) {
          const { unlinkSync } = require('node:fs');
          unlinkSync(sessionPath);
        }
      } catch {}
    },
  };
}

const createInitialState = (): SessionData => ({
  runId: null,
  createdAt: Date.now(),
  workingDir: process.cwd(),
  model: '',
  messages: [],
  toolCalls: [],
  conversation: [],
});

export type CreateSessionStoreOptions = {
  initialState?: Partial<SessionData>;
  storage?: StateStorage;
  enablePersist?: boolean;
};

export function createSessionStore(options?: CreateSessionStoreOptions) {
  const { initialState, storage, enablePersist = false } = options ?? {};

  const storeCreator = (set: (fn: (state: SessionState) => Partial<SessionState>) => void) => ({
    ...createInitialState(),
    ...initialState,

    addMessage: (msg: MessageItem) =>
      set((state) => ({ messages: [...state.messages, msg] })),

    addToolCall: (tc: Omit<ToolCallItem, 'status'>) =>
      set((state) => ({
        toolCalls: [...state.toolCalls, { ...tc, status: ToolCallStatus.RUNNING }],
      })),

    updateToolCall: (id: string, update: Partial<ToolCallItem>) =>
      set((state) => ({
        toolCalls: state.toolCalls.map((tc) =>
          tc.id === id ? { ...tc, ...update } : tc
        ),
      })),

    clearToolCalls: () => set(() => ({ toolCalls: [] })),

    setConversation: (conv: Message[]) => set(() => ({ conversation: conv })),

    setModel: (model: string) => set(() => ({ model })),

    reset: () => set(() => createInitialState()),
  });

  if (enablePersist && storage) {
    return createStore<SessionState>()(
      persist(storeCreator, {
        name: 'session',
        storage: {
          getItem: async (name) => {
            const str = await storage.getItem(name);
            if (!str) return null;
            try {
              return JSON.parse(str);
            } catch {
              return null;
            }
          },
          setItem: async (name, value) => {
            await storage.setItem(name, JSON.stringify(value, null, 2));
          },
          removeItem: async (name) => {
            await storage.removeItem(name);
          },
        },
        partialize: (state) =>
          ({
            runId: state.runId,
            createdAt: state.createdAt,
            workingDir: state.workingDir,
            model: state.model,
            messages: state.messages,
            toolCalls: state.toolCalls,
            conversation: state.conversation,
          }) as unknown as SessionState,
      })
    );
  }

  return createStore<SessionState>()(storeCreator);
}

export function generateRunId(): string {
  return randomUUID();
}

export function listRunIds(baseDir?: string): string[] {
  const sessionsDir = getSessionsBaseDir(baseDir);
  if (!existsSync(sessionsDir)) return [];
  try {
    const entries = readdirSync(sessionsDir);
    return entries.filter((entry) => {
      const runDir = join(sessionsDir, entry);
      const sessionPath = join(runDir, 'session.json');
      try {
        return statSync(runDir).isDirectory() && existsSync(sessionPath);
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

export function loadSessionData(
  runId: string,
  baseDir?: string
): SessionData | null {
  const sessionPath = getSessionFilePath(runId, baseDir);
  if (!existsSync(sessionPath)) return null;
  try {
    const content = readFileSync(sessionPath, 'utf-8');
    const parsed = JSON.parse(content) as { state?: SessionData };
    if (parsed.state && typeof parsed.state.runId === 'string') {
      return parsed.state;
    }
    const legacyData = parsed as unknown as SessionData;
    if (legacyData && typeof legacyData.runId === 'string') {
      return legacyData;
    }
    return null;
  } catch {
    return null;
  }
}

export function findLatestRunId(baseDir?: string): string | null {
  const runIds = listRunIds(baseDir);
  let latestId: string | null = null;
  let latestTime = -1;

  for (const runId of runIds) {
    const sessionPath = getSessionFilePath(runId, baseDir);
    let time = -1;
    const session = loadSessionData(runId, baseDir);
    if (session && Number.isFinite(session.createdAt)) {
      time = session.createdAt;
    } else {
      try {
        const stat = statSync(sessionPath);
        time = stat.mtimeMs;
      } catch {
        time = -1;
      }
    }
    if (time > latestTime) {
      latestTime = time;
      latestId = runId;
    }
  }

  return latestId;
}

let defaultStore: SessionStore | null = null;

export function initializeDefaultStore(options?: {
  runId?: string | null;
  initialData?: SessionData | null;
  baseDir?: string;
}): SessionStore {
  const { runId, initialData, baseDir } = options ?? {};

  const storage = createFileStorage(() => defaultStore?.getState().runId ?? null, {
    baseDir,
  });

  defaultStore = createSessionStore({
    initialState: initialData ?? { runId },
    storage,
    enablePersist: true,
  });

  return defaultStore;
}

export function getDefaultStore(): SessionStore {
  if (!defaultStore) {
    defaultStore = createSessionStore();
  }
  return defaultStore;
}

export function useSessionStore<T>(selector: (state: SessionState) => T): T {
  return useStore(getDefaultStore(), selector);
}

export function persistSession(): void {
  const store = getDefaultStore();
  const state = store.getState();
  if (!state.runId) return;

  const storage = createFileStorage(() => state.runId);
  storage.setItem(
    'session',
    JSON.stringify(
      {
        state: {
          runId: state.runId,
          createdAt: state.createdAt,
          workingDir: state.workingDir,
          model: state.model,
          messages: state.messages,
          toolCalls: state.toolCalls,
          conversation: state.conversation,
        },
      },
      null,
      2
    )
  );
}

export function resetDefaultStore(): void {
  if (defaultStore) {
    defaultStore.getState().reset();
  }
  defaultStore = null;
}
