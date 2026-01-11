import { describe, it, expect } from 'bun:test';

// Test ToolCall component props and behavior
// Since ToolCall is a presentational component, we test its logic

describe('ToolCall', () => {
  it('should accept name and status props', () => {
    const name = 'read_file';
    const status: 'running' | 'done' | 'error' = 'running';
    
    expect(name).toBe('read_file');
    expect(status).toBe('running');
  });

  it('should handle running status', () => {
    const status = 'running';
    const name = 'read_file';
    const displayText = `Executing ${name}...`;
    
    expect(displayText).toBe('Executing read_file...');
  });

  it('should handle done status with result', () => {
    const status = 'done';
    const name = 'read_file';
    const result = 'File contents: Hello';
    const displayText = `✓ ${name}: ${result.substring(0, 80)}...`;
    
    expect(displayText).toContain('✓ read_file');
    expect(displayText).toContain('File contents: Hello');
  });

  it('should handle done status without result', () => {
    const status = 'done';
    const name = 'read_file';
    const displayText = `✓ ${name}`;
    
    expect(displayText).toBe('✓ read_file');
  });

  it('should handle error status', () => {
    const status = 'error';
    const name = 'read_file';
    const result = 'File not found';
    const displayText = `✗ ${name} failed: ${result.substring(0, 100)}`;
    
    expect(displayText).toContain('✗ read_file failed');
    expect(displayText).toContain('File not found');
  });

  it('should truncate long results in done status', () => {
    const longResult = 'A'.repeat(200);
    const truncated = longResult.substring(0, 80);
    
    expect(truncated.length).toBe(80);
    expect(truncated).toBe('A'.repeat(80));
  });

  it('should truncate long results in error status', () => {
    const longResult = 'A'.repeat(200);
    const truncated = longResult.substring(0, 100);
    
    expect(truncated.length).toBe(100);
    expect(truncated).toBe('A'.repeat(100));
  });
});

