import { Lexer, Token, Tokens } from 'marked';
import { FormattedTextPart, FormattedTextPartType } from '../shared/types';

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

function processInlineTokens(tokens: Token[]): FormattedTextPart[] {
  const parts: FormattedTextPart[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'strong': {
        const strongToken = token as Tokens.Strong;
        const content = getTextContent(strongToken.tokens ?? []);
        parts.push({
          type: FormattedTextPartType.BOLD,
          content,
        });
        break;
      }
      case 'em': {
        const emToken = token as Tokens.Em;
        const content = getTextContent(emToken.tokens ?? []);
        parts.push({
          type: FormattedTextPartType.ITALIC,
          content,
        });
        break;
      }
      case 'codespan': {
        const codeToken = token as Tokens.Codespan;
        parts.push({
          type: FormattedTextPartType.INLINE_CODE,
          content: codeToken.text,
        });
        break;
      }
      case 'del': {
        const delToken = token as Tokens.Del;
        const content = getTextContent(delToken.tokens ?? []);
        parts.push({
          type: FormattedTextPartType.STRIKETHROUGH,
          content,
        });
        break;
      }
      case 'text': {
        const textToken = token as Tokens.Text;
        if ('tokens' in textToken && Array.isArray(textToken.tokens)) {
          parts.push(...processInlineTokens(textToken.tokens));
        } else {
          parts.push({
            type: FormattedTextPartType.TEXT,
            content: textToken.text,
          });
        }
        break;
      }
      case 'escape': {
        const escapeToken = token as Tokens.Escape;
        parts.push({
          type: FormattedTextPartType.TEXT,
          content: escapeToken.text,
        });
        break;
      }
      case 'link': {
        const linkToken = token as Tokens.Link;
        const content = getTextContent(linkToken.tokens ?? []);
        parts.push({
          type: FormattedTextPartType.TEXT,
          content,
        });
        break;
      }
      case 'image': {
        const imageToken = token as Tokens.Image;
        parts.push({
          type: FormattedTextPartType.TEXT,
          content: imageToken.text || imageToken.title || '[image]',
        });
        break;
      }
      case 'br': {
        parts.push({
          type: FormattedTextPartType.TEXT,
          content: '\n',
        });
        break;
      }
      default: {
        if ('text' in token && typeof token.text === 'string') {
          parts.push({
            type: FormattedTextPartType.TEXT,
            content: token.text,
          });
        } else if ('raw' in token && typeof token.raw === 'string') {
          parts.push({
            type: FormattedTextPartType.TEXT,
            content: token.raw,
          });
        }
      }
    }
  }

  return parts;
}

function processTokens(tokens: Token[]): FormattedTextPart[] {
  const parts: FormattedTextPart[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'paragraph': {
        const paragraphToken = token as Tokens.Paragraph;
        parts.push(...processInlineTokens(paragraphToken.tokens ?? []));
        break;
      }
      case 'text': {
        const textToken = token as Tokens.Text;
        if ('tokens' in textToken && Array.isArray(textToken.tokens)) {
          parts.push(...processInlineTokens(textToken.tokens));
        } else {
          parts.push({
            type: FormattedTextPartType.TEXT,
            content: textToken.text,
          });
        }
        break;
      }
      case 'space': {
        parts.push({
          type: FormattedTextPartType.TEXT,
          content: '\n',
        });
        break;
      }
      case 'code': {
        const codeToken = token as Tokens.Code;
        parts.push({
          type: FormattedTextPartType.CODE,
          content: codeToken.text,
        });
        break;
      }
      case 'heading': {
        const headingToken = token as Tokens.Heading;
        parts.push(...processInlineTokens(headingToken.tokens ?? []));
        parts.push({ type: FormattedTextPartType.TEXT, content: '\n' });
        break;
      }
      case 'list': {
        const listToken = token as Tokens.List;
        const startNum = typeof listToken.start === 'number' ? listToken.start : 1;
        for (let idx = 0; idx < listToken.items.length; idx++) {
          const item = listToken.items[idx];
          let bullet: string;
          if (listToken.ordered) {
            const num = startNum + idx;
            bullet = item.task ? `${num}. ☐ ` : `${num}. `;
          } else {
            bullet = item.task ? '☐ ' : '• ';
          }
          parts.push({ type: FormattedTextPartType.TEXT, content: bullet });
          parts.push(...processInlineTokens(item.tokens ?? []));
          parts.push({ type: FormattedTextPartType.TEXT, content: '\n' });
        }
        break;
      }
      case 'blockquote': {
        const blockquoteToken = token as Tokens.Blockquote;
        parts.push({ type: FormattedTextPartType.TEXT, content: '> ' });
        parts.push(...processTokens(blockquoteToken.tokens ?? []));
        break;
      }
      default: {
        if ('tokens' in token && Array.isArray(token.tokens)) {
          parts.push(...processInlineTokens(token.tokens));
        } else if ('text' in token && typeof token.text === 'string') {
          parts.push({
            type: FormattedTextPartType.TEXT,
            content: token.text,
          });
        } else if ('raw' in token && typeof token.raw === 'string') {
          parts.push({
            type: FormattedTextPartType.TEXT,
            content: token.raw,
          });
        }
      }
    }
  }

  return parts;
}

export function parseMarkdown(text: string): FormattedTextPart[] {
  if (!text) {
    return [{ type: FormattedTextPartType.TEXT, content: '' }];
  }

  const lexer = new Lexer({ gfm: true, breaks: true });
  const tokens = lexer.lex(text);
  const parts = processTokens(tokens);

  return parts.length > 0 ? parts : [{ type: FormattedTextPartType.TEXT, content: text }];
}
