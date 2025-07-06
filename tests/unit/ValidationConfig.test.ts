import { describe, it, expect } from 'vitest';
import { ValidationConfig, CommandConfig, FilePathRestrictions, EnvironmentPolicy, SecurityLimits } from '../../src/config/ValidationConfig.js';

describe('ValidationConfig Interface', () => {
  describe('interface structure', () => {
    it('should have correct property types', () => {
      const config: ValidationConfig = {
        validation_level: 'medium',
        description: 'Test config',
        allowed_commands: {
          ls: { description: 'List files', allowed_args: ['-la'] }
        },
        forbidden_patterns: ['rm\\s+-rf'],
        file_path_restrictions: { enabled: true },
        environment_policy: { mode: 'passthrough' },
        limits: {
          max_arguments: 10,
          max_command_length: 1000,
          timeout_max: 30000,
          timeout_default: 5000
        }
      };

      expect(config.validation_level).toBe('medium');
      expect(config.description).toBe('Test config');
      expect(Object.keys(config.allowed_commands)).toContain('ls');
      expect(config.forbidden_patterns).toContain('rm\\s+-rf');
      expect(config.file_path_restrictions.enabled).toBe(true);
      expect(config.environment_policy.mode).toBe('passthrough');
      expect(config.limits.max_arguments).toBe(10);
    });

    it('should support string format for allowed_commands', () => {
      const config: ValidationConfig = {
        validation_level: 'minimal',
        description: 'Test config',
        allowed_commands: {
          ls: 'List files',
          cat: 'Show file contents'
        },
        forbidden_patterns: [],
        file_path_restrictions: { enabled: false },
        environment_policy: { mode: 'passthrough' },
        limits: {
          max_arguments: -1,
          max_command_length: -1,
          timeout_max: -1,
          timeout_default: -1
        }
      };

      expect(typeof config.allowed_commands.ls).toBe('string');
      expect(config.allowed_commands.ls).toBe('List files');
    });

    it('should support CommandConfig format for allowed_commands', () => {
      const commandConfig: CommandConfig = {
        description: 'List files',
        allowed_args: ['-la', '-l'],
        requires_file: false,
        max_args: 5,
        environment_vars: ['PATH']
      };

      const config: ValidationConfig = {
        validation_level: 'aggressive',
        description: 'Test config',
        allowed_commands: {
          ls: commandConfig
        },
        forbidden_patterns: [],
        file_path_restrictions: { enabled: false },
        environment_policy: { mode: 'passthrough' },
        limits: {
          max_arguments: -1,
          max_command_length: -1,
          timeout_max: -1,
          timeout_default: -1
        }
      };

      const lsConfig = config.allowed_commands.ls as CommandConfig;
      expect(lsConfig.description).toBe('List files');
      expect(lsConfig.allowed_args).toEqual(['-la', '-l']);
      expect(lsConfig.requires_file).toBe(false);
    });
  });

  describe('FilePathRestrictions interface', () => {
    it('should support all optional properties', () => {
      const restrictions: FilePathRestrictions = {
        enabled: true,
        pattern: '^/safe/',
        max_path_length: 100,
        blocked_paths: ['/etc/passwd'],
        allowed_extensions: ['.txt', '.md']
      };

      expect(restrictions.enabled).toBe(true);
      expect(restrictions.pattern).toBe('^/safe/');
      expect(restrictions.max_path_length).toBe(100);
      expect(restrictions.blocked_paths).toEqual(['/etc/passwd']);
      expect(restrictions.allowed_extensions).toEqual(['.txt', '.md']);
    });

    it('should work with minimal properties', () => {
      const restrictions: FilePathRestrictions = {
        enabled: false
      };

      expect(restrictions.enabled).toBe(false);
      expect(restrictions.pattern).toBeUndefined();
      expect(restrictions.max_path_length).toBeUndefined();
    });
  });

  describe('EnvironmentPolicy interface', () => {
    it('should support whitelist mode', () => {
      const policy: EnvironmentPolicy = {
        mode: 'whitelist',
        allowed_vars: ['PATH', 'HOME']
      };

      expect(policy.mode).toBe('whitelist');
      expect(policy.allowed_vars).toEqual(['PATH', 'HOME']);
      expect(policy.blocked_vars).toBeUndefined();
    });

    it('should support blacklist mode', () => {
      const policy: EnvironmentPolicy = {
        mode: 'blacklist',
        blocked_vars: ['SECRET_KEY', 'API_KEY']
      };

      expect(policy.mode).toBe('blacklist');
      expect(policy.blocked_vars).toEqual(['SECRET_KEY', 'API_KEY']);
      expect(policy.allowed_vars).toBeUndefined();
    });

    it('should support passthrough mode', () => {
      const policy: EnvironmentPolicy = {
        mode: 'passthrough'
      };

      expect(policy.mode).toBe('passthrough');
      expect(policy.allowed_vars).toBeUndefined();
      expect(policy.blocked_vars).toBeUndefined();
    });
  });

  describe('SecurityLimits interface', () => {
    it('should support all limit properties', () => {
      const limits: SecurityLimits = {
        max_arguments: 10,
        max_command_length: 1000,
        timeout_max: 30000,
        timeout_default: 5000
      };

      expect(limits.max_arguments).toBe(10);
      expect(limits.max_command_length).toBe(1000);
      expect(limits.timeout_max).toBe(30000);
      expect(limits.timeout_default).toBe(5000);
    });

    it('should support unlimited values with -1', () => {
      const limits: SecurityLimits = {
        max_arguments: -1,
        max_command_length: -1,
        timeout_max: -1,
        timeout_default: -1
      };

      expect(limits.max_arguments).toBe(-1);
      expect(limits.max_command_length).toBe(-1);
      expect(limits.timeout_max).toBe(-1);
      expect(limits.timeout_default).toBe(-1);
    });
  });

  describe('ValidationLevel type', () => {
    it('should accept all valid validation levels', () => {
      const levels: Array<'aggressive' | 'medium' | 'minimal' | 'none' | 'custom'> = [
        'aggressive',
        'medium', 
        'minimal',
        'none',
        'custom'
      ];

      levels.forEach(level => {
        const config: ValidationConfig = {
          validation_level: level,
          description: 'Test',
          allowed_commands: {},
          forbidden_patterns: [],
          file_path_restrictions: { enabled: false },
          environment_policy: { mode: 'passthrough' },
          limits: {
            max_arguments: -1,
            max_command_length: -1,
            timeout_max: -1,
            timeout_default: -1
          }
        };

        expect(config.validation_level).toBe(level);
      });
    });
  });

  describe('legacy support', () => {
    it('should support legacy properties', () => {
      const config: ValidationConfig = {
        validation_level: 'medium',
        description: 'Test config',
        allowed_commands: {},
        forbidden_patterns: [],
        file_path_restrictions: { enabled: false },
        environment_policy: { mode: 'passthrough' },
        limits: {
          max_arguments: -1,
          max_command_length: -1,
          timeout_max: -1,
          timeout_default: -1
        },
        // Legacy properties
        whitelistedCommands: { ls: 'List files' },
        maxTimeout: 30000,
        environment: { mode: 'whitelist' },
        allowed_arguments: { ls: ['-la'] }
      };

      expect(config.whitelistedCommands).toEqual({ ls: 'List files' });
      expect(config.maxTimeout).toBe(30000);
      expect(config.environment?.mode).toBe('whitelist');
      expect(config.allowed_arguments).toEqual({ ls: ['-la'] });
    });
  });
}); 
