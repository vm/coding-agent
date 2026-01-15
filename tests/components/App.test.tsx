import { describe, it, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { App } from '../../src/components/App';

describe('App', () => {
  it('renders banner when no messages', () => {
    const { lastFrame } = render(<App />);

    const output = lastFrame() ?? '';
    expect(output).toContain('███╗   ██╗');
  });

  it('renders input component', () => {
    const { lastFrame } = render(<App />);

    const output = lastFrame() ?? '';
    expect(output).toContain('›');
  });
});
