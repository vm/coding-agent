# Color Themes (Light/Dark Mode)

## Context: what this plan is and when to use it

This plan describes how to add **color theme support** to the agent UI, enabling light and dark mode with a clean, testable architecture.

- **When you want this**: you want users to be able to switch between light and dark color themes, or have the theme automatically match their terminal preferences.
- **What it enables**:
  - **Theme system**: centralized color definitions for light and dark modes
  - **Theme switching**: ability to toggle themes or detect terminal preference
  - **Consistent colors**: all UI components use theme-aware colors instead of hardcoded values
  - **Testability**: themes can be tested independently and components can be tested with different themes

This document intentionally avoids implementation-sized code blocks. The source of truth should live in `src/` and be validated by `tests/`.

## Where to start in this repo

- **Color definitions**: `src/shared/themes.ts` (new file)
- **Theme context**: `src/components/ThemeProvider.tsx` (new file)
- **UI components**: `src/components/App.tsx`, `src/components/TranscriptView.tsx`, `src/components/Input.tsx`, `src/components/TranscriptLines.tsx`
- **Types**: `src/shared/types.ts` (extend with theme types)

---

## Phase 1: Theme System Foundation (PR 1)

Create the core theme system with light and dark theme definitions.

### What changes

- **Add**: `src/shared/themes.ts`
  - Define `Theme` type with all color properties
  - Export `lightTheme` and `darkTheme` objects
  - Export `ThemeName` type: `'light' | 'dark'`
  - Export helper function `getTheme(name: ThemeName): Theme`

- **Modify**: `src/shared/types.ts`
  - Add `ThemeName` type export (re-export from themes)
  - Keep `TranscriptLine` type but note that colors will come from theme

### Theme color mapping

Map all current hardcoded colors to theme properties:

**Current colors found:**
- Banner gradient colors (6 colors)
- User message: `yellow`
- Assistant message: `white`
- Thinking indicator: `magenta` (dim)
- Tool status: `yellow` (running), `green` (done), `red` (error)
- Input prompt: `cyan` (bold)
- Input text: `white` (active), `gray` (dim, placeholder)
- Input cursor: `cyan`
- Diff lines: `cyan` (hunk headers), `gray` (separators), `red` (deletions), `green` (additions), `yellow` (truncated)
- Code block borders: `gray` (dim)
- Code block content: `cyan` (read_file), `white` (run_command), `blueBright` (command prefix)
- Error messages: `red`
- General text: `white`, `gray` (dim)

**Theme structure:**
```typescript
type Theme = {
  banner: string[];
  userMessage: string;
  assistantMessage: string;
  thinking: string;
  toolStatus: {
    running: string;
    done: string;
    error: string;
  };
  input: {
    prompt: string;
    text: string;
    placeholder: string;
    cursor: string;
  };
  diff: {
    hunkHeader: string;
    separator: string;
    deletion: string;
    addition: string;
    truncated: string;
    context: string;
  };
  codeBlock: {
    border: string;
    content: string;
    commandPrefix: string;
  };
  error: string;
  text: {
    primary: string;
    secondary: string;
  };
}
```

### Light theme colors

- Banner: softer, lighter gradient colors
- User message: darker yellow/orange
- Assistant message: dark gray/black
- Thinking: purple/magenta
- Tool status: muted versions (amber, teal, coral)
- Input: blue tones
- Diff: traditional light diff colors (red/green)
- Code blocks: light borders, dark text
- Error: red
- Text: dark gray/black primary, light gray secondary

### Dark theme colors

- Banner: current vibrant gradient (keep as-is)
- User message: bright yellow
- Assistant message: white
- Thinking: magenta
- Tool status: current colors (yellow, green, red)
- Input: cyan
- Diff: current colors
- Code blocks: current colors
- Error: red
- Text: white primary, gray secondary

### Unit tests: theme system

- [ ] **Theme exports**: `lightTheme` and `darkTheme` are exported
- [ ] **Theme structure**: both themes have all required properties
- [ ] **getTheme helper**: returns correct theme for 'light' and 'dark'
- [ ] **getTheme invalid**: throws or returns default for invalid theme name
- [ ] **Theme completeness**: all properties are non-empty strings

### Suggested test cases

- [ ] **Light theme has all colors**: verify every property in `lightTheme` is defined
- [ ] **Dark theme has all colors**: verify every property in `darkTheme` is defined
- [ ] **Themes are different**: verify at least some colors differ between themes
- [ ] **getTheme('light')**: returns lightTheme
- [ ] **getTheme('dark')**: returns darkTheme

---

## Phase 2: Theme Context Provider (PR 2)

Create React context to provide theme throughout the component tree.

### What changes

- **Add**: `src/components/ThemeProvider.tsx`
  - Exports `ThemeProvider` component that wraps children
  - Exports `useTheme()` hook to access current theme
  - Manages theme state (defaults to 'dark' or detects terminal)
  - Provides theme via React Context

- **Modify**: `src/index.tsx`
  - Wrap `<App />` with `<ThemeProvider>`

### Theme detection strategy

**Option A: Default to dark** (simpler, recommended for PR 2)
- Default theme is 'dark'
- Can be overridden later with user preference or terminal detection

**Option B: Detect terminal** (for later PR)
- Check `process.env.COLORTERM` or terminal capabilities
- Fall back to 'dark' if detection fails

### API design

```typescript
// ThemeProvider props
type ThemeProviderProps = {
  defaultTheme?: ThemeName;
  children: React.ReactNode;
}

// useTheme hook
function useTheme(): {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
}
```

### Unit tests: ThemeProvider

- [ ] **Default theme**: ThemeProvider defaults to 'dark' when no defaultTheme prop
- [ ] **Custom default**: ThemeProvider uses defaultTheme prop when provided
- [ ] **useTheme hook**: returns theme object and themeName
- [ ] **setTheme**: calling setTheme updates the theme
- [ ] **Theme propagation**: child components receive updated theme via useTheme

### Suggested test cases

- [ ] **Default is dark**: render ThemeProvider, useTheme returns dark theme
- [ ] **Custom default**: render ThemeProvider with defaultTheme='light', useTheme returns light theme
- [ ] **Theme switching**: render ThemeProvider, call setTheme('light'), verify theme updates
- [ ] **Context isolation**: multiple ThemeProviders don't interfere

---

## Phase 3: Update Components to Use Theme (PR 3)

Refactor all components to use theme colors instead of hardcoded values.

### What changes

- **Modify**: `src/components/App.tsx`
  - Use `useTheme()` hook
  - Replace `gradientColors` array with `theme.banner`
  - Update banner rendering to use theme colors
  - Update cwd display color to use `theme.text.secondary`

- **Modify**: `src/components/TranscriptView.tsx`
  - Use `useTheme()` hook
  - Update `toolStatusColor()` to use `theme.toolStatus.*`
  - Update `buildTranscriptLines()` to use theme colors:
    - User messages: `theme.userMessage`
    - Assistant messages: `theme.assistantMessage`
    - Thinking indicator: `theme.thinking`
    - Error messages: `theme.error`
  - Update `parseDiffLine()` to use `theme.diff.*`
  - Update `renderCodeBlock()` to use `theme.codeBlock.*`
  - Update `parseToolResultLines()` to use theme colors

- **Modify**: `src/components/Input.tsx`
  - Use `useTheme()` hook
  - Replace hardcoded colors with `theme.input.*`

- **Modify**: `src/components/TranscriptLines.tsx`
  - No changes needed (already receives colors via props)

### Color replacement strategy

1. Add `useTheme()` hook call at top of component
2. Replace each hardcoded color string with corresponding theme property
3. Keep `dimColor` prop logic (may need theme-aware dimming later)
4. Test each component visually and with unit tests

### Component test updates

- [ ] **App component**: banner uses theme.banner colors
- [ ] **TranscriptView**: user messages use theme.userMessage
- [ ] **TranscriptView**: assistant messages use theme.assistantMessage
- [ ] **TranscriptView**: tool status colors use theme.toolStatus
- [ ] **TranscriptView**: diff colors use theme.diff
- [ ] **TranscriptView**: code block colors use theme.codeBlock
- [ ] **Input**: prompt uses theme.input.prompt
- [ ] **Input**: text uses theme.input.text
- [ ] **Input**: placeholder uses theme.input.placeholder
- [ ] **Input**: cursor uses theme.input.cursor

### Integration tests

- [ ] **Theme switching**: change theme, verify all components update colors
- [ ] **Default theme**: app renders with dark theme by default
- [ ] **Light theme**: app renders correctly with light theme

---

## Phase 4: Theme Toggle Command (PR 4)

Add keyboard shortcut or command to toggle between themes.

### What changes

- **Modify**: `src/components/App.tsx`
  - Add keyboard handler for theme toggle (e.g., `Ctrl+T` or `T` key)
  - Use `setTheme` from `useTheme()` to toggle between light/dark

### Keyboard shortcut options

**Option A: Ctrl+T** (recommended)
- Common pattern for theme toggles
- Doesn't conflict with text input

**Option B: T key** (when not in input)
- Simpler, but might conflict with user typing

**Option C: Configurable**
- Allow both, make configurable later

### Implementation details

- Only toggle when not in input field (or handle in App level)
- Show brief feedback message when theme changes
- Persist theme preference (optional, for later PR)

### Unit tests: theme toggle

- [ ] **Toggle shortcut**: pressing toggle key switches theme
- [ ] **Toggle cycles**: light → dark → light
- [ ] **No input conflict**: toggle doesn't interfere with text input
- [ ] **Visual feedback**: theme change is visible in rendered output

---

## Phase 5: Tests for Theme Integration (PR 5)

Add comprehensive tests for theme functionality across all components.

### Test coverage goals

- [ ] **Theme system tests**: `tests/shared/themes.test.ts`
  - All theme properties defined
  - Theme helper functions work correctly

- [ ] **ThemeProvider tests**: `tests/components/ThemeProvider.test.tsx`
  - Context provides theme correctly
  - Theme switching works
  - Multiple providers don't interfere

- [ ] **Component theme tests**: update existing component tests
  - `tests/components/App.test.tsx`: verify banner uses theme
  - `tests/components/TranscriptView.test.tsx`: verify colors come from theme
  - `tests/components/Input.test.tsx`: verify input colors use theme

- [ ] **Integration tests**: `tests/components/ThemeIntegration.test.tsx`
  - Full app renders with theme
  - Theme switching updates all components
  - Light and dark themes both render correctly

### Test utilities

- [ ] **Add**: `tests/utils/theme-test-utils.tsx`
  - `renderWithTheme(component, themeName?)` helper
  - Mock theme provider for isolated component tests

---

## Stacked PR Strategy

Use Graphite to create stacked PRs:

1. **PR 1**: Theme system foundation (`src/shared/themes.ts`)
   - Base: `main`
   - Branch: `graphite-base/theme-system`

2. **PR 2**: Theme context provider (`src/components/ThemeProvider.tsx`)
   - Base: `graphite-base/theme-system`
   - Branch: `graphite-base/theme-provider`

3. **PR 3**: Update components to use theme
   - Base: `graphite-base/theme-provider`
   - Branch: `graphite-base/theme-components`

4. **PR 4**: Theme toggle command
   - Base: `graphite-base/theme-components`
   - Branch: `graphite-base/theme-toggle`

5. **PR 5**: Comprehensive tests
   - Base: `graphite-base/theme-toggle`
   - Branch: `graphite-base/theme-tests`

### Graphite commands

```bash
# Create base branch
gt branch create theme-system

# Create stacked branches
gt branch create theme-provider --stack
gt branch create theme-components --stack
gt branch create theme-toggle --stack
gt branch create theme-tests --stack

# After each PR is ready
gt stack submit
```

---

## Definition of done

- [ ] Theme system exports light and dark themes with all required colors
- [ ] ThemeProvider provides theme via React Context
- [ ] All components use theme colors instead of hardcoded values
- [ ] Theme can be toggled via keyboard shortcut
- [ ] Tests cover theme system, provider, and component integration
- [ ] Both light and dark themes render correctly
- [ ] No hardcoded color strings remain in components
- [ ] Stacked PRs are created and ready for review

## Future enhancements (optional, post-MVP)

- [ ] **Terminal detection**: automatically detect terminal color scheme
- [ ] **Theme persistence**: save theme preference to config file
- [ ] **Custom themes**: allow user-defined theme files
- [ ] **Theme preview**: show color swatches in help/status
- [ ] **Accessibility**: ensure sufficient contrast ratios in both themes
- [ ] **Animated transitions**: smooth color transitions when switching themes

