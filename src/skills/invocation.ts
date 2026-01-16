import type { Skill, SkillScript } from './types';

export function formatScriptToolHint(script: SkillScript): string {
  const runner = script.language === 'python' ? 'python' : script.language === 'typescript' ? 'bun' : script.language;
  return `Execute using run_command tool with: {"command": "${runner} ${script.path}"}`;
}

export function buildSkillContext(skill: Skill, args: string): string {
  let context = skill.prompt;

  if (skill.scripts.length > 0) {
    context += '\n\nAvailable scripts:';
    for (const script of skill.scripts) {
      context += `\n- ${script.name} (${script.language}): ${script.path}`;
      context += `\n  ${formatScriptToolHint(script)}`;
    }
  }

  if (args) {
    context += `\n\nArguments: ${args}`;
  }

  return context;
}

export function formatSkillMessage(skill: Skill, args: string, userIntent: string): string {
  const context = buildSkillContext(skill, args);

  return `--- Skill: /${skill.name} ---\n\n${context}\n\n--- User Intent: ${userIntent} ---`;
}

