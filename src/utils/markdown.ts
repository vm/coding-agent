import { Lexer, Token, Tokens } from 'marked';
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

type ColorSegment = {
  text: string;
  color?: string;
};

function extractColorSegments(text: string): ColorSegment[] {
  const segments: ColorSegment[] = [];
  const colorRegex = /\{color:([^}]+)\}([\s\S]*?)\{\/color\}/g;
  let lastIndex = 0;
  let match;

  while ((match = colorRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    const colorName = match[1].trim();
    const resolvedColor = resolveColor(colorName);
    segments.push({
      text: match[2],
      color: resolvedColor,
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ text }];
}

function getTextContent(tokens: Token[]): string {
  let result = '';
  for (const token of tokens) {
    if (token.type === 'text' || token.type === 'codespan') {
      result += 'text' in token ? token.text : '';
    } else if ('tokens' in token && Array.isArray(token.tokens)) {
      result += getTextContent(token.tokens);
    } else if ('raw' in token) {
      result += token.raw;
    }
  }
  return result;
}

function processInlineTokens(tokens: Token[], color?: string): FormattedTextPart[] {
  const parts: FormattedTextPart[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'strong': {
        const strongToken = token as Tokens.Strong;
        const content = getTextContent(strongToken.tokens ?? []);
        parts.push({
          type: FormattedTextPartType.BOLD,
          content,
          color,
        });
        break;
      }
      case 'em': {
        const emToken = token as Tokens.Em;
        const content = getTextContent(emToken.tokens ?? []);
        parts.push({
          type: FormattedTextPartType.ITALIC,
          content,
          color,
        });
        break;
      }
      case 'codespan': {
        const codeToken = token as Tokens.Codespan;
        parts.push({
          type: FormattedTextPartType.INLINE_CODE,
          content: codeToken.text,
          color,
        });
        break;
      }
      case 'del': {
        const delToken = token as Tokens.Del;
        const content = getTextContent(delToken.tokens ?? []);
        parts.push({
          type: FormattedTextPartType.STRIKETHROUGH,
          content,
          color,
        });
        break;
      }
      case 'text': {
        const textToken = token as Tokens.Text;
        if ('tokens' in textToken && Array.isArray(textToken.tokens)) {
          parts.push(...processInlineTokens(textToken.tokens, color));
        } else {
          parts.push({
            type: FormattedTextPartType.TEXT,
            content: textToken.text,
            color,
          });
        }
        break;
      }
      case 'escape': {
        const escapeToken = token as Tokens.Escape;
        parts.push({
          type: FormattedTextPartType.TEXT,
          content: escapeToken.text,
          color,
        });
        break;
      }
      case 'link': {
        const linkToken = token as Tokens.Link;
        const content = getTextContent(linkToken.tokens ?? []);
        parts.push({
          type: FormattedTextPartType.TEXT,
          content,
          color,
        });
        break;
      }
      case 'image': {
        const imageToken = token as Tokens.Image;
        parts.push({
          type: FormattedTextPartType.TEXT,
          content: imageToken.text || imageToken.title || '[image]',
          color,
        });
        break;
      }
      case 'br': {
        parts.push({
          type: FormattedTextPartType.TEXT,
          content: '\n',
          color,
        });
        break;
      }
      default: {
        if ('text' in token && typeof token.text === 'string') {
          parts.push({
            type: FormattedTextPartType.TEXT,
            content: token.text,
            color,
          });
        } else if ('raw' in token && typeof token.raw === 'string') {
          parts.push({
            type: FormattedTextPartType.TEXT,
            content: token.raw,
            color,
          });
        }
      }
    }
  }

  return parts;
}

function processTokens(tokens: Token[], color?: string): FormattedTextPart[] {
  const parts: FormattedTextPart[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'paragraph': {
        const paragraphToken = token as Tokens.Paragraph;
        parts.push(...processInlineTokens(paragraphToken.tokens ?? [], color));
        break;
      }
      case 'text': {
        const textToken = token as Tokens.Text;
        if ('tokens' in textToken && Array.isArray(textToken.tokens)) {
          parts.push(...processInlineTokens(textToken.tokens, color));
        } else {
          parts.push({
            type: FormattedTextPartType.TEXT,
            content: textToken.text,
            color,
          });
        }
        break;
      }
      case 'space': {
        parts.push({
          type: FormattedTextPartType.TEXT,
          content: '\n',
          color,
        });
        break;
      }
      case 'code': {
        const codeToken = token as Tokens.Code;
        parts.push({
          type: FormattedTextPartType.CODE,
          content: codeToken.text,
          color,
        });
        break;
      }
      case 'heading': {
        const headingToken = token as Tokens.Heading;
        parts.push(...processInlineTokens(headingToken.tokens ?? [], color));
        parts.push({ type: FormattedTextPartType.TEXT, content: '\n', color });
        break;
      }
      case 'list': {
        const listToken = token as Tokens.List;
        for (const item of listToken.items) {
          const bullet = listToken.ordered ? `${item.task ? '☐ ' : ''}` : '• ';
          parts.push({ type: FormattedTextPartType.TEXT, content: bullet, color });
          parts.push(...processInlineTokens(item.tokens ?? [], color));
          parts.push({ type: FormattedTextPartType.TEXT, content: '\n', color });
        }
        break;
      }
      case 'blockquote': {
        const blockquoteToken = token as Tokens.Blockquote;
        parts.push({ type: FormattedTextPartType.TEXT, content: '> ', color });
        parts.push(...processTokens(blockquoteToken.tokens ?? [], color));
        break;
      }
      default: {
        if ('tokens' in token && Array.isArray(token.tokens)) {
          parts.push(...processInlineTokens(token.tokens, color));
        } else if ('text' in token && typeof token.text === 'string') {
          parts.push({
            type: FormattedTextPartType.TEXT,
            content: token.text,
            color,
          });
        } else if ('raw' in token && typeof token.raw === 'string') {
          parts.push({
            type: FormattedTextPartType.TEXT,
            content: token.raw,
            color,
          });
        }
      }
    }
  }

  return parts;
}

function parseSegment(text: string, color?: string): FormattedTextPart[] {
  if (!text) {
    return [];
  }

  const lexer = new Lexer({ gfm: true, breaks: true });
  const tokens = lexer.lex(text);
  const parts = processTokens(tokens, color);

  return parts;
}

export function parseMarkdown(text: string): FormattedTextPart[] {
  if (!text) {
    return [{ type: FormattedTextPartType.TEXT, content: '' }];
  }

  const segments = extractColorSegments(text);
  const allParts: FormattedTextPart[] = [];

  for (const segment of segments) {
    const parts = parseSegment(segment.text, segment.color);
    allParts.push(...parts);
  }

  return allParts.length > 0 ? allParts : [{ type: FormattedTextPartType.TEXT, content: text }];
}
