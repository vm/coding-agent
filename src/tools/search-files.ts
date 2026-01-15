import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const MAX_FILE_MATCHES = 1000;
const MAX_LINE_MATCHES = 500;

export function searchFiles(
  pattern: string,
  contentPattern?: string,
  basePath?: string
): string {
  try {
    const cwd = basePath ? resolve(basePath) : process.cwd();
    const glob = new Bun.Glob(pattern);

    const matchedFiles: string[] = [];

    // Collect files matching the glob pattern
    for (const file of glob.scanSync({ cwd, onlyFiles: true })) {
      matchedFiles.push(file);
      if (matchedFiles.length >= MAX_FILE_MATCHES) {
        break;
      }
    }

    // If no content pattern, return file list
    if (!contentPattern) {
      if (matchedFiles.length === 0) {
        return 'No files found matching pattern';
      }
      const result = matchedFiles.sort().join('\n');
      if (matchedFiles.length >= MAX_FILE_MATCHES) {
        return result + `\n\n(Limited to ${MAX_FILE_MATCHES} files)`;
      }
      return result;
    }

    // Filter by content pattern
    const regex = new RegExp(contentPattern);
    const matches: string[] = [];

    for (const file of matchedFiles) {
      const fullPath = resolve(cwd, file);

      try {
        // Skip directories and non-text files
        const stats = statSync(fullPath);
        if (stats.isDirectory()) continue;

        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matches.push(`${file}:${i + 1}:${lines[i]}`);
            if (matches.length >= MAX_LINE_MATCHES) {
              break;
            }
          }
        }
      } catch {
        // Skip files that can't be read (binary, permissions, etc.)
        continue;
      }

      if (matches.length >= MAX_LINE_MATCHES) {
        break;
      }
    }

    if (matches.length === 0) {
      return 'No matches found';
    }

    const result = matches.join('\n');
    if (matches.length >= MAX_LINE_MATCHES) {
      return result + `\n\n(Limited to ${MAX_LINE_MATCHES} matches)`;
    }
    return result;
  } catch (error) {
    if (error instanceof Error) {
      // Handle non-existent directory as "no files found"
      if (error.message.includes('ENOENT')) {
        return 'No files found matching pattern';
      }
      if (error.message.includes('Invalid regular expression')) {
        return `Error: Invalid regex pattern "${contentPattern}": ${error.message}`;
      }
      return `Error: Search failed: ${error.message}`;
    }
    return 'Error: Search failed';
  }
}
