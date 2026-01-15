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
    expect(content).toContain('render(<App');
    expect(content).toContain('exitOnCtrlC: true');
  });
});
