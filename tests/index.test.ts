import { describe, it, expect } from 'bun:test';
import { existsSync } from 'fs';

describe('index', () => {
  it('entry point file exists', () => {
    expect(existsSync('./src/index.tsx')).toBe(true);
  });

  it('exports render call with correct structure', async () => {
    const content = await Bun.file('./src/index.tsx').text();

    expect(content).toContain("import { render } from 'ink'");
    expect(content).toContain("import { App } from './components/App'");
    expect(content).toContain('render(<App />');
    // Ctrl+C handled via custom stdin filter (str.includes('\x03'))
    expect(content).toContain("str.includes('\\x03')");
  });
});
