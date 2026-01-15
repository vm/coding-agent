import { FormattedTextPart, FormattedTextPartType } from '../shared/types';
import { resolveColor } from './color-mapping';

export function extractDescription(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return '';
  }

  const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  const firstLine = trimmed.split('\n')[0].trim();
  return firstLine || '';
}

type ParseState = {
  pos: number;
  text: string;
};

function parseBold(state: ParseState): FormattedTextPart | null {
  if (state.pos + 1 >= state.text.length || state.text[state.pos] !== '*' || state.text[state.pos + 1] !== '*') {
    return null;
  }

  const start = state.pos + 2;
  const savedPos = state.pos;
  state.pos = start;

  const nestedParts: FormattedTextPart[] = [];

  while (state.pos < state.text.length) {
    if (state.pos + 1 < state.text.length && state.text[state.pos] === '*' && state.text[state.pos + 1] === '*') {
      state.pos += 2;
      const content = nestedParts.map((p) => p.content).join('');
      return {
        type: FormattedTextPartType.BOLD,
        content: content.trim() || content,
      };
    }

    const colorPart = parseColor(state);
    if (colorPart) {
      nestedParts.push(colorPart);
      continue;
    }

    const italicPart = parseItalic(state);
    if (italicPart) {
      nestedParts.push(italicPart);
      continue;
    }

    const codePart = parseCode(state);
    if (codePart) {
      nestedParts.push(codePart);
      continue;
    }

    const textPart = parseText(state);
    if (textPart.content) {
      nestedParts.push(textPart);
    } else {
      break;
    }
  }

  state.pos = savedPos;
  return null;
}

function parseItalic(state: ParseState): FormattedTextPart | null {
  if (state.pos >= state.text.length || state.text[state.pos] !== '*') {
    return null;
  }

  const next = state.pos + 1 < state.text.length ? state.text[state.pos + 1] : null;

  if (next === '*') {
    return null;
  }

  const start = state.pos + 1;
  let pos = start;
  let content = '';

  while (pos < state.text.length) {
    if (state.text[pos] === '*') {
      const prevChar = pos > 0 ? state.text[pos - 1] : null;
      const nextChar = pos + 1 < state.text.length ? state.text[pos + 1] : null;
      if (prevChar !== '*' && nextChar !== '*') {
        state.pos = pos + 1;
        return {
          type: FormattedTextPartType.ITALIC,
          content: content.trim() || content,
        };
      }
    }

    if (state.text[pos] === '\\' && pos + 1 < state.text.length) {
      const next = state.text[pos + 1];
      if (next === '*' || next === '`') {
        content += next;
        pos += 2;
        continue;
      }
    }

    content += state.text[pos];
    pos++;
  }

  return null;
}

function parseCode(state: ParseState): FormattedTextPart | null {
  if (state.pos >= state.text.length || state.text[state.pos] !== '`') {
    return null;
  }

  const start = state.pos + 1;
  let pos = start;
  let content = '';

  while (pos < state.text.length) {
    if (state.text[pos] === '`') {
      state.pos = pos + 1;
      return {
        type: FormattedTextPartType.INLINE_CODE,
        content,
      };
    }

    content += state.text[pos];
    pos++;
  }

  return null;
}

function parseColor(state: ParseState): FormattedTextPart | null {
  if (state.pos >= state.text.length || state.text[state.pos] !== '{') {
    return null;
  }

  const colorMatch = state.text.slice(state.pos).match(/^\{color:([^}]+)\}/);
  if (!colorMatch) {
    return null;
  }

  const colorName = colorMatch[1].trim();
  const openTagLength = colorMatch[0].length;
  const contentStart = state.pos + openTagLength;
  let pos = contentStart;
  let content = '';

  while (pos < state.text.length) {
    const closeMatch = state.text.slice(pos).match(/^\{(\/color)\}/);
    if (closeMatch) {
      state.pos = pos + closeMatch[0].length;
      const resolvedColor = resolveColor(colorName);
      return {
        type: FormattedTextPartType.TEXT,
        content,
        color: resolvedColor,
      };
    }

    if (state.text[pos] === '\\' && pos + 1 < state.text.length) {
      const next = state.text[pos + 1];
      if (next === '{' || next === '}') {
        content += next;
        pos += 2;
        continue;
      }
    }

    content += state.text[pos];
    pos++;
  }

  return null;
}

function parseText(state: ParseState): FormattedTextPart {
  let content = '';

  while (state.pos < state.text.length) {
    const char = state.text[state.pos];
    const nextChar = state.pos + 1 < state.text.length ? state.text[state.pos + 1] : null;

    if (char === '\\' && nextChar && (nextChar === '*' || nextChar === '`' || nextChar === '{' || nextChar === '}')) {
      content += nextChar;
      state.pos += 2;
      continue;
    }

    if (char === '{') {
      break;
    }

    if (char === '`') {
      break;
    }

    if (char === '*' && nextChar === '*') {
      break;
    }

    if (char === '*' && nextChar !== '*') {
      break;
    }

    content += char;
    state.pos++;
  }

  return {
    type: FormattedTextPartType.TEXT,
    content,
  };
}

export function parseMarkdown(text: string): FormattedTextPart[] {
  if (!text) {
    return [{ type: FormattedTextPartType.TEXT, content: '' }];
  }

  const parts: FormattedTextPart[] = [];
  const state: ParseState = { pos: 0, text };

  while (state.pos < state.text.length) {
    const codePart = parseCode(state);
    if (codePart) {
      parts.push(codePart);
      continue;
    }

    const colorPart = parseColor(state);
    if (colorPart) {
      parts.push(colorPart);
      continue;
    }

    const boldPart = parseBold(state);
    if (boldPart) {
      parts.push(boldPart);
      continue;
    }

    const italicPart = parseItalic(state);
    if (italicPart) {
      parts.push(italicPart);
      continue;
    }

    const textPart = parseText(state);
    if (textPart.content) {
      parts.push(textPart);
    } else {
      state.pos++;
    }
  }

  return parts.length > 0 ? parts : [{ type: FormattedTextPartType.TEXT, content: text }];
}
