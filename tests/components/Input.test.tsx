import { describe, it, expect, mock } from 'bun:test';
import { render } from 'ink-testing-library';
import { Input, applyInputEvent, InputState } from '../../src/components/Input';

const baseKey = {
  return: false,
  backspace: false,
  delete: false,
  ctrl: false,
  meta: false,
  leftArrow: false,
  rightArrow: false,
};

function state(value: string, cursor?: number): InputState {
  return { value, cursor: cursor ?? value.length };
}

describe('Input', () => {
  describe('enabled state', () => {
    it('shows prompt indicator', () => {
      const { lastFrame } = render(<Input onSubmit={() => {}} />);

      expect(lastFrame()).toContain('›');
    });

    it('shows placeholder when empty', () => {
      const { lastFrame } = render(<Input onSubmit={() => {}} />);

      expect(lastFrame()).toContain('ask anything...');
    });

    it('shows cursor indicator', () => {
      const { lastFrame } = render(<Input onSubmit={() => {}} />);

      expect(lastFrame()).toContain('▎');
    });
  });

  describe('disabled state', () => {
    it('hides prompt when disabled', () => {
      const { lastFrame } = render(
        <Input onSubmit={() => {}} disabled={true} />
      );

      expect(lastFrame()).not.toContain('›');
      expect(lastFrame()).not.toContain('ask anything...');
    });

    it('hides cursor when disabled', () => {
      const { lastFrame } = render(
        <Input onSubmit={() => {}} disabled={true} />
      );

      expect(lastFrame()).not.toContain('▎');
    });
  });

  describe('input logic', () => {
    it('updates the rendered value when typing', async () => {
      const onSubmit = mock<(text: string) => void>(() => undefined);
      const { lastFrame, stdin, stdout } = render(
        <Input onSubmit={onSubmit} />
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      const startFrames = stdout.frames.length;
      stdin.write('zzz');
      for (let i = 0; i < 50; i++) {
        if (stdout.frames.length > startFrames) break;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const output = lastFrame() ?? '';
      expect(output).toContain('zzz');
      expect(output).not.toContain('ask anything...');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit whitespace-only input', () => {
      const result = applyInputEvent(state('   '), '', {
        ...baseKey,
        return: true,
      });
      expect(result.submitted).toBeNull();
    });

    it('ignores meta-modified input', () => {
      const result = applyInputEvent(state('h'), 'a', {
        ...baseKey,
        meta: true,
      });
      expect(result.nextState.value).toBe('h');
    });

    it('does nothing when disabled', () => {
      const onSubmit = mock<(text: string) => void>(() => undefined);
      const { lastFrame, stdin } = render(
        <Input onSubmit={onSubmit} disabled={true} />
      );

      stdin.write('hello');
      stdin.write('\r');

      expect(onSubmit).not.toHaveBeenCalled();
      expect(lastFrame()).not.toContain('hello');
    });

    it('applyInputEvent appends typed characters', () => {
      const result = applyInputEvent(state(''), 'hi', baseKey);
      expect(result.nextState.value).toBe('hi');
      expect(result.nextState.cursor).toBe(2);
      expect(result.submitted).toBeNull();
    });

    it('applyInputEvent handles backspace at cursor', () => {
      // Cursor at end
      const backspaceResult = applyInputEvent(state('hi', 2), '', {
        ...baseKey,
        backspace: true,
      });
      expect(backspaceResult.nextState.value).toBe('h');
      expect(backspaceResult.nextState.cursor).toBe(1);

      // Cursor in middle
      const midResult = applyInputEvent(state('abc', 2), '', {
        ...baseKey,
        backspace: true,
      });
      expect(midResult.nextState.value).toBe('ac');
      expect(midResult.nextState.cursor).toBe(1);

      // Cursor at start (no-op)
      const startResult = applyInputEvent(state('hi', 0), '', {
        ...baseKey,
        backspace: true,
      });
      expect(startResult.nextState.value).toBe('hi');
      expect(startResult.nextState.cursor).toBe(0);
    });

    it('applyInputEvent submits trimmed value on return', () => {
      const result = applyInputEvent(state('  hello  '), '', {
        ...baseKey,
        return: true,
      });
      expect(result.submitted).toBe('hello');
      expect(result.nextState.value).toBe('');
      expect(result.nextState.cursor).toBe(0);
    });

    it('applyInputEvent handles left arrow', () => {
      const result = applyInputEvent(state('hello', 3), '', {
        ...baseKey,
        leftArrow: true,
      });
      expect(result.nextState.value).toBe('hello');
      expect(result.nextState.cursor).toBe(2);

      // At start (clamped to 0)
      const startResult = applyInputEvent(state('hello', 0), '', {
        ...baseKey,
        leftArrow: true,
      });
      expect(startResult.nextState.cursor).toBe(0);
    });

    it('applyInputEvent handles right arrow', () => {
      const result = applyInputEvent(state('hello', 2), '', {
        ...baseKey,
        rightArrow: true,
      });
      expect(result.nextState.value).toBe('hello');
      expect(result.nextState.cursor).toBe(3);

      // At end (clamped to length)
      const endResult = applyInputEvent(state('hello', 5), '', {
        ...baseKey,
        rightArrow: true,
      });
      expect(endResult.nextState.cursor).toBe(5);
    });

    it('applyInputEvent inserts at cursor position', () => {
      const result = applyInputEvent(state('hllo', 1), 'e', baseKey);
      expect(result.nextState.value).toBe('hello');
      expect(result.nextState.cursor).toBe(2);
    });
  });
});
