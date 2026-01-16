import { useState, useRef, useEffect } from 'react';
import { useInput } from 'ink';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';

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
  leftArrow: boolean;
  rightArrow: boolean;
};

export type InputState = {
  value: string;
  cursor: number;
};

export function applyInputEvent(
  state: InputState,
  input: string,
  key: InputKey
): { nextState: InputState; submitted: string | null } {
  const { value, cursor } = state;

  if (key.return) {
    const trimmed = value.trim();
    if (trimmed)
      return { nextState: { value: '', cursor: 0 }, submitted: trimmed };
    return { nextState: state, submitted: null };
  }

  if (key.leftArrow) {
    return {
      nextState: { value, cursor: Math.max(0, cursor - 1) },
      submitted: null,
    };
  }

  if (key.rightArrow) {
    return {
      nextState: { value, cursor: Math.min(value.length, cursor + 1) },
      submitted: null,
    };
  }

  if (key.backspace || key.delete) {
    if (cursor === 0) return { nextState: state, submitted: null };
    const newValue = value.slice(0, cursor - 1) + value.slice(cursor);
    return {
      nextState: { value: newValue, cursor: cursor - 1 },
      submitted: null,
    };
  }

  if (!key.ctrl && !key.meta && input) {
    const newValue = value.slice(0, cursor) + input + value.slice(cursor);
    return {
      nextState: { value: newValue, cursor: cursor + input.length },
      submitted: null,
    };
  }

  return { nextState: state, submitted: null };
}

export function Input({ onSubmit, disabled = false }: Props) {
  const [state, setState] = useState<InputState>({ value: '', cursor: 0 });
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useInput((input, key) => {
    if (disabled) return;

    const result = applyInputEvent(stateRef.current, input, {
      return: key.return,
      backspace: key.backspace,
      delete: key.delete,
      ctrl: key.ctrl,
      meta: key.meta,
      leftArrow: key.leftArrow,
      rightArrow: key.rightArrow,
    });
    setState(result.nextState);
    if (result.submitted) {
      onSubmit(result.submitted);
    }
  });

  if (disabled) {
    return (
      <Box>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
      </Box>
    );
  }

  const { value, cursor } = state;
  const beforeCursor = value.slice(0, cursor);
  const afterCursor = value.slice(cursor);

  return (
    <Box>
      <Text color="cyan" bold>
        ›
      </Text>
      <Text> </Text>
      {value.length > 0 ? (
        <>
          <Text color="white">{beforeCursor}</Text>
          <Text color="cyan">▎</Text>
          <Text color="white">{afterCursor}</Text>
        </>
      ) : (
        <>
          <Text color="cyan">▎</Text>
          <Text color="gray" dimColor>
            ask anything...
          </Text>
        </>
      )}
    </Box>
  );
}
