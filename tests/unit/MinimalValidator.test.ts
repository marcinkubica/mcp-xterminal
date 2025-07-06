import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MinimalValidator } from '../../src/validation/MinimalValidator.js';
import { ValidationConfig } from '../../src/config/ValidationConfig.js';

describe('MinimalValidator', () => {
  let validator: MinimalValidator;
  let config: ValidationConfig;

  beforeEach(() => {
    config = {
      validation_level: 'minimal',
      description: 'Minimal security validation',
      allowed_commands: {},
      forbidden_patterns: [
        '\\bsudo\\b rm -rf /',
        '\\bchmod\\b 777 /'
      ],
      file_path_restrictions: {
        enabled: false
      },
      environment_policy: {
        mode: 'passthrough'
      },
      limits: {
        max_arguments: 100,
        max_command_length: 10000,
        timeout_max: 300000,
        timeout_default: 30000
      }
    };
    validator = new MinimalValidator(config);
  });

  describe('validateCommand', () => {
    it('should accept valid commands', () => {
      const result = validator.validateCommand('ls', ['-la']);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedCommand).toBe('ls');
      expect(result.sanitizedArgs).toEqual(['-la']);
    });

    it('should reject commands with forbidden patterns', () => {
      const result = validator.validateCommand('sudo', ['rm', '-rf', '/']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('forbidden pattern');
    });

    it('should reject empty command', () => {
      const result = validator.validateCommand('', []);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Command must be a non-empty string');
    });

    it('should reject non-string command', () => {
      const result = validator.validateCommand(null as any, []);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Command must be a non-empty string');
    });

    it('should reject non-array arguments', () => {
      const result = validator.validateCommand('ls', 'not-an-array' as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Arguments must be an array');
    });

    it('should reject too many arguments', () => {
      const manyArgs = Array.from({ length: 101 }, (_, i) => `arg${i}`);
      const result = validator.validateCommand('ls', manyArgs);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Too many arguments');
    });

    it('should reject command that is too long', () => {
      const longCommand = 'ls';
      const longArgs = Array.from({ length: 100 }, (_, i) => `-${'a'.repeat(100)}`);
      const result = validator.validateCommand(longCommand, longArgs);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Command too long');
    });

    it('should sanitize arguments', () => {
      const result = validator.validateCommand('ls', ['  -la  ', '  -h  ']);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedArgs).toEqual(['-la', '-h']);
    });

    it('should reject non-string arguments', () => {
      const result = validator.validateCommand('ls', ['-la', 123 as any]);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('All arguments must be strings');
    });

    it('should handle empty arguments', () => {
      const result = validator.validateCommand('ls', ['', '   ', '-la']);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedArgs).toEqual(['-la']);
    });
  });

  describe('validateFilePath', () => {
    it('should always return true in minimal mode', () => {
      expect(validator.validateFilePath('/path/to/file')).toBe(true);
      expect(validator.validateFilePath('../../dangerous/path')).toBe(true);
      expect(validator.validateFilePath('')).toBe(true);
    });
  });

  describe('buildEnvironment', () => {
    beforeEach(() => {
      // Mock process.env
      vi.stubGlobal('process', {
        env: {
          PATH: '/usr/bin:/usr/local/bin',
          HOME: '/home/user',
          USER: 'testuser',
          SHELL: '/bin/bash',
          SECRET: 'secret_value',
          PASSWORD: 'password_value'
        }
      });
    });

    it('should include all environment variables in passthrough mode', () => {
      const result = validator.buildEnvironment();

      expect(result.PATH).toBe('/usr/bin:/usr/local/bin');
      expect(result.HOME).toBe('/home/user');
      expect(result.USER).toBe('testuser');
      expect(result.SHELL).toBe('/bin/bash');
      expect(result.SECRET).toBe('secret_value');
      expect(result.PASSWORD).toBe('password_value');
    });

    it('should include additional environment variables', () => {
      const additionalEnv = {
        CUSTOM_VAR: 'custom_value',
        ANOTHER_VAR: 'another_value'
      };

      const result = validator.buildEnvironment(additionalEnv);

      expect(result.CUSTOM_VAR).toBe('custom_value');
      expect(result.ANOTHER_VAR).toBe('another_value');
      expect(result.PATH).toBe('/usr/bin:/usr/local/bin');
      expect(result.SECRET).toBe('secret_value');
    });

    it('should override existing environment variables with additional ones', () => {
      const additionalEnv = {
        PATH: '/custom/path',
        SECRET: 'new_secret'
      };

      const result = validator.buildEnvironment(additionalEnv);

      expect(result.PATH).toBe('/custom/path');
      expect(result.SECRET).toBe('new_secret');
      expect(result.HOME).toBe('/home/user');
    });

    it('should handle empty additional environment', () => {
      const result = validator.buildEnvironment({});

      expect(result.PATH).toBe('/usr/bin:/usr/local/bin');
      expect(result.HOME).toBe('/home/user');
      expect(result.SECRET).toBe('secret_value');
    });

    it('should handle undefined additional environment', () => {
      const result = validator.buildEnvironment();

      expect(result.PATH).toBe('/usr/bin:/usr/local/bin');
      expect(result.HOME).toBe('/home/user');
      expect(result.SECRET).toBe('secret_value');
    });
  });

  describe('getters', () => {
    it('should return validation level', () => {
      expect(validator.getValidationLevel()).toBe('minimal');
    });

    it('should return description', () => {
      expect(validator.getDescription()).toBe('Minimal security validation');
    });

    it('should return allowed commands count', () => {
      expect(validator.getAllowedCommandsCount()).toBe(0);
    });
  });

  describe('getTimeout', () => {
    it('should return requested timeout when within limits', () => {
      const result = validator.getTimeout(5000);
      expect(result).toBe(5000);
    });

    it('should return max timeout when requested exceeds limit', () => {
      const result = validator.getTimeout(400000);
      expect(result).toBe(300000);
    });

    it('should return default timeout when no timeout specified', () => {
      const result = validator.getTimeout();
      expect(result).toBe(30000);
    });
  });
}); 
