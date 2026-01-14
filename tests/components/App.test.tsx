import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { render } from 'ink-testing-library';
import { App } from '../../src/components/App';

describe('App', () => {
  let testDir: string;
  let commandsDir: string;
  let originalCwd: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'agent-test-'));
    commandsDir = join(testDir, '.nila', 'commands');
    mkdirSync(commandsDir, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  it('discovers commands on mount', async () => {
    writeFileSync(join(commandsDir, 'makepr.md'), '# Make PR\n\nCreate a pull request');

    const { lastFrame } = render(<App />);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(lastFrame()).toBeTruthy();
  });

  it('/help input displays help output', async () => {
    writeFileSync(join(commandsDir, 'makepr.md'), '# Make PR\n\nCreate a pull request');
    writeFileSync(join(commandsDir, 'commit.md'), 'Create a git commit');

    const { stdin, lastFrame, stdout } = render(<App />);

    await new Promise(resolve => setTimeout(resolve, 200));

    stdin.write('/help');
    await new Promise(resolve => setTimeout(resolve, 50));
    stdin.write('\r');

    await new Promise(resolve => setTimeout(resolve, 200));

    const output = lastFrame() ?? '';
    const frames = stdout.frames;
    const lastFewFrames = frames.slice(-5).join('\n');
    
    expect(lastFewFrames).toContain('/makepr');
    expect(lastFewFrames).toContain('/commit');
  });

  it('/help shows "No commands or skills available" when no commands discovered', async () => {
    rmSync(commandsDir, { recursive: true, force: true });

    const { stdin, lastFrame, stdout } = render(<App />);

    await new Promise(resolve => setTimeout(resolve, 200));

    stdin.write('/help');
    await new Promise(resolve => setTimeout(resolve, 50));
    stdin.write('\r');

    await new Promise(resolve => setTimeout(resolve, 200));

    const output = lastFrame() ?? '';
    const frames = stdout.frames;
    const lastFewFrames = frames.slice(-5).join('\n');
    
    expect(lastFewFrames).toContain('No commands or skills available');
  });

  it('unknown command shows error message', async () => {
    const { stdin, stdout } = render(<App />);

    await new Promise(resolve => setTimeout(resolve, 200));

    stdin.write('/nonexistent');
    await new Promise(resolve => setTimeout(resolve, 50));
    stdin.write('\r');

    await new Promise(resolve => setTimeout(resolve, 200));

    const frames = stdout.frames;
    const lastFewFrames = frames.slice(-5).join('\n');
    
    expect(lastFewFrames).toContain('Unknown command or skill');
    expect(lastFewFrames).toContain('/nonexistent');
  });

  it('command invocation shows in transcript', async () => {
    writeFileSync(join(commandsDir, 'makepr.md'), '# Make PR\n\nCreate a pull request');

    const { stdin, stdout } = render(<App />);

    await new Promise(resolve => setTimeout(resolve, 200));

    stdin.write('/makepr');
    await new Promise(resolve => setTimeout(resolve, 50));
    stdin.write('\r');

    await new Promise(resolve => setTimeout(resolve, 200));

    const frames = stdout.frames;
    const lastFewFrames = frames.slice(-5).join('\n');
    
    expect(lastFewFrames).toContain('/makepr');
  });
});

