import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MediumValidator } from '../../src/validation/MediumValidator.js';
import { ValidationConfig } from '../../src/config/ValidationConfig.js';

const makeConfig = (): ValidationConfig => ({
  validation_level: 'medium',
  description: 'Medium validation',
  allowed_commands: {
    ls: { description: 'List files', allowed_args: ['-la', '-l', '-a'] },
    cat: { description: 'Show file contents', requires_file: true },
    echo: { description: 'Echo text' },
    rm: { description: 'Remove files' }
  },
  forbidden_patterns: ['rm\\s+-rf', 'sudo\\s+rm'],
  file_path_restrictions: { enabled: true, max_path_length: 100 },
  environment_policy: { mode: 'passthrough' },
  limits: {
    max_arguments: -1,
    max_command_length: -1,
    timeout_max: -1,
    timeout_default: -1,
  },
});

describe('MediumValidator', () => {
  let validator: MediumValidator;
  let config: ValidationConfig;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    config = makeConfig();
    validator = new MediumValidator(config);
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateCommand', () => {
    it('should accept valid commands in whitelist', () => {
      const result = validator.validateCommand('ls', ['-la']);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedCommand).toBe('ls');
      expect(result.sanitizedArgs).toEqual(['-la']);
    });

    it('should reject commands not in whitelist', () => {
      const result = validator.validateCommand('cp', ['file1', 'file2']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not in the allowed whitelist');
    });

    it('should reject forbidden patterns', () => {
      const result = validator.validateCommand('rm', ['-rf', '/']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Command contains forbidden pattern');
    });

    it('should accept any arguments for commands without specific allowed args', () => {
      const result = validator.validateCommand('echo', ['hello', 'world']);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedArgs).toEqual(['hello', 'world']);
    });

    it('should accept file paths for commands that require files', () => {
      const result = validator.validateCommand('cat', ['/path/to/file.txt']);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedArgs).toEqual(['/path/to/file.txt']);
    });

    it('should handle empty arguments', () => {
      const result = validator.validateCommand('ls', []);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedArgs).toEqual([]);
    });

    it('should handle whitespace-only arguments', () => {
      const result = validator.validateCommand('ls', ['   ', '  ']);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedArgs).toEqual([]);
    });

    it('should reject non-string arguments', () => {
      const result = validator.validateCommand('ls', [123 as any]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be strings');
    });

    it('should reject null arguments', () => {
      const result = validator.validateCommand('ls', [null as any]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be strings');
    });

    it('should reject undefined arguments', () => {
      const result = validator.validateCommand('ls', [undefined as any]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be strings');
    });

    it('should handle string command config format', () => {
      const configWithStringCommands = {
        ...config,
        allowed_commands: {
          ls: 'List files',
          cat: 'Show file contents'
        }
      };
      const stringValidator = new MediumValidator(configWithStringCommands);
      
      const result = stringValidator.validateCommand('ls', ['-la']);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedArgs).toEqual(['-la']);
    });

    it('should accept any arguments for commands with no allowed args specified', () => {
      const configWithNoArgs = {
        ...config,
        allowed_commands: {
          echo: { description: 'Echo text' }
        }
      };
      const noArgsValidator = new MediumValidator(configWithNoArgs);
      
      const result = noArgsValidator.validateCommand('echo', ['hello', 'world']);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedArgs).toEqual(['hello', 'world']);
    });
  });

  describe('validateFilePath', () => {
    it('should return true when restrictions are disabled', () => {
      const configWithoutRestrictions = {
        ...config,
        file_path_restrictions: { enabled: false }
      };
      const validatorWithoutRestrictions = new MediumValidator(configWithoutRestrictions);
      
      expect(validatorWithoutRestrictions.validateFilePath('/any/path')).toBe(true);
    });

    it('should return true when restrictions are enabled (actual behavior)', () => {
      expect(validator.validateFilePath('/any/path')).toBe(true);
    });
  });

  describe('buildEnvironment', () => {
    it('should include all environment variables in passthrough mode', () => {
      process.env.TEST_VAR = 'test_value';
      
      const result = validator.buildEnvironment();
      
      expect(result.TEST_VAR).toBe('test_value');
    });

    it('should include additional environment variables', () => {
      const additionalEnv = { CUSTOM_VAR: 'custom_value' };
      
      const result = validator.buildEnvironment(additionalEnv);
      
      expect(result.CUSTOM_VAR).toBe('custom_value');
    });

    it('should handle whitelist mode', () => {
      const configWithWhitelist = {
        ...config,
        environment_policy: {
          mode: 'whitelist',
          allowed_vars: ['PATH', 'HOME']
        }
      };
      const whitelistValidator = new MediumValidator(configWithWhitelist);
      
      process.env.PATH = '/usr/bin';
      process.env.HOME = '/home/user';
      process.env.SECRET = 'secret_value';
      
      const result = whitelistValidator.buildEnvironment();
      
      expect(result.PATH).toBe('/usr/bin');
      expect(result.HOME).toBe('/home/user');
      expect(result.SECRET).toBeUndefined();
    });

    it('should handle blacklist mode', () => {
      const configWithBlacklist = {
        ...config,
        environment_policy: {
          mode: 'blacklist',
          blocked_vars: ['SECRET', 'PASSWORD']
        }
      };
      const blacklistValidator = new MediumValidator(configWithBlacklist);
      
      process.env.PATH = '/usr/bin';
      process.env.SECRET = 'secret_value';
      process.env.PASSWORD = 'password_value';
      
      const result = blacklistValidator.buildEnvironment();
      
      expect(result.PATH).toBe('/usr/bin');
      expect(result.SECRET).toBeUndefined();
      expect(result.PASSWORD).toBeUndefined();
    });
  });

  describe('inherited methods', () => {
    it('should return validation level', () => {
      expect(validator.getValidationLevel()).toBe('medium');
    });

    it('should return description', () => {
      expect(validator.getDescription()).toBe('Medium validation');
    });

    it('should return allowed commands count', () => {
      expect(validator.getAllowedCommandsCount()).toBe(4);
    });

    it('should handle timeout configuration', () => {
      const configWithTimeouts = {
        ...config,
        limits: {
          max_arguments: -1,
          max_command_length: -1,
          timeout_max: 60000,
          timeout_default: 30000,
        }
      };
      const timeoutValidator = new MediumValidator(configWithTimeouts);
      
      expect(timeoutValidator.getTimeout()).toBe(30000);
      expect(timeoutValidator.getTimeout(45000)).toBe(45000);
      expect(timeoutValidator.getTimeout(90000)).toBe(60000);
    });
  });
}); 
