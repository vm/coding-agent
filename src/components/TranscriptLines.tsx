import { Box, Text } from 'ink';
import type { TranscriptLine } from '../shared/types';

export function TranscriptLines(props: {
  lines: TranscriptLine[];
  height: number;
  scrollOffset?: number;
}) {
  const height = Math.max(1, props.height);
  const scrollOffset = Math.max(0, props.scrollOffset ?? 0);

  const maxScrollOffset = Math.max(0, props.lines.length - height);
  const clampedOffset = Math.min(scrollOffset, maxScrollOffset);
  const start = Math.max(0, props.lines.length - height - clampedOffset);
  const visible = props.lines.slice(start, start + height);
  const fillerCount = Math.max(0, height - visible.length);

  return (
    <Box flexDirection="column" height={height}>
      {Array.from({ length: fillerCount }).map((_, i) => (
        <Text key={`pad-${i}`}> </Text>
      ))}
      {visible.map((l, i) => (
        <Text key={`line-${i}`} color={l.color} dimColor={l.dimColor} bold={l.bold}>
          {l.text.length === 0 ? ' ' : l.text}
        </Text>
      ))}
    </Box>
  );
}
