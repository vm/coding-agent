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
    expect(result).toEqual([{ type: FormattedTextPartType.TEXT, content: 'hello' }]);
  });

  it('parses bold text', () => {
    const result = parseMarkdown('**bold**');
    expect(result).toEqual([{ type: FormattedTextPartType.BOLD, content: 'bold' }]);
  });

  it('parses italic text', () => {
    const result = parseMarkdown('*italic*');
    expect(result).toEqual([{ type: FormattedTextPartType.ITALIC, content: 'italic' }]);
  });

  it('parses inline code', () => {
    const result = parseMarkdown('`code`');
    expect(result).toEqual([{ type: FormattedTextPartType.INLINE_CODE, content: 'code' }]);
  });

  it('parses mixed formatting', () => {
    const result = parseMarkdown('**bold** and *italic*');
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({ type: FormattedTextPartType.BOLD, content: 'bold' });
    expect(result[1]).toEqual({ type: FormattedTextPartType.TEXT, content: ' and ' });
    expect(result[2]).toEqual({ type: FormattedTextPartType.ITALIC, content: 'italic' });
  });

  it('parses nested formatting - bold with italic', () => {
    const result = parseMarkdown('**bold *italic* text**');
    expect(result.length).toBe(1);
    expect(result[0].type).toBe(FormattedTextPartType.BOLD);
    expect(result[0].content).toContain('italic');
  });

  it('parses escaped characters', () => {
    const result = parseMarkdown('\\*not italic\\*');
    expect(result).toEqual([{ type: FormattedTextPartType.TEXT, content: '*not italic*' }]);
  });

  it('parses escaped backticks', () => {
    const result = parseMarkdown('\\`not code\\`');
    expect(result).toEqual([{ type: FormattedTextPartType.TEXT, content: '`not code`' }]);
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
    expect(result).toEqual([{ type: FormattedTextPartType.INLINE_CODE, content: '**bold**' }]);
  });

  it('parses multiple formats in sequence', () => {
    const result = parseMarkdown('**bold** *italic* `code`');
    expect(result.length).toBe(5);
    expect(result[0]).toEqual({ type: FormattedTextPartType.BOLD, content: 'bold' });
    expect(result[1]).toEqual({ type: FormattedTextPartType.TEXT, content: ' ' });
    expect(result[2]).toEqual({ type: FormattedTextPartType.ITALIC, content: 'italic' });
    expect(result[3]).toEqual({ type: FormattedTextPartType.TEXT, content: ' ' });
    expect(result[4]).toEqual({ type: FormattedTextPartType.INLINE_CODE, content: 'code' });
  });

  it('parses text with formatting at start', () => {
    const result = parseMarkdown('**bold** text');
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ type: FormattedTextPartType.BOLD, content: 'bold' });
    expect(result[1]).toEqual({ type: FormattedTextPartType.TEXT, content: ' text' });
  });

  it('parses text with formatting at end', () => {
    const result = parseMarkdown('text **bold**');
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ type: FormattedTextPartType.TEXT, content: 'text ' });
    expect(result[1]).toEqual({ type: FormattedTextPartType.BOLD, content: 'bold' });
  });

  it('parses text with formatting in middle', () => {
    const result = parseMarkdown('start **bold** end');
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({ type: FormattedTextPartType.TEXT, content: 'start ' });
    expect(result[1]).toEqual({ type: FormattedTextPartType.BOLD, content: 'bold' });
    expect(result[2]).toEqual({ type: FormattedTextPartType.TEXT, content: ' end' });
  });

  it('handles single asterisk that is not italic', () => {
    const result = parseMarkdown('*');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles code block with newlines', () => {
    const result = parseMarkdown('`line1\nline2`');
    expect(result).toEqual([{ type: FormattedTextPartType.INLINE_CODE, content: 'line1\nline2' }]);
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
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({ type: FormattedTextPartType.BOLD, content: 'first' });
    expect(result[1]).toEqual({ type: FormattedTextPartType.TEXT, content: ' ' });
    expect(result[2]).toEqual({ type: FormattedTextPartType.BOLD, content: 'second' });
  });

  it('handles multiple italic sections', () => {
    const result = parseMarkdown('*first* *second*');
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({ type: FormattedTextPartType.ITALIC, content: 'first' });
    expect(result[1]).toEqual({ type: FormattedTextPartType.TEXT, content: ' ' });
    expect(result[2]).toEqual({ type: FormattedTextPartType.ITALIC, content: 'second' });
  });

  it('handles bold and italic adjacent', () => {
    const result = parseMarkdown('**bold***italic*');
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ type: FormattedTextPartType.BOLD, content: 'bold' });
    expect(result[1]).toEqual({ type: FormattedTextPartType.ITALIC, content: 'italic' });
  });

  it('preserves whitespace in plain text', () => {
    const result = parseMarkdown('  spaces  ');
    expect(result).toEqual([{ type: FormattedTextPartType.TEXT, content: '  spaces  ' }]);
  });

  it('handles very long text', () => {
    const longText = 'a'.repeat(1000);
    const result = parseMarkdown(longText);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].content.length).toBe(1000);
  });

  it('parses colored text', () => {
    const result = parseMarkdown('{color:red}text{/color}');
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({ type: FormattedTextPartType.TEXT, content: 'text', color: 'red' });
  });

  it('parses colored text with different colors', () => {
    const result = parseMarkdown('{color:green}success{/color}');
    expect(result[0].color).toBe('green');
    expect(result[0].content).toBe('success');
  });

  it('handles unclosed color tag', () => {
    const result = parseMarkdown('{color:red}text');
    expect(result.length).toBeGreaterThan(0);
  });

  it('parses color with nested formatting', () => {
    const result = parseMarkdown('**bold {color:red}text{/color}**');
    expect(result.length).toBe(1);
    expect(result[0].type).toBe(FormattedTextPartType.BOLD);
    expect(result[0].content).toContain('text');
  });

  it('handles escaped braces in color content', () => {
    const result = parseMarkdown('{color:red}\\{text\\}{/color}');
    expect(result[0].content).toBe('{text}');
  });

  it('handles invalid color name', () => {
    const result = parseMarkdown('{color:invalid}text{/color}');
    expect(result.length).toBe(1);
    expect(result[0].color).toBeUndefined();
  });

  it('parses multiple colored sections', () => {
    const result = parseMarkdown('{color:red}red{/color} {color:blue}blue{/color}');
    expect(result.length).toBe(3);
    expect(result[0].color).toBe('red');
    expect(result[2].color).toBe('blue');
  });
});
