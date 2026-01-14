#!/usr/bin/env bun
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface MigrationOptions {
  pattern: string | RegExp;
  replacement: string;
  fileExtensions?: string[];
  directory?: string;
}

function findFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findFiles(fullPath, extensions));
    } else if (stat.isFile()) {
      const ext = extname(entry);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function applyMigration(filePath: string, pattern: string | RegExp, replacement: string): boolean {
  const content = readFileSync(filePath, 'utf-8');
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
  
  if (!regex.test(content)) {
    return false;
  }
  
  const newContent = content.replace(regex, replacement);
  writeFileSync(filePath, newContent, 'utf-8');
  return true;
}

function migrate(options: MigrationOptions): void {
  const {
    pattern,
    replacement,
    fileExtensions = ['.ts', '.tsx', '.js', '.jsx'],
    directory = process.cwd(),
  } = options;
  
  const files = findFiles(directory, fileExtensions);
  const modified: string[] = [];
  
  for (const file of files) {
    if (applyMigration(file, pattern, replacement)) {
      modified.push(file);
    }
  }
  
  console.log(`Migration complete. Modified ${modified.length} file(s):`);
  modified.forEach(file => console.log(`  - ${file}`));
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: migrate.ts <pattern> <replacement> [directory] [extensions]');
  process.exit(1);
}

const [pattern, replacement, directory, extensionsStr] = args;
const extensions = extensionsStr ? extensionsStr.split(',') : undefined;

migrate({
  pattern,
  replacement,
  directory: directory || process.cwd(),
  fileExtensions: extensions,
});
