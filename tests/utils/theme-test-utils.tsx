import { ThemeProvider } from '../../src/components/ThemeProvider';
import type { ThemeName } from '../../src/shared/themes';
import type { ReactNode } from 'react';

export function renderWithTheme(
  component: ReactNode,
  themeName: ThemeName = 'dark'
) {
  return (
    <ThemeProvider defaultTheme={themeName}>{component}</ThemeProvider>
  );
}

