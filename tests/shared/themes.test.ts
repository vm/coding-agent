import { describe, it, expect } from 'bun:test';
import { lightTheme, darkTheme, getTheme, type Theme } from '../../src/shared/themes';

describe('themes', () => {
  function validateThemeStructure(theme: Theme): void {
    expect(theme.banner).toBeDefined();
    expect(theme.banner.length).toBe(6);
    expect(theme.userMessage).toBeDefined();
    expect(theme.assistantMessage).toBeDefined();
    expect(theme.thinking).toBeDefined();
    expect(theme.toolStatus).toBeDefined();
    expect(theme.toolStatus.running).toBeDefined();
    expect(theme.toolStatus.done).toBeDefined();
    expect(theme.toolStatus.error).toBeDefined();
    expect(theme.input).toBeDefined();
    expect(theme.input.prompt).toBeDefined();
    expect(theme.input.text).toBeDefined();
    expect(theme.input.placeholder).toBeDefined();
    expect(theme.input.cursor).toBeDefined();
    expect(theme.diff).toBeDefined();
    expect(theme.diff.hunkHeader).toBeDefined();
    expect(theme.diff.separator).toBeDefined();
    expect(theme.diff.deletion).toBeDefined();
    expect(theme.diff.addition).toBeDefined();
    expect(theme.diff.truncated).toBeDefined();
    expect(theme.diff.context).toBeDefined();
    expect(theme.codeBlock).toBeDefined();
    expect(theme.codeBlock.border).toBeDefined();
    expect(theme.codeBlock.content).toBeDefined();
    expect(theme.codeBlock.commandPrefix).toBeDefined();
    expect(theme.error).toBeDefined();
    expect(theme.text).toBeDefined();
    expect(theme.text.primary).toBeDefined();
    expect(theme.text.secondary).toBeDefined();
  }

  function validateNonEmptyStrings(theme: Theme): void {
    expect(theme.banner.every((color) => typeof color === 'string' && color.length > 0)).toBe(true);
    expect(typeof theme.userMessage === 'string' && theme.userMessage.length > 0).toBe(true);
    expect(typeof theme.assistantMessage === 'string' && theme.assistantMessage.length > 0).toBe(true);
    expect(typeof theme.thinking === 'string' && theme.thinking.length > 0).toBe(true);
    expect(typeof theme.toolStatus.running === 'string' && theme.toolStatus.running.length > 0).toBe(true);
    expect(typeof theme.toolStatus.done === 'string' && theme.toolStatus.done.length > 0).toBe(true);
    expect(typeof theme.toolStatus.error === 'string' && theme.toolStatus.error.length > 0).toBe(true);
    expect(typeof theme.input.prompt === 'string' && theme.input.prompt.length > 0).toBe(true);
    expect(typeof theme.input.text === 'string' && theme.input.text.length > 0).toBe(true);
    expect(typeof theme.input.placeholder === 'string' && theme.input.placeholder.length > 0).toBe(true);
    expect(typeof theme.input.cursor === 'string' && theme.input.cursor.length > 0).toBe(true);
    expect(typeof theme.diff.hunkHeader === 'string' && theme.diff.hunkHeader.length > 0).toBe(true);
    expect(typeof theme.diff.separator === 'string' && theme.diff.separator.length > 0).toBe(true);
    expect(typeof theme.diff.deletion === 'string' && theme.diff.deletion.length > 0).toBe(true);
    expect(typeof theme.diff.addition === 'string' && theme.diff.addition.length > 0).toBe(true);
    expect(typeof theme.diff.truncated === 'string' && theme.diff.truncated.length > 0).toBe(true);
    expect(typeof theme.diff.context === 'string' && theme.diff.context.length > 0).toBe(true);
    expect(typeof theme.codeBlock.border === 'string' && theme.codeBlock.border.length > 0).toBe(true);
    expect(typeof theme.codeBlock.content === 'string' && theme.codeBlock.content.length > 0).toBe(true);
    expect(typeof theme.codeBlock.commandPrefix === 'string' && theme.codeBlock.commandPrefix.length > 0).toBe(true);
    expect(typeof theme.error === 'string' && theme.error.length > 0).toBe(true);
    expect(typeof theme.text.primary === 'string' && theme.text.primary.length > 0).toBe(true);
    expect(typeof theme.text.secondary === 'string' && theme.text.secondary.length > 0).toBe(true);
  }

  it('lightTheme has all required properties', () => {
    validateThemeStructure(lightTheme);
  });

  it('darkTheme has all required properties', () => {
    validateThemeStructure(darkTheme);
  });

  it('lightTheme has non-empty color strings', () => {
    validateNonEmptyStrings(lightTheme);
  });

  it('darkTheme has non-empty color strings', () => {
    validateNonEmptyStrings(darkTheme);
  });

  it('themes are different', () => {
    expect(lightTheme.banner).not.toEqual(darkTheme.banner);
    expect(lightTheme.userMessage).not.toEqual(darkTheme.userMessage);
    expect(lightTheme.assistantMessage).not.toEqual(darkTheme.assistantMessage);
  });

  it('getTheme returns light theme for "light"', () => {
    const theme = getTheme('light');
    expect(theme).toBe(lightTheme);
  });

  it('getTheme returns dark theme for "dark"', () => {
    const theme = getTheme('dark');
    expect(theme).toBe(darkTheme);
  });

  it('getTheme defaults to dark for invalid input', () => {
    const theme = getTheme('invalid' as 'light' | 'dark');
    expect(theme).toBe(darkTheme);
  });
});

