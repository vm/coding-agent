import { describe, it, expect } from 'bun:test';
import { buildSkillContext, formatScriptToolHint, formatSkillMessage } from '../../src/skills/invocation';
import type { Skill, SkillScript } from '../../src/skills/types';

describe('formatScriptToolHint', () => {
  it('generates correct run_command guidance for python', () => {
    const script: SkillScript = {
      name: 'generate_qr',
      path: '/path/to/generate_qr.py',
      language: 'python',
    };

    const result = formatScriptToolHint(script);
    expect(result).toContain('run_command');
    expect(result).toContain('python');
    expect(result).toContain('/path/to/generate_qr.py');
  });

  it('generates correct run_command guidance for typescript', () => {
    const script: SkillScript = {
      name: 'migrate',
      path: '/path/to/migrate.ts',
      language: 'typescript',
    };

    const result = formatScriptToolHint(script);
    expect(result).toContain('run_command');
    expect(result).toContain('bun');
    expect(result).toContain('/path/to/migrate.ts');
  });
});

describe('buildSkillContext', () => {
  it('includes skill prompt content', () => {
    const skill: Skill = {
      name: 'qr_code',
      description: 'Generate a QR code',
      path: '/path/to/qr_code',
      prompt: '# QR Code\n\nGenerate a QR code for the given text.',
      scripts: [],
    };

    const result = buildSkillContext(skill, '');
    expect(result).toContain('# QR Code');
    expect(result).toContain('Generate a QR code for the given text.');
  });

  it('lists available scripts with paths', () => {
    const skill: Skill = {
      name: 'qr_code',
      description: 'Generate a QR code',
      path: '/path/to/qr_code',
      prompt: 'Generate a QR code',
      scripts: [
        {
          name: 'generate_qr',
          path: '/path/to/qr_code/generate_qr.py',
          language: 'python',
        },
      ],
    };

    const result = buildSkillContext(skill, '');
    expect(result).toContain('Available scripts:');
    expect(result).toContain('generate_qr');
    expect(result).toContain('python');
    expect(result).toContain('/path/to/qr_code/generate_qr.py');
  });

  it('skill with multiple scripts lists all of them', () => {
    const skill: Skill = {
      name: 'codemod',
      description: 'Migrate code',
      path: '/path/to/codemod',
      prompt: 'Migrate code',
      scripts: [
        {
          name: 'migrate',
          path: '/path/to/codemod/migrate.ts',
          language: 'typescript',
        },
        {
          name: 'validate',
          path: '/path/to/codemod/validate.py',
          language: 'python',
        },
      ],
    };

    const result = buildSkillContext(skill, '');
    expect(result).toContain('migrate');
    expect(result).toContain('validate');
    expect(result).toContain('typescript');
    expect(result).toContain('python');
  });

  it('skill with no scripts still works (prompt-only mode)', () => {
    const skill: Skill = {
      name: 'analyze',
      description: 'Analyze code',
      path: '/path/to/analyze',
      prompt: 'Analyze the codebase',
      scripts: [],
    };

    const result = buildSkillContext(skill, '');
    expect(result).toContain('Analyze the codebase');
    expect(result).not.toContain('Available scripts:');
  });

  it('includes args when provided', () => {
    const skill: Skill = {
      name: 'qr_code',
      description: 'Generate a QR code',
      path: '/path/to/qr_code',
      prompt: 'Generate a QR code',
      scripts: [],
    };

    const result = buildSkillContext(skill, 'https://example.com');
    expect(result).toContain('Arguments:');
    expect(result).toContain('https://example.com');
  });

  it('works with empty args', () => {
    const skill: Skill = {
      name: 'qr_code',
      description: 'Generate a QR code',
      path: '/path/to/qr_code',
      prompt: 'Generate a QR code',
      scripts: [],
    };

    const result = buildSkillContext(skill, '');
    expect(result).toBeTruthy();
    expect(result).toContain('Generate a QR code');
  });
});

describe('formatSkillMessage', () => {
  it('wraps content in clear delimiters', () => {
    const skill: Skill = {
      name: 'qr_code',
      description: 'Generate a QR code',
      path: '/path/to/qr_code',
      prompt: 'Generate a QR code',
      scripts: [],
    };

    const result = formatSkillMessage(skill, '', '');
    expect(result).toContain('---');
    expect(result).toContain('Skill: /qr_code');
    expect(result).toContain('Generate a QR code');
  });

  it('includes user\'s original input for context', () => {
    const skill: Skill = {
      name: 'qr_code',
      description: 'Generate a QR code',
      path: '/path/to/qr_code',
      prompt: 'Generate a QR code',
      scripts: [],
    };

    const result = formatSkillMessage(skill, '', '/qr_code');
    expect(result).toContain('/qr_code');
  });

  it('includes args in the message', () => {
    const skill: Skill = {
      name: 'qr_code',
      description: 'Generate a QR code',
      path: '/path/to/qr_code',
      prompt: 'Generate a QR code',
      scripts: [],
    };

    const result = formatSkillMessage(skill, 'https://example.com', '/qr_code https://example.com');
    expect(result).toContain('https://example.com');
  });

  it('includes script hints when scripts are present', () => {
    const skill: Skill = {
      name: 'qr_code',
      description: 'Generate a QR code',
      path: '/path/to/qr_code',
      prompt: 'Generate a QR code',
      scripts: [
        {
          name: 'generate_qr',
          path: '/path/to/qr_code/generate_qr.py',
          language: 'python',
        },
      ],
    };

    const result = formatSkillMessage(skill, '', '/qr_code');
    expect(result).toContain('Available scripts:');
    expect(result).toContain('generate_qr');
    expect(result).toContain('run_command');
  });
});

