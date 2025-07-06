import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AggressiveValidator } from '../../src/validation/AggressiveValidator.js';
import { MediumValidator } from '../../src/validation/MediumValidator.js';
import { MinimalValidator } from '../../src/validation/MinimalValidator.js';
import { ValidatorFactory } from '../../src/validation/ValidatorFactory.js';
import { ValidationConfig } from '../../src/config/ValidationConfig.js';
import { ValidationTypeResult } from '../../src/config/ValidationTypeDetector.js';

// Mock ConfigLoader
vi.mock('../../src/config/ConfigLoader.js', () => ({
  ConfigLoader: {
    loadConfigFromResult: vi.fn(),
    loadConfig: vi.fn()
  }
}));

// Mock ValidationTypeDetector
vi.mock('../../src/config/ValidationTypeDetector.js', () => ({
  ValidationTypeDetector: {
    detectValidationType: vi.fn()
  }
}));

describe('Validator Coverage Tests', () => {
  let mockConfig: ValidationConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      validation_level: 'aggressive',
      description: 'Test config',
      allowed_commands: {
        'ls': {
          description: 'List directory contents',
          allowed_args: ['-l', '-a', '--help'],
          requires_file: false
        },
        'cat': {
          description: 'Display file contents',
          allowed_args: ['--help'],
          requires_file: true
        }
      },
      forbidden_patterns: ['\\brm\\b', '\\bsudo\\b'],
      file_path_restrictions: {
        enabled: true,
        pattern: '^/?[a-zA-Z0-9._/-]+$',
        max_path_length: 255
      },
      environment_policy: {
        mode: 'whitelist',
        allowed_vars: ['PATH', 'HOME', 'USER']
      },
      limits: {
        max_arguments: 10,
        max_command_length: 1000,
        timeout_max: 10000,
        timeout_default: 10000
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AggressiveValidator - Edge Cases', () => {
    it('should handle file path validation with disabled restrictions', () => {
      const config = { ...mockConfig };
      config.file_path_restrictions.enabled = false;
      
      const validator = new AggressiveValidator(config);
      const result = validator.validateFilePath('/any/path');
      
      expect(result).toBe(true);
    });

    it('should handle file path validation with missing pattern', () => {
      const config = { ...mockConfig };
      config.file_path_restrictions.pattern = undefined;
      
      const validator = new AggressiveValidator(config);
      const result = validator.validateFilePath('/valid/path');
      
      expect(result).toBe(true);
    });

    it('should handle file path validation with missing max_path_length', () => {
      const config = { ...mockConfig };
      config.file_path_restrictions.max_path_length = undefined;
      
      const validator = new AggressiveValidator(config);
      const result = validator.validateFilePath('/valid/path');
      
      expect(result).toBe(true);
    });

    it('should reject file path that exceeds max length', () => {
      const config = { ...mockConfig };
      config.file_path_restrictions.max_path_length = 5;
      
      const validator = new AggressiveValidator(config);
      const result = validator.validateFilePath('/very/long/path');
      
      expect(result).toBe(false);
    });

    it('should reject file path that does not match pattern', () => {
      const config = { ...mockConfig };
      config.file_path_restrictions.pattern = '^[a-z]+$';
      
      const validator = new AggressiveValidator(config);
      const result = validator.validateFilePath('/path/with/numbers/123');
      
      expect(result).toBe(false);
    });

    it('should handle environment building with blacklist mode', () => {
      const config = { ...mockConfig };
      config.environment_policy.mode = 'blacklist';
      config.environment_policy.blocked_vars = ['SECRET', 'PASSWORD'];
      
      const validator = new AggressiveValidator(config);
      const env = validator.buildEnvironment({ CUSTOM_VAR: 'value' });
      
      expect(env).toHaveProperty('CUSTOM_VAR', 'value');
      expect(env).not.toHaveProperty('SECRET');
      expect(env).not.toHaveProperty('PASSWORD');
    });

    it('should handle environment building with passthrough mode', () => {
      const config = { ...mockConfig };
      config.environment_policy.mode = 'passthrough';
      
      const validator = new AggressiveValidator(config);
      const env = validator.buildEnvironment({ CUSTOM_VAR: 'value' });
      
      expect(env).toHaveProperty('CUSTOM_VAR', 'value');
    });

    it('should handle command config with string format', () => {
      const config = { ...mockConfig };
      config.allowed_commands = {
        'ls': 'List directory contents' as any
      };
      
      const validator = new AggressiveValidator(config);
      const result = validator.validateCommand('ls', []);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle file-requiring commands with valid file paths', () => {
      const validator = new AggressiveValidator(mockConfig);
      const result = validator.validateCommand('cat', ['./test.txt']);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject file-requiring commands with invalid file paths', () => {
      const validator = new AggressiveValidator(mockConfig);
      const result = validator.validateCommand('cat', ['../../../etc/passwd<script>']);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File path argument');
    });
  });

  describe('MediumValidator - Edge Cases', () => {
    it('should handle empty allowed_commands whitelist', () => {
      const config = { ...mockConfig };
      config.allowed_commands = {};
      
      const validator = new MediumValidator(config);
      const result = validator.validateCommand('anycommand', ['arg1']);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle file path validation with disabled restrictions', () => {
      const config = { ...mockConfig };
      config.file_path_restrictions.enabled = false;
      
      const validator = new MediumValidator(config);
      const result = validator.validateFilePath('/any/path');
      
      expect(result).toBe(true);
    });

    it('should handle file path validation with missing pattern', () => {
      const config = { ...mockConfig };
      config.file_path_restrictions.pattern = undefined;
      
      const validator = new MediumValidator(config);
      const result = validator.validateFilePath('/valid/path');
      
      expect(result).toBe(true);
    });

    it('should handle file path validation with missing max_path_length', () => {
      const config = { ...mockConfig };
      config.file_path_restrictions.max_path_length = undefined;
      
      const validator = new MediumValidator(config);
      const result = validator.validateFilePath('/valid/path');
      
      expect(result).toBe(true);
    });

    it('should reject file path that exceeds max length', () => {
      const config = { ...mockConfig };
      config.file_path_restrictions.max_path_length = 5;
      
      const validator = new MediumValidator(config);
      const result = validator.validateFilePath('/very/long/path');
      
      expect(result).toBe(false);
    });

    it('should reject file path that does not match pattern', () => {
      const config = { ...mockConfig };
      config.file_path_restrictions.pattern = '^[a-z]+$';
      
      const validator = new MediumValidator(config);
      const result = validator.validateFilePath('/path/with/numbers/123');
      
      expect(result).toBe(false);
    });

    it('should handle environment building with blacklist mode', () => {
      const config = { ...mockConfig };
      config.environment_policy.mode = 'blacklist';
      config.environment_policy.blocked_vars = ['SECRET', 'PASSWORD'];
      
      const validator = new MediumValidator(config);
      const env = validator.buildEnvironment({ CUSTOM_VAR: 'value' });
      
      expect(env).toHaveProperty('CUSTOM_VAR', 'value');
      expect(env).not.toHaveProperty('SECRET');
      expect(env).not.toHaveProperty('PASSWORD');
    });

    it('should handle environment building with passthrough mode', () => {
      const config = { ...mockConfig };
      config.environment_policy.mode = 'passthrough';
      
      const validator = new MediumValidator(config);
      const env = validator.buildEnvironment({ CUSTOM_VAR: 'value' });
      
      expect(env).toHaveProperty('CUSTOM_VAR', 'value');
    });

    it('should allow safe patterns in medium validation', () => {
      const validator = new MediumValidator(mockConfig);
      const result = validator.validateCommand('ls', ['safe_arg_123']);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle command config with string format', () => {
      const config = { ...mockConfig };
      config.allowed_commands = {
        'ls': 'List directory contents' as any
      };
      
      const validator = new MediumValidator(config);
      const result = validator.validateCommand('ls', ['-l']);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle file-requiring commands with valid file paths', () => {
      const validator = new MediumValidator(mockConfig);
      const result = validator.validateCommand('cat', ['./test.txt']);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject file-requiring commands with invalid file paths', () => {
      const validator = new MediumValidator(mockConfig);
      const result = validator.validateCommand('cat', ['../../../etc/passwd<script>']);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File path argument');
    });
  });

  describe('ValidatorFactory - Edge Cases', () => {
    it('should handle unknown validation level in custom config', async () => {
      const { ConfigLoader } = await import('../../src/config/ConfigLoader.js');
      const { ValidationTypeDetector } = await import('../../src/config/ValidationTypeDetector.js');
      
      const mockConfig = {
        validation_level: 'unknown_level',
        allowed_commands: {}
      };
      
      (ConfigLoader.loadConfigFromResult as any).mockResolvedValue(mockConfig);
      (ValidationTypeDetector.detectValidationType as any).mockReturnValue({
        type: 'custom',
        value: '/path/to/config.yaml'
      });

      const validator = await ValidatorFactory.getValidator();
      
      expect(validator).toBeInstanceOf(AggressiveValidator);
    });

    it('should handle custom validation level with high security characteristics', async () => {
      const { ConfigLoader } = await import('../../src/config/ConfigLoader.js');
      const { ValidationTypeDetector } = await import('../../src/config/ValidationTypeDetector.js');
      
      const mockConfig = {
        validation_level: 'custom',
        allowed_commands: {
          'cmd1': {},
          'cmd2': {},
          'cmd3': {},
          'cmd4': {},
          'cmd5': {}
        },
        forbidden_patterns: ['pattern1', 'pattern2']
      };
      
      (ConfigLoader.loadConfigFromResult as any).mockResolvedValue(mockConfig);
      (ValidationTypeDetector.detectValidationType as any).mockReturnValue({
        type: 'custom',
        value: '/path/to/config.yaml'
      });

      const validator = await ValidatorFactory.getValidator();
      
      expect(validator).toBeInstanceOf(AggressiveValidator);
    });

    it('should handle custom validation level with medium security characteristics', async () => {
      const { ConfigLoader } = await import('../../src/config/ConfigLoader.js');
      const { ValidationTypeDetector } = await import('../../src/config/ValidationTypeDetector.js');
      
      const mockConfig = {
        validation_level: 'custom',
        allowed_commands: {
          'cmd1': {},
          'cmd2': {},
          'cmd3': {},
          'cmd4': {},
          'cmd5': {},
          'cmd6': {},
          'cmd7': {},
          'cmd8': {},
          'cmd9': {},
          'cmd10': {},
          'cmd11': {},
          'cmd12': {},
          'cmd13': {},
          'cmd14': {},
          'cmd15': {}
        }
      };
      
      (ConfigLoader.loadConfigFromResult as any).mockResolvedValue(mockConfig);
      (ValidationTypeDetector.detectValidationType as any).mockReturnValue({
        type: 'custom',
        value: '/path/to/config.yaml'
      });

      // Clear the cached instance to force recreation
      ValidatorFactory['instance'] = null;
      ValidatorFactory['currentTypeResult'] = null;
      
      const validator = await ValidatorFactory.getValidator();
      
      expect(validator).toBeInstanceOf(MediumValidator);
    });

    it('should handle custom validation level with low security characteristics', async () => {
      const { ConfigLoader } = await import('../../src/config/ConfigLoader.js');
      const { ValidationTypeDetector } = await import('../../src/config/ValidationTypeDetector.js');
      
      const mockConfig = {
        validation_level: 'custom',
        allowed_commands: {
          'cmd1': {},
          'cmd2': {},
          'cmd3': {},
          'cmd4': {},
          'cmd5': {},
          'cmd6': {},
          'cmd7': {},
          'cmd8': {},
          'cmd9': {},
          'cmd10': {},
          'cmd11': {},
          'cmd12': {},
          'cmd13': {},
          'cmd14': {},
          'cmd15': {},
          'cmd16': {},
          'cmd17': {},
          'cmd18': {},
          'cmd19': {},
          'cmd20': {},
          'cmd21': {}
        }
      };
      
      (ConfigLoader.loadConfigFromResult as any).mockResolvedValue(mockConfig);
      (ValidationTypeDetector.detectValidationType as any).mockReturnValue({
        type: 'custom',
        value: '/path/to/config.yaml'
      });

      // Clear the cached instance to force recreation
      ValidatorFactory['instance'] = null;
      ValidatorFactory['currentTypeResult'] = null;
      
      const validator = await ValidatorFactory.getValidator();
      
      expect(validator).toBeInstanceOf(MinimalValidator);
    });

    it('should handle unknown built-in validation level', async () => {
      const { ConfigLoader } = await import('../../src/config/ConfigLoader.js');
      const { ValidationTypeDetector } = await import('../../src/config/ValidationTypeDetector.js');
      
      (ConfigLoader.loadConfigFromResult as any).mockResolvedValue(mockConfig);
      (ValidationTypeDetector.detectValidationType as any).mockReturnValue({
        type: 'builtin',
        value: 'unknown_level'
      });

      const validator = await ValidatorFactory.getValidator();
      
      expect(validator).toBeInstanceOf(AggressiveValidator);
    });

    it('should handle config loading errors', async () => {
      const { ConfigLoader } = await import('../../src/config/ConfigLoader.js');
      const { ValidationTypeDetector } = await import('../../src/config/ValidationTypeDetector.js');
      
      (ConfigLoader.loadConfigFromResult as any).mockRejectedValue(new Error('Config loading failed'));
      (ValidationTypeDetector.detectValidationType as any).mockReturnValue({
        type: 'custom',
        value: '/path/to/config.yaml'
      });

      const validator = await ValidatorFactory.getValidator();
      
      expect(validator).toBeInstanceOf(AggressiveValidator);
    });

    it('should handle getCurrentLevel for custom type', () => {
      // Set up a custom type result
      ValidatorFactory['currentTypeResult'] = {
        type: 'custom',
        value: '/path/to/config.yaml'
      };

      const level = ValidatorFactory.getCurrentLevel();
      
      expect(level).toBeNull();
    });

    it('should handle getCurrentLevel when no type result exists', () => {
      ValidatorFactory['currentTypeResult'] = null;

      const level = ValidatorFactory.getCurrentLevel();
      
      expect(level).toBeNull();
    });

    it('should handle getCurrentLevel for builtin type', () => {
      ValidatorFactory['currentTypeResult'] = {
        type: 'builtin',
        value: 'medium'
      };

      const level = ValidatorFactory.getCurrentLevel();
      
      expect(level).toBe('medium');
    });

    it('should handle recreateValidator', async () => {
      const { ValidationTypeDetector } = await import('../../src/config/ValidationTypeDetector.js');
      (ValidationTypeDetector.detectValidationType as any).mockReturnValue({
        type: 'builtin',
        value: 'aggressive'
      });

      const validator1 = await ValidatorFactory.getValidator();
      const validator2 = await ValidatorFactory.recreateValidator();
      
      expect(validator1).not.toBe(validator2);
    });
  });
}); 
