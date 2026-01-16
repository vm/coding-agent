export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export enum ToolCallStatus {
  RUNNING = 'running',
  DONE = 'done',
  ERROR = 'error',
}

export enum ToolName {
  READ_FILE = 'read_file',
  EDIT_FILE = 'edit_file',
  RUN_COMMAND = 'run_command',
  LIST_FILES = 'list_files',
}

export enum FormattedTextPartType {
  TEXT = 'text',
  BOLD = 'bold',
  ITALIC = 'italic',
  CODE = 'code',
  INLINE_CODE = 'inlineCode',
}

export type FormattedTextPart = {
  type: FormattedTextPartType;
  content: string;
  color?: string;
};

export type TranscriptLine = {
  text: string;
  color?: string;
  dimColor?: boolean;
  bold?: boolean;
};

export type MessageItem = {
  role: MessageRole;
  content: string;
};

export type ToolCallItem = {
  id: string;
  name: string;
  input: Record<string, unknown>;
  status: ToolCallStatus;
  result?: string;
  error?: boolean;
};

export type { ThemeName } from './themes';
