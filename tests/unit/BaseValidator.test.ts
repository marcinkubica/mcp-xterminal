import { describe, it, expect, beforeEach } from 'vitest';
import { BaseValidator, CommandValidationResult } from '../../src/validation/BaseValidator.js';
import { ValidationConfig } from '../../src/config/ValidationConfig.js';

// Mock implementation for testing
class MockValidator extends BaseValidator {
  validateCommand(command: string, args: string[]): CommandValidationResult {
    const basicValidation = this.validateBasicInput(command, args);
    if (basicValidation) {
      return basicValidation;
    }

    // Check forbidden patterns
    const fullCommand = `${command} ${args.join(' ')}`;
    const forbiddenError = this.checkForbiddenPatterns(fullCommand);
    if (forbiddenError) {
      return { isValid: false, error: forbiddenError };
    }

    return {
      isValid: true,
      sanitizedCommand: command,
      sanitizedArgs: args
    };
  }

  validateFilePath(path: string): boolean {
    return true;
  }

  buildEnvironment(additionalEnv?: Record<string, string>): Record<string, string> {
    return { PATH: '/usr/bin', ...additionalEnv };
  }
}

describe('BaseValidator', () => {
  let validator: MockValidator;
  let config: ValidationConfig;

  beforeEach(() => {
    config = {
      validation_level: 'test',
      description: 'Test configuration',
      allowed_commands: {},
      forbidden_patterns: [
        '\\bsudo\\s+rm\\b',
        '\\brm\\s+-rf\\b'
      ],
      file_path_restrictions: {
        enabled: true,
        pattern: '^[a-zA-Z0-9._/-]+$',
        max_path_length: 255
      },
      environment_policy: {
        mode: 'whitelist',
        allowed_vars: ['PATH', 'HOME']
      },
      limits: {
        max_arguments: 5,
        max_command_length: 100,
        timeout_max: 30000,
        timeout_default: 10000
      }
    };
    validator = new MockValidator(config);
  });

  describe('validateBasicInput', () => {
    it('should reject empty command', () => {
      const result = validator['validateBasicInput']('', []);
      expect(result).toEqual({
        isValid: false,
        error: 'Command must be a non-empty string'
      });
    });

    it('should reject non-string command', () => {
      const result = validator['validateBasicInput'](null as any, []);
      expect(result).toEqual({
        isValid: false,
        error: 'Command must be a non-empty string'
      });
    });

    it('should reject non-array arguments', () => {
      const result = validator['validateBasicInput']('ls', 'not-an-array' as any);
      expect(result).toEqual({
        isValid: false,
        error: 'Arguments must be an array'
      });
    });

    it('should reject too many arguments', () => {
      const result = validator['validateBasicInput']('ls', ['-l', '-a', '-h', '-R', '-1', '-F']);
      expect(result).toEqual({
        isValid: false,
        error: 'Too many arguments (maximum 5 allowed)'
      });
    });

    it('should reject command that is too long when limit is set', () => {
      const longCommand = 'ls';
      const longArgs = ['very-long-argument-that-exceeds-the-limit-and-makes-the-command-longer-than-the-maximum-allowed-length-of-one-hundred-characters'];
      
      const result = validator['validateBasicInput'](longCommand, longArgs);
      expect(result).toEqual({
        isValid: false,
        error: 'Command too long (maximum 100 characters allowed)'
      });
    });

    it('should accept valid input', () => {
      const result = validator['validateBasicInput']('ls', ['-la']);
      expect(result).toBeNull(); // No validation errors
    });
  });

  describe('checkForbiddenPatterns', () => {
    it('should detect sudo rm pattern', () => {
      const result = validator['checkForbiddenPatterns']('sudo rm -rf /');
      expect(result).toBe('Command contains forbidden pattern: \\bsudo\\s+rm\\b');
    });

    it('should detect rm -rf pattern', () => {
      const result = validator['checkForbiddenPatterns']('rm -rf /tmp');
      expect(result).toBe('Command contains forbidden pattern: \\brm\\s+-rf\\b');
    });

    it('should return null for safe commands', () => {
      const result = validator['checkForbiddenPatterns']('ls -la');
      expect(result).toBeNull();
    });

    it('should handle undefined forbidden patterns', () => {
      const validatorWithoutPatterns = new MockValidator({
        ...config,
        forbidden_patterns: undefined as any
      });
      
      expect(() => {
        validatorWithoutPatterns['checkForbiddenPatterns']('rm -rf /');
      }).toThrow('this.config.forbidden_patterns is not iterable');
    });
  });

  describe('getTimeout', () => {
    it('should return requested timeout when within limits', () => {
      const result = validator.getTimeout(5000);
      expect(result).toBe(5000);
    });

    it('should return max timeout when requested exceeds limit', () => {
      const result = validator.getTimeout(60000);
      expect(result).toBe(30000);
    });

    it('should return default timeout when no timeout specified', () => {
      const result = validator.getTimeout();
      expect(result).toBe(10000);
    });

    it('should handle unlimited timeout configuration', () => {
      const unlimitedConfig = {
        ...config,
        limits: {
          ...config.limits,
          timeout_max: -1
        }
      };
      const unlimitedValidator = new MockValidator(unlimitedConfig);
      
      const result = unlimitedValidator.getTimeout(60000);
      expect(result).toBe(60000);
    });
  });

  describe('getters', () => {
    it('should return validation level', () => {
      expect(validator.getValidationLevel()).toBe('test');
    });

    it('should return description', () => {
      expect(validator.getDescription()).toBe('Test configuration');
    });

    it('should return allowed commands count', () => {
      expect(validator.getAllowedCommandsCount()).toBe(0);
    });
  });
}); 
