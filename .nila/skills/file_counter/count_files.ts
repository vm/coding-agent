#!/usr/bin/env bun
import { readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface CountResult {
  extension: string;
  count: number;
}

function countFiles(dir: string, filterExt?: string): CountResult[] {
  const counts: Record<string, number> = {};
  
  function traverse(currentDir: string): void {
    const entries = readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      try {
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (stat.isFile()) {
          const ext = extname(entry) || '(no extension)';
          if (!filterExt || ext === filterExt) {
            counts[ext] = (counts[ext] || 0) + 1;
          }
        }
      } catch {
        continue;
      }
    }
  }
  
  traverse(dir);
  
  return Object.entries(counts)
    .map(([extension, count]) => ({ extension, count }))
    .sort((a, b) => b.count - a.count);
}

const args = process.argv.slice(2);
const directory = args[0] || process.cwd();
const filterExt = args[1];

const results = countFiles(directory, filterExt);

console.log(`File counts in ${directory}:`);
if (results.length === 0) {
  console.log('  No files found');
} else {
  results.forEach(({ extension, count }) => {
    console.log(`  ${extension}: ${count}`);
  });
}
