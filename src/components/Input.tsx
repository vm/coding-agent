import { useState } from 'react';
import { useInput } from 'ink';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';

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

  if (disabled) {
    return (
      <Box>
        <Text color="yellow"><Spinner type="dots" /></Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color="cyan" bold>›</Text>
      <Text> </Text>
      {value.length > 0 ? (
        <Text color="white">{value}</Text>
      ) : (
        <Text color="gray" dimColor>ask anything...</Text>
      )}
      <Text color="cyan">▎</Text>
    </Box>
  );
}
