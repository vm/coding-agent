import { useState, useEffect } from 'react';
import { useInput } from 'ink';
import { Text, Box } from 'ink';

type Props = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
};

export function Input({ onSubmit, disabled = false }: Props) {
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (disabled) return;

    if (key.return) {
      if (value.trim()) {
        onSubmit(value.trim());
        setValue('');
      }
    } else if (key.backspace || key.delete) {
      setValue(prev => prev.slice(0, -1));
    } else if (!key.ctrl && !key.meta && input) {
      setValue(prev => prev + input);
    }
  });

  return (
    <Box>
      <Text color={disabled ? 'gray' : 'cyan'} bold>
        {disabled ? '> ' : '> '}
      </Text>
      <Text>{value}</Text>
      {!disabled && <Text color="gray">_</Text>}
      {!disabled && value.length === 0 && (
        <Text color="gray" dimColor>Type your message here...</Text>
      )}
    </Box>
  );
}

