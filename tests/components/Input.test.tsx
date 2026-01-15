import { describe, it, expect, mock } from 'bun:test';
import { render } from 'ink-testing-library';
import { Input, applyInputEvent } from '../../src/components/Input';
import { renderWithTheme } from '../utils/theme-test-utils';

describe('Input', () => {
  describe('enabled state', () => {
    it('shows prompt indicator', () => {
      const { lastFrame } = render(renderWithTheme(<Input onSubmit={() => {}} />));

      expect(lastFrame()).toContain('›');
    });

    it('shows placeholder when empty', () => {
      const { lastFrame } = render(renderWithTheme(<Input onSubmit={() => {}} />));

      expect(lastFrame()).toContain('ask anything...');
    });

    it('shows cursor indicator', () => {
      const { lastFrame } = render(renderWithTheme(<Input onSubmit={() => {}} />));

      expect(lastFrame()).toContain('▎');
    });
  });

  describe('disabled state', () => {
    it('hides prompt when disabled', () => {
      const { lastFrame } = render(
        renderWithTheme(<Input onSubmit={() => {}} disabled={true} />)
      );

      expect(lastFrame()).not.toContain('›');
      expect(lastFrame()).not.toContain('ask anything...');
    });

    it('hides cursor when disabled', () => {
      const { lastFrame } = render(
        renderWithTheme(<Input onSubmit={() => {}} disabled={true} />)
      );

      expect(lastFrame()).not.toContain('▎');
    });
  });

  describe('input logic', () => {
    it('updates the rendered value when typing', async () => {
      const onSubmit = mock<(text: string) => void>(() => undefined);
      const { lastFrame, stdin, stdout } = render(
        renderWithTheme(<Input onSubmit={onSubmit} />)
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
      const onSubmit = mock<(text: string) => void>(() => undefined);
      const result = applyInputEvent('   ', '', {
        return: true,
        backspace: false,
        delete: false,
        ctrl: false,
        meta: false,
      });
      expect(result.submitted).toBeNull();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('ignores meta-modified input', () => {
      const onSubmit = mock<(text: string) => void>(() => undefined);
      const result = applyInputEvent('h', 'a', {
        return: false,
        backspace: false,
        delete: false,
        ctrl: false,
        meta: true,
      });
      expect(result.nextValue).toBe('h');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does nothing when disabled', () => {
      const onSubmit = mock<(text: string) => void>(() => undefined);
      const { lastFrame, stdin } = render(
        renderWithTheme(<Input onSubmit={onSubmit} disabled={true} />)
      );

      stdin.write('hello');
      stdin.write('\r');

      expect(onSubmit).not.toHaveBeenCalled();
      expect(lastFrame()).not.toContain('hello');
    });

    it('applyInputEvent appends typed characters', () => {
      const result = applyInputEvent('', 'hi', {
        return: false,
        backspace: false,
        delete: false,
        ctrl: false,
        meta: false,
      });
      expect(result.nextValue).toBe('hi');
      expect(result.submitted).toBeNull();
    });

    it('applyInputEvent handles backspace and delete', () => {
      const backspaceResult = applyInputEvent('hi', '', {
        return: false,
        backspace: true,
        delete: false,
        ctrl: false,
        meta: false,
      });
      expect(backspaceResult.nextValue).toBe('h');

      const deleteResult = applyInputEvent('hi', '', {
        return: false,
        backspace: false,
        delete: true,
        ctrl: false,
        meta: false,
      });
      expect(deleteResult.nextValue).toBe('h');
    });

    it('applyInputEvent submits trimmed value on return', () => {
      const result = applyInputEvent('  hello  ', '', {
        return: true,
        backspace: false,
        delete: false,
        ctrl: false,
        meta: false,
      });
      expect(result.submitted).toBe('hello');
      expect(result.nextValue).toBe('');
    });
  });
});
