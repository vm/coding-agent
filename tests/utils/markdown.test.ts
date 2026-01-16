import { describe, it, expect } from 'bun:test';
import { parseMarkdown } from '../../src/utils/markdown';
import { FormattedTextPartType } from '../../src/shared/types';

describe('parseMarkdown', () => {
  it('returns empty text part for empty string', () => {
    const result = parseMarkdown('');
    expect(result).toEqual([{ type: FormattedTextPartType.TEXT, content: '' }]);
  });

  it('parses plain text', () => {
    const result = parseMarkdown('hello');
    expect(result.length).toBeGreaterThan(0);
    expect(result.map(p => p.content).join('')).toBe('hello');
  });

  it('parses bold text', () => {
    const result = parseMarkdown('**bold**');
    expect(result.length).toBe(1);
    expect(result[0].type).toBe(FormattedTextPartType.BOLD);
    expect(result[0].content).toBe('bold');
  });

  it('parses italic text', () => {
    const result = parseMarkdown('*italic*');
    expect(result.length).toBe(1);
    expect(result[0].type).toBe(FormattedTextPartType.ITALIC);
    expect(result[0].content).toBe('italic');
  });

  it('parses inline code', () => {
    const result = parseMarkdown('`code`');
    expect(result.length).toBe(1);
    expect(result[0].type).toBe(FormattedTextPartType.INLINE_CODE);
    expect(result[0].content).toBe('code');
  });

  it('parses mixed formatting', () => {
    const result = parseMarkdown('**bold** and *italic*');
    const boldPart = result.find(p => p.type === FormattedTextPartType.BOLD);
    const italicPart = result.find(p => p.type === FormattedTextPartType.ITALIC);
    expect(boldPart).toBeDefined();
    expect(boldPart?.content).toBe('bold');
    expect(italicPart).toBeDefined();
    expect(italicPart?.content).toBe('italic');
  });

  it('parses nested formatting - bold with italic', () => {
    const result = parseMarkdown('**bold *italic* text**');
    expect(result.length).toBe(1);
    expect(result[0].type).toBe(FormattedTextPartType.BOLD);
    expect(result[0].content).toContain('italic');
  });

  it('parses escaped characters', () => {
    const result = parseMarkdown('\\*not italic\\*');
    const fullText = result.map(p => p.content).join('');
    expect(fullText).toBe('*not italic*');
    expect(result.every(p => p.type === FormattedTextPartType.TEXT)).toBe(true);
  });

  it('parses escaped backticks', () => {
    const result = parseMarkdown('\\`not code\\`');
    const fullText = result.map(p => p.content).join('');
    expect(fullText).toBe('`not code`');
    expect(result.every(p => p.type === FormattedTextPartType.TEXT)).toBe(true);
  });

  it('handles unclosed bold gracefully', () => {
    const result = parseMarkdown('**text');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles empty bold formatting', () => {
    const result = parseMarkdown('****');
    expect(result.length).toBeGreaterThan(0);
  });

  it('parses code with markdown inside as literal', () => {
    const result = parseMarkdown('`**bold**`');
    expect(result.length).toBe(1);
    expect(result[0].type).toBe(FormattedTextPartType.INLINE_CODE);
    expect(result[0].content).toBe('**bold**');
  });

  it('parses multiple formats in sequence', () => {
    const result = parseMarkdown('**bold** *italic* `code`');
    const boldPart = result.find(p => p.type === FormattedTextPartType.BOLD);
    const italicPart = result.find(p => p.type === FormattedTextPartType.ITALIC);
    const codePart = result.find(p => p.type === FormattedTextPartType.INLINE_CODE);
    expect(boldPart?.content).toBe('bold');
    expect(italicPart?.content).toBe('italic');
    expect(codePart?.content).toBe('code');
  });

  it('parses text with formatting at start', () => {
    const result = parseMarkdown('**bold** text');
    expect(result[0].type).toBe(FormattedTextPartType.BOLD);
    expect(result[0].content).toBe('bold');
    const textContent = result.filter(p => p.type === FormattedTextPartType.TEXT).map(p => p.content).join('');
    expect(textContent).toContain('text');
  });

  it('parses text with formatting at end', () => {
    const result = parseMarkdown('text **bold**');
    const boldPart = result.find(p => p.type === FormattedTextPartType.BOLD);
    expect(boldPart?.content).toBe('bold');
    const textContent = result.filter(p => p.type === FormattedTextPartType.TEXT).map(p => p.content).join('');
    expect(textContent).toContain('text');
  });

  it('parses text with formatting in middle', () => {
    const result = parseMarkdown('start **bold** end');
    const boldPart = result.find(p => p.type === FormattedTextPartType.BOLD);
    expect(boldPart?.content).toBe('bold');
    const textContent = result.filter(p => p.type === FormattedTextPartType.TEXT).map(p => p.content).join('');
    expect(textContent).toContain('start');
    expect(textContent).toContain('end');
  });

  it('handles single asterisk that is not italic', () => {
    const result = parseMarkdown('*');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles code block with newlines', () => {
    const result = parseMarkdown('`line1\nline2`');
    expect(result.length).toBe(1);
    expect(result[0].type).toBe(FormattedTextPartType.INLINE_CODE);
    expect(result[0].content).toContain('line1');
    expect(result[0].content).toContain('line2');
  });

  it('handles unclosed code block', () => {
    const result = parseMarkdown('`code');
    expect(result.length).toBeGreaterThan(0);
  });

  it('parses complex nested example', () => {
    const result = parseMarkdown('**bold *italic* and `code`**');
    expect(result[0].type).toBe(FormattedTextPartType.BOLD);
    expect(result[0].content).toContain('italic');
    expect(result[0].content).toContain('code');
  });

  it('handles multiple bold sections', () => {
    const result = parseMarkdown('**first** **second**');
    const boldParts = result.filter(p => p.type === FormattedTextPartType.BOLD);
    expect(boldParts.length).toBe(2);
    expect(boldParts[0].content).toBe('first');
    expect(boldParts[1].content).toBe('second');
  });

  it('handles multiple italic sections', () => {
    const result = parseMarkdown('*first* *second*');
    const italicParts = result.filter(p => p.type === FormattedTextPartType.ITALIC);
    expect(italicParts.length).toBe(2);
    expect(italicParts[0].content).toBe('first');
    expect(italicParts[1].content).toBe('second');
  });

  it('handles bold and italic adjacent', () => {
    const result = parseMarkdown('**bold***italic*');
    const boldPart = result.find(p => p.type === FormattedTextPartType.BOLD);
    const italicPart = result.find(p => p.type === FormattedTextPartType.ITALIC);
    expect(boldPart?.content).toBe('bold');
    expect(italicPart?.content).toBe('italic');
  });

  it('preserves whitespace in plain text', () => {
    const result = parseMarkdown('  spaces  ');
    const fullText = result.map(p => p.content).join('');
    expect(fullText).toContain('spaces');
  });

  it('handles very long text', () => {
    const longText = 'a'.repeat(1000);
    const result = parseMarkdown(longText);
    expect(result.length).toBeGreaterThan(0);
    const fullText = result.map(p => p.content).join('');
    expect(fullText.length).toBe(1000);
  });

  it('parses strikethrough text', () => {
    const result = parseMarkdown('~~deleted~~');
    const strikePart = result.find(p => p.type === FormattedTextPartType.STRIKETHROUGH);
    expect(strikePart).toBeDefined();
    expect(strikePart?.content).toBe('deleted');
  });

  it('parses fenced code blocks', () => {
    const result = parseMarkdown('```\nconst x = 1;\n```');
    const codePart = result.find(p => p.type === FormattedTextPartType.CODE);
    expect(codePart).toBeDefined();
    expect(codePart?.content).toContain('const x = 1');
  });

  it('parses unordered lists with bullet points', () => {
    const result = parseMarkdown('- item 1\n- item 2');
    const fullText = result.map(p => p.content).join('');
    expect(fullText).toContain('•');
    expect(fullText).toContain('item 1');
    expect(fullText).toContain('item 2');
  });

  it('parses ordered lists with numbering', () => {
    const result = parseMarkdown('1. first\n2. second\n3. third');
    const fullText = result.map(p => p.content).join('');
    expect(fullText).toContain('1.');
    expect(fullText).toContain('2.');
    expect(fullText).toContain('3.');
    expect(fullText).toContain('first');
    expect(fullText).toContain('second');
    expect(fullText).toContain('third');
  });

  it('parses blockquotes', () => {
    const result = parseMarkdown('> quoted text');
    const fullText = result.map(p => p.content).join('');
    expect(fullText).toContain('quoted');
  });
});
