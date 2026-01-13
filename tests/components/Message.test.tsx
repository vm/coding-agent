import { describe, it, expect } from 'bun:test';

type MessageRole = 'user' | 'assistant';

function formatMessage(role: MessageRole, content: string): string {
  return `${role === 'user' ? 'You' : 'Claude'}: ${content}`;
}

describe('Message', () => {
  it('should accept user role and content', () => {
    const role: MessageRole = 'user';
    const content = 'Hello, world!';
    
    expect(role).toBe('user');
    expect(content).toBe('Hello, world!');
  });

  it('should accept assistant role and content', () => {
    const role: MessageRole = 'assistant';
    const content = 'Hi there!';
    
    expect(role).toBe('assistant');
    expect(content).toBe('Hi there!');
  });

  it('should handle empty content', () => {
    const content = '';
    expect(content.length).toBe(0);
  });

  it('should handle long content', () => {
    const longContent = 'A'.repeat(1000);
    expect(longContent.length).toBe(1000);
  });

  it('should format user messages correctly', () => {
    const formatted = formatMessage('user', 'Hello');
    expect(formatted).toBe('You: Hello');
  });

  it('should format assistant messages correctly', () => {
    const formatted = formatMessage('assistant', 'Hi there!');
    expect(formatted).toBe('Claude: Hi there!');
  });
});
