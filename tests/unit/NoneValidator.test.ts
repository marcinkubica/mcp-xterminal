import { describe, it, expect, beforeEach } from 'vitest';
import { NoneValidator } from '../../src/validation/NoneValidator.js';
import { ValidationConfig } from '../../src/config/ValidationConfig.js';

const makeConfig = (): ValidationConfig => ({
  validation_level: 'none',
  description: 'None validation',
  allowed_commands: {},
  forbidden_patterns: [],
  file_path_restrictions: { enabled: false },
  environment_policy: { mode: 'passthrough' },
  limits: {
    max_arguments: -1,
    max_command_length: -1,
    timeout_max: -1,
    timeout_default: -1,
  },
});

describe('NoneValidator', () => {
  let validator: NoneValidator;
  let config: ValidationConfig;

  beforeEach(() => {
    config = makeConfig();
    validator = new NoneValidator(config);
  });

  describe('validateCommand', () => {
    it('should validate any command and arguments', () => {
      const result = validator.validateCommand('ls', ['-la']);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedCommand).toBe('ls');
      expect(result.sanitizedArgs).toEqual(['-la']);
      expect(result.error).toBeUndefined();
    });

    it('should fail for non-string command', () => {
      const result = validator.validateCommand(123 as any, []);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Command must be a non-empty string');
    });

    it('should fail for null/undefined/empty command', () => {
      expect(validator.validateCommand(null as any, []).isValid).toBe(false);
      expect(validator.validateCommand(undefined as any, []).isValid).toBe(false);
      expect(validator.validateCommand('', []).isValid).toBe(false);
    });

    it('should fail for non-array arguments', () => {
      expect(validator.validateCommand('ls', 'not-an-array' as any).isValid).toBe(false);
      expect(validator.validateCommand('ls', null as any).isValid).toBe(false);
      expect(validator.validateCommand('ls', undefined as any).isValid).toBe(false);
    });

    it('should fail for arguments containing non-strings', () => {
      expect(validator.validateCommand('ls', ['-la', 123 as any]).isValid).toBe(false);
      expect(validator.validateCommand('ls', ['-la', null as any]).isValid).toBe(false);
      expect(validator.validateCommand('ls', ['-la', undefined as any]).isValid).toBe(false);
    });

    it('should allow empty arguments array', () => {
      const result = validator.validateCommand('ls', []);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedArgs).toEqual([]);
    });

    it('should not trim or skip empty/whitespace arguments', () => {
      const result = validator.validateCommand('ls', ['  -la  ', '   ', '', 'pwd']);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedArgs).toEqual(['  -la  ', '   ', '', 'pwd']);
    });
  });

  describe('validateFilePath', () => {
    it('should always return true', () => {
      expect(validator.validateFilePath('/any/path')).toBe(true);
    });
  });

  describe('buildEnvironment', () => {
    it('should include all process.env and additionalEnv', () => {
      const env = validator.buildEnvironment({ FOO: 'BAR' });
      expect(env.FOO).toBe('BAR');
      // process.env keys should be present
      expect(Object.keys(env)).toEqual(expect.arrayContaining(Object.keys(process.env)));
    });
  });

  describe('getTimeout', () => {
    it('should return requestedTimeout or 0', () => {
      expect(validator.getTimeout(12345)).toBe(12345);
      expect(validator.getTimeout()).toBe(0);
    });
  });
}); 
