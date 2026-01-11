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
    <Box flexDirection="row" alignItems="center">
      <Text color={disabled ? 'gray' : 'white'} dimColor={disabled}>
        {disabled ? '⏳' : '>'}
      </Text>
      <Box marginLeft={1} flexGrow={1}>
        {value.length > 0 ? (
          <Text>{value}</Text>
        ) : (
          <Text color="gray" dimColor>Ask Claude...</Text>
        )}
        {!disabled && <Text color="white" dimColor>█</Text>}
      </Box>
    </Box>
  );
}

