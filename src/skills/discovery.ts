import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { extractDescription } from '../utils/markdown';
import type { Skill, SkillScript } from './types';

export function detectScriptLanguage(filename: string): string {
  const extension = extname(filename).toLowerCase();
  if (extension === '.py') {
    return 'python';
  }

  if (extension === '.ts') {
    return 'typescript';
  }

  return '';
}

export function loadSkill(dirPath: string): Skill {
  const promptPath = join(dirPath, 'skill.md');
  const prompt = readFileSync(promptPath, 'utf-8');
  const name = dirPath.split(/[/\\]/).pop() || '';
  const entries = readdirSync(dirPath);
  const scripts: SkillScript[] = [];

  for (const entry of entries) {
    if (entry === 'skill.md') {
      continue;
    }

    const filePath = join(dirPath, entry);
    const fileStat = statSync(filePath);
    if (!fileStat.isFile()) {
      continue;
    }

    const language = detectScriptLanguage(entry);
    if (!language) {
      continue;
    }

    const scriptName = entry.replace(/\.[^/.]+$/, '');
    scripts.push({
      name: scriptName,
      path: filePath,
      language,
    });
  }

  return {
    name,
    description: extractDescription(prompt),
    path: dirPath,
    prompt,
    scripts,
  };
}

export function discoverSkills(basePath: string): Skill[] {
  if (!existsSync(basePath)) {
    return [];
  }

  const baseStat = statSync(basePath);
  if (!baseStat.isDirectory()) {
    return [];
  }

  const entries = readdirSync(basePath);
  const skills: Skill[] = [];

  for (const entry of entries) {
    const dirPath = join(basePath, entry);
    const dirStat = statSync(dirPath);
    if (!dirStat.isDirectory()) {
      continue;
    }

    const promptPath = join(dirPath, 'skill.md');
    if (!existsSync(promptPath)) {
      continue;
    }

    try {
      const skill = loadSkill(dirPath);
      skills.push(skill);
    } catch (error) {
      continue;
    }
  }

  return skills;
}

