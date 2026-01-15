import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { searchFiles } from '../../src/tools/search-files';

describe('searchFiles', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'agent-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('glob-only mode', () => {
    it('returns files matching glob pattern', () => {
      writeFileSync(join(testDir, 'file1.ts'), 'content1');
      writeFileSync(join(testDir, 'file2.ts'), 'content2');
      writeFileSync(join(testDir, 'file3.js'), 'content3');

      const result = searchFiles('*.ts', undefined, testDir);
      expect(result).toContain('file1.ts');
      expect(result).toContain('file2.ts');
      expect(result).not.toContain('file3.js');
    });

    it('handles recursive glob patterns', () => {
      mkdirSync(join(testDir, 'src'));
      mkdirSync(join(testDir, 'src', 'nested'));
      writeFileSync(join(testDir, 'root.ts'), 'root');
      writeFileSync(join(testDir, 'src', 'file.ts'), 'src');
      writeFileSync(join(testDir, 'src', 'nested', 'deep.ts'), 'deep');

      const result = searchFiles('**/*.ts', undefined, testDir);
      expect(result).toContain('root.ts');
      expect(result).toContain('src/file.ts');
      expect(result).toContain('src/nested/deep.ts');
    });

    it('returns message when no files match', () => {
      writeFileSync(join(testDir, 'file.ts'), 'content');

      const result = searchFiles('*.py', undefined, testDir);
      expect(result).toBe('No files found matching pattern');
    });

    it('sorts results alphabetically', () => {
      writeFileSync(join(testDir, 'zebra.ts'), 'z');
      writeFileSync(join(testDir, 'apple.ts'), 'a');
      writeFileSync(join(testDir, 'mango.ts'), 'm');

      const result = searchFiles('*.ts', undefined, testDir);
      const lines = result.split('\n');
      expect(lines[0]).toBe('apple.ts');
      expect(lines[1]).toBe('mango.ts');
      expect(lines[2]).toBe('zebra.ts');
    });
  });

  describe('content search mode', () => {
    it('returns matching lines with file:line:content format', () => {
      writeFileSync(join(testDir, 'file.ts'), 'line1\nfindme here\nline3');

      const result = searchFiles('*.ts', 'findme', testDir);
      expect(result).toBe('file.ts:2:findme here');
    });

    it('finds multiple matches across files', () => {
      writeFileSync(join(testDir, 'a.ts'), 'foo\nbar');
      writeFileSync(join(testDir, 'b.ts'), 'baz\nfoo');

      const result = searchFiles('*.ts', 'foo', testDir);
      expect(result).toContain('a.ts:1:foo');
      expect(result).toContain('b.ts:2:foo');
    });

    it('finds multiple matches in same file', () => {
      writeFileSync(join(testDir, 'file.ts'), 'foo\nbar\nfoo again');

      const result = searchFiles('*.ts', 'foo', testDir);
      expect(result).toContain('file.ts:1:foo');
      expect(result).toContain('file.ts:3:foo again');
    });

    it('supports regex patterns', () => {
      writeFileSync(
        join(testDir, 'file.ts'),
        'const x = 1;\nlet y = 2;\nvar z = 3;'
      );

      const result = searchFiles('*.ts', '(const|let)\\s+\\w+', testDir);
      expect(result).toContain('file.ts:1:const x = 1;');
      expect(result).toContain('file.ts:2:let y = 2;');
      expect(result).not.toContain('var z');
    });

    it('returns message when no content matches', () => {
      writeFileSync(join(testDir, 'file.ts'), 'hello world');

      const result = searchFiles('*.ts', 'notfound', testDir);
      expect(result).toBe('No matches found');
    });
  });

  describe('error handling', () => {
    it('returns error for invalid regex', () => {
      writeFileSync(join(testDir, 'file.ts'), 'content');

      const result = searchFiles('*.ts', '[invalid', testDir);
      expect(result).toContain('Error');
    });

    it('skips unreadable files gracefully', () => {
      writeFileSync(join(testDir, 'text.txt'), 'searchable');

      const result = searchFiles('*', 'searchable', testDir);
      expect(result).toContain('text.txt');
      expect(result).not.toContain('Error');
    });

    it('handles non-existent base path', () => {
      const result = searchFiles('*.ts', undefined, '/nonexistent/path/12345');
      expect(result).toBe('No files found matching pattern');
    });
  });

  describe('edge cases', () => {
    it('handles empty files', () => {
      writeFileSync(join(testDir, 'empty.ts'), '');

      const result = searchFiles('*.ts', undefined, testDir);
      expect(result).toContain('empty.ts');
    });

    it('handles files with special characters in name', () => {
      writeFileSync(join(testDir, 'file-with_special.chars.ts'), 'content');

      const result = searchFiles('*.ts', undefined, testDir);
      expect(result).toContain('file-with_special.chars.ts');
    });

    it('handles content search on empty file', () => {
      writeFileSync(join(testDir, 'empty.ts'), '');

      const result = searchFiles('*.ts', 'something', testDir);
      expect(result).toBe('No matches found');
    });

    it('uses line numbers starting at 1', () => {
      writeFileSync(join(testDir, 'file.ts'), 'first line');

      const result = searchFiles('*.ts', 'first', testDir);
      expect(result).toBe('file.ts:1:first line');
    });
  });
});
