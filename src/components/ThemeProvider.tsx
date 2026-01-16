import { createContext, useContext, useState, type ReactNode } from 'react';
import { getTheme, type Theme, type ThemeName } from '../shared/themes';

type ThemeContextValue = {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  defaultTheme?: ThemeName;
  children: ReactNode;
};

export function ThemeProvider({
  defaultTheme = 'dark',
  children,
}: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<ThemeName>(defaultTheme);
  const theme = getTheme(themeName);

  const setTheme = (name: ThemeName) => {
    setThemeName(name);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

