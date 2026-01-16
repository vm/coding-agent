import { describe, it, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { ThemeProvider, useTheme } from '../../src/components/ThemeProvider';
import { darkTheme, lightTheme } from '../../src/shared/themes';
import { Text } from 'ink';

function TestComponent() {
  const { theme, themeName } = useTheme();
  return (
    <Text>
      {themeName}:{theme.userMessage}
    </Text>
  );
}

describe('ThemeProvider', () => {
  it('defaults to dark theme when no defaultTheme prop', () => {
    const { lastFrame } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const output = lastFrame() ?? '';
    expect(output).toContain('dark');
    expect(output).toContain(darkTheme.userMessage);
  });

  it('uses defaultTheme prop when provided', () => {
    const { lastFrame } = render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    const output = lastFrame() ?? '';
    expect(output).toContain('light');
    expect(output).toContain(lightTheme.userMessage);
  });

  it('provides theme context to children', () => {
    const { lastFrame } = render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    );

    const output = lastFrame() ?? '';
    expect(output).toContain('dark');
    expect(output).toContain(darkTheme.userMessage);
  });

  it('setTheme updates the theme', () => {
    function ToggleComponent() {
      const { theme, themeName, setTheme } = useTheme();
      if (themeName === 'dark') {
        setTheme('light');
      }
      return <Text>{themeName}:{theme.userMessage}</Text>;
    }

    const { lastFrame } = render(
      <ThemeProvider defaultTheme="dark">
        <ToggleComponent />
      </ThemeProvider>
    );

    const output = lastFrame() ?? '';
    expect(output).toContain('light');
    expect(output).toContain(lightTheme.userMessage);
  });
});

