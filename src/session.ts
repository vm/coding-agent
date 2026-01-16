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
import { cwd } from 'node:process';
import { randomUUID } from 'node:crypto';
import type { Message } from './agent/types';
import type { MessageItem, ToolCallItem } from './shared/types';

export type SessionData = {
  runId: string;
  createdAt: number;
  workingDir: string;
  model: string;
  conversation: Message[];
  messages: MessageItem[];
  toolCalls: ToolCallItem[];
};

export type SessionStore = {
  save: (runId: string, data: SessionData) => void;
};

export function generateRunId(): string {
  return randomUUID();
}

function getAgentBaseDir(baseDir?: string): string {
  return join(baseDir ?? cwd(), 'agent');
}

export function getSessionFilePath(runId: string, baseDir?: string): string {
  return join(getAgentBaseDir(baseDir), runId, 'sessions.json');
}

function ensureRunDir(runId: string, baseDir?: string): string {
  const runDir = join(getAgentBaseDir(baseDir), runId);
  mkdirSync(runDir, { recursive: true });
  return runDir;
}

export function saveSession(
  runId: string,
  data: SessionData,
  baseDir?: string
): void {
  const runDir = ensureRunDir(runId, baseDir);
  const tempPath = join(runDir, 'sessions.json.tmp');
  const finalPath = join(runDir, 'sessions.json');
  const payload = JSON.stringify(data, null, 2);
  writeFileSync(tempPath, payload, 'utf-8');
  renameSync(tempPath, finalPath);
}

export function loadSession(
  runId: string,
  baseDir?: string
): SessionData | null {
  const sessionPath = getSessionFilePath(runId, baseDir);
  if (!existsSync(sessionPath)) {
    return null;
  }
  try {
    const content = readFileSync(sessionPath, 'utf-8');
    const parsed = JSON.parse(content) as SessionData;
    if (!parsed || typeof parsed.runId !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function listRunIds(baseDir?: string): string[] {
  const agentDir = getAgentBaseDir(baseDir);
  if (!existsSync(agentDir)) {
    return [];
  }
  try {
    const entries = readdirSync(agentDir);
    return entries.filter((entry) => {
      const runDir = join(agentDir, entry);
      const sessionPath = join(runDir, 'sessions.json');
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

export function findLatestRunId(baseDir?: string): string | null {
  const runIds = listRunIds(baseDir);
  let latestId: string | null = null;
  let latestTime = -1;

  for (const runId of runIds) {
    const sessionPath = getSessionFilePath(runId, baseDir);
    let time = -1;
    const session = loadSession(runId, baseDir);
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
