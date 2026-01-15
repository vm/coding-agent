import { useState, useRef, useEffect } from 'react';
import { useInput } from 'ink';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { useTheme } from './ThemeProvider';

type Props = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
};

export type InputKey = {
  return: boolean;
  backspace: boolean;
  delete: boolean;
  ctrl: boolean;
  meta: boolean;
};

export function applyInputEvent(
  prevValue: string,
  input: string,
  key: InputKey
): { nextValue: string; submitted: string | null } {
  if (key.return) {
    const trimmed = prevValue.trim();
    if (trimmed) return { nextValue: '', submitted: trimmed };
    return { nextValue: prevValue, submitted: null };
  }

  if (key.backspace || key.delete) {
    return { nextValue: prevValue.slice(0, -1), submitted: null };
  }

  if (!key.ctrl && !key.meta && input) {
    return { nextValue: prevValue + input, submitted: null };
  }

  return { nextValue: prevValue, submitted: null };
}

export function Input({ onSubmit, disabled = false }: Props) {
  const { theme } = useTheme();
  const [value, setValue] = useState('');
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useInput((input, key) => {
    if (disabled) return;

    const result = applyInputEvent(valueRef.current, input, key);
    setValue(result.nextValue);
    if (result.submitted) {
      onSubmit(result.submitted);
    }
  });

  if (disabled) {
    return (
      <Box>
        <Text color={theme.toolStatus.running}>
          <Spinner type="dots" />
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color={theme.input.prompt} bold>
        ›
      </Text>
      <Text> </Text>
      {value.length > 0 ? (
        <Text color={theme.input.text}>{value}</Text>
      ) : (
        <Text color={theme.input.placeholder} dimColor>
          ask anything...
        </Text>
      )}
      <Text color={theme.input.cursor}>▎</Text>
    </Box>
  );
}
