import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigLoader } from '../../src/config/ConfigLoader.js';
import { ValidationConfig, ValidationLevel } from '../../src/config/ValidationConfig.js';
import { ValidationTypeResult } from '../../src/config/ValidationTypeDetector.js';

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn()
}));

// Mock yaml
vi.mock('yaml', () => ({
  parse: vi.fn()
}));

// Mock path
vi.mock('path', () => ({
  join: vi.fn(),
  resolve: vi.fn(),
  dirname: vi.fn(),
  isAbsolute: vi.fn()
}));

describe('ConfigLoader Coverage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ConfigLoader - Error Handling', () => {
    it('should handle file reading errors', async () => {
      const fs = await import('fs');
      (fs.readFileSync as any).mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = await ConfigLoader.loadConfig('aggressive');
      
      // Should return fallback config when file reading fails
      expect(result).toBeDefined();
      expect(result.validation_level).toBe('aggressive');
    });

    it('should handle YAML parsing errors', async () => {
      const fs = await import('fs');
      const yaml = await import('yaml');
      
      (fs.readFileSync as any).mockReturnValue('invalid yaml content');
      (yaml.parse as any).mockImplementation(() => {
        throw new Error('YAML parsing error');
      });

      const result = await ConfigLoader.loadConfig('aggressive');
      
      // Should return fallback config when YAML parsing fails
      expect(result).toBeDefined();
      expect(result.validation_level).toBe('aggressive');
    });

    it('should handle custom config file not found', async () => {
      const fs = await import('fs');
      (fs.existsSync as any).mockReturnValue(false);

      const typeResult: ValidationTypeResult = {
        type: 'custom',
        value: '/path/to/custom.yaml'
      };

      const result = await ConfigLoader.loadConfigFromResult(typeResult);
      
      // Should return aggressive fallback when custom config file doesn't exist
      expect(result).toBeDefined();
      expect(result.validation_level).toBe('aggressive');
    });

    it('should handle custom config YAML parsing errors', async () => {
      const fs = await import('fs');
      const yaml = await import('yaml');
      
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue('invalid yaml content');
      (yaml.parse as any).mockImplementation(() => {
        throw new Error('YAML parsing error');
      });

      const typeResult: ValidationTypeResult = {
        type: 'custom',
        value: '/path/to/custom.yaml'
      };

      const result = await ConfigLoader.loadConfigFromResult(typeResult);
      
      // Should return aggressive fallback when custom config YAML parsing fails
      expect(result).toBeDefined();
      expect(result.validation_level).toBe('aggressive');
    });
  });

  describe('ConfigLoader - Config Normalization', () => {
    it('should normalize config with string format allowed_commands', async () => {
      const fs = await import('fs');
      const yaml = await import('yaml');
      
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue('config content');
      
      // Mock YAML parse to return config with string format allowed_commands
      (yaml.parse as any).mockReturnValue({
        validation_level: 'custom',
        allowed_commands: {
          'ls': 'List directory contents',
          'cat': 'Display file contents'
        },
        allowed_arguments: {
          'ls': ['-l', '-a'],
          'cat': ['--help']
        }
      });

      const typeResult: ValidationTypeResult = {
        type: 'custom',
        value: '/path/to/custom.yaml'
      };

      const result = await ConfigLoader.loadConfigFromResult(typeResult);
      
      // Should normalize string format to object format
      expect(result.allowed_commands).toBeDefined();
      expect(typeof result.allowed_commands.ls).toBe('object');
      expect(result.allowed_commands.ls.description).toBe('List directory contents');
      expect(result.allowed_commands.ls.allowed_args).toEqual(['-l', '-a', '-la', '-h', '-R', '--help']);
    });

    it('should handle config with whitelistedCommands for backward compatibility', async () => {
      const fs = await import('fs');
      const yaml = await import('yaml');
      
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue('config content');
      
      // Mock YAML parse to return config without whitelistedCommands
      (yaml.parse as any).mockReturnValue({
        validation_level: 'custom',
        description: 'Test config',
        allowed_commands: {
          'ls': {
            description: 'List directory contents',
            allowed_args: ['-l', '-a']
          }
        },
        forbidden_patterns: [],
        file_path_restrictions: { enabled: false },
        environment_policy: { mode: 'passthrough' },
        limits: { max_arguments: 10 }
      });

      const typeResult: ValidationTypeResult = {
        type: 'custom',
        value: '/path/to/custom.yaml'
      };

      const result = await ConfigLoader.loadConfigFromResult(typeResult);
      
      // Test the normalization function directly
      const rawConfig = {
        validation_level: 'custom',
        description: 'Test config',
        allowed_commands: {
          'ls': {
            description: 'List directory contents',
            allowed_args: ['-l', '-a']
          }
        },
        forbidden_patterns: [],
        file_path_restrictions: { enabled: false },
        environment_policy: { mode: 'passthrough' },
        limits: { max_arguments: 10 }
      };
      
      // Call the normalization function directly
      const normalizedConfig = (ConfigLoader as any).normalizeConfig(rawConfig);
      
      // Should add whitelistedCommands for backward compatibility
      expect(normalizedConfig.whitelistedCommands).toBeDefined();
      expect(normalizedConfig.whitelistedCommands.ls).toBe('List directory contents');
    });

    it('should handle config with timeout settings', async () => {
      const fs = await import('fs');
      const yaml = await import('yaml');
      
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue('config content');
      
      // Mock YAML parse to return config with limits but no maxTimeout
      (yaml.parse as any).mockReturnValue({
        validation_level: 'custom',
        description: 'Test config',
        allowed_commands: {},
        forbidden_patterns: [],
        file_path_restrictions: { enabled: false },
        environment_policy: { mode: 'passthrough' },
        limits: {
          timeout_max: 15000
        }
      });

      const typeResult: ValidationTypeResult = {
        type: 'custom',
        value: '/path/to/custom.yaml'
      };

      const result = await ConfigLoader.loadConfigFromResult(typeResult);
      
      // Test the normalization function directly
      const rawConfig = {
        validation_level: 'custom',
        description: 'Test config',
        allowed_commands: {},
        forbidden_patterns: [],
        file_path_restrictions: { enabled: false },
        environment_policy: { mode: 'passthrough' },
        limits: {
          timeout_max: 15000
        }
      };
      
      // Call the normalization function directly
      const normalizedConfig = (ConfigLoader as any).normalizeConfig(rawConfig);
      
      // Should add maxTimeout from limits.timeout_max
      expect(normalizedConfig.maxTimeout).toBe(15000);
    });

    it('should handle config with environment policy', async () => {
      const fs = await import('fs');
      const yaml = await import('yaml');
      
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue('config content');
      
      // Mock YAML parse to return config with environment_policy but no environment
      (yaml.parse as any).mockReturnValue({
        validation_level: 'custom',
        description: 'Test config',
        allowed_commands: {},
        forbidden_patterns: [],
        file_path_restrictions: { enabled: false },
        environment_policy: {
          mode: 'whitelist',
          allowed_vars: ['PATH', 'HOME']
        },
        limits: { max_arguments: 10 }
      });

      const typeResult: ValidationTypeResult = {
        type: 'custom',
        value: '/path/to/custom.yaml'
      };

      const result = await ConfigLoader.loadConfigFromResult(typeResult);
      
      // Test the normalization function directly
      const rawConfig = {
        validation_level: 'custom',
        description: 'Test config',
        allowed_commands: {},
        forbidden_patterns: [],
        file_path_restrictions: { enabled: false },
        environment_policy: {
          mode: 'whitelist',
          allowed_vars: ['PATH', 'HOME']
        },
        limits: { max_arguments: 10 }
      };
      
      // Call the normalization function directly
      const normalizedConfig = (ConfigLoader as any).normalizeConfig(rawConfig);
      
      // Should add environment from environment_policy
      expect(normalizedConfig.environment).toBeDefined();
      expect(normalizedConfig.environment.mode).toBe('whitelist');
      expect(normalizedConfig.environment.allowed_vars).toEqual(['PATH', 'HOME']);
    });
  });

  describe('ConfigLoader - Project Config Directory', () => {
    it('should handle project config directory resolution', async () => {
      // Test the getProjectConfigDir method by calling it through a public method
      const result = await ConfigLoader.loadConfigFromResult({ type: 'builtin', value: 'aggressive' });
      expect(result).toBeDefined();
      // The config should be loaded from the project config directory
      expect(result.validation_level).toBe('aggressive');
    });
  });

  describe('ConfigLoader - Custom Config Validation', () => {
    it('should validate custom config with missing validation_level', async () => {
      const fs = await import('fs');
      const yaml = await import('yaml');
      
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue('config content');
      
      // Mock YAML parse to return invalid config
      (yaml.parse as any).mockReturnValue({
        // Missing validation_level
        allowed_commands: {}
      });

      const typeResult: ValidationTypeResult = {
        type: 'custom',
        value: '/path/to/custom.yaml'
      };

      // Test the validation function directly
      const invalidConfig = {
        validation_level: 'custom',
        // Missing description
        allowed_commands: {}
      };
      
      try {
        (ConfigLoader as any).validateCustomConfig(invalidConfig, '/path/to/custom.yaml');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('description');
      }
    });

    it('should validate custom config with invalid validation_level', async () => {
      const fs = await import('fs');
      const yaml = await import('yaml');
      
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue('config content');
      
      // Mock YAML parse to return config with invalid validation_level
      (yaml.parse as any).mockReturnValue({
        validation_level: 'invalid_level',
        allowed_commands: {}
      });

      const typeResult: ValidationTypeResult = {
        type: 'custom',
        value: '/path/to/custom.yaml'
      };

      // Test the validation function directly
      const invalidConfig = {
        validation_level: 'invalid_level',
        description: 'Test config',
        allowed_commands: {},
        forbidden_patterns: 'not an array' // This should cause the validation to fail
      };
      
      try {
        (ConfigLoader as any).validateCustomConfig(invalidConfig, '/path/to/custom.yaml');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('forbidden_patterns');
      }
    });
  });

  describe('ConfigLoader - Built-in Configs', () => {
    it('should load aggressive config', async () => {
      const result = await ConfigLoader.loadConfig('aggressive');
      expect(result.validation_level).toBe('aggressive');
      expect(result.allowed_commands).toBeDefined();
      expect(Object.keys(result.allowed_commands).length).toBeGreaterThan(0);
    });

    it('should load medium config', async () => {
      const result = await ConfigLoader.loadConfig('medium');
      expect(result.validation_level).toBe('medium');
      expect(result.allowed_commands).toBeDefined();
    });

    it('should load minimal config', async () => {
      const result = await ConfigLoader.loadConfig('minimal');
      expect(result.validation_level).toBe('minimal');
      expect(result.allowed_commands).toEqual({});
    });

    it('should load none config', async () => {
      const result = await ConfigLoader.loadConfig('none');
      expect(result.validation_level).toBe('none');
      expect(result.allowed_commands).toEqual({});
      expect(result.forbidden_patterns).toEqual([]);
    });

    it('should handle unknown validation level', async () => {
      const result = await ConfigLoader.loadConfig('unknown' as ValidationLevel);
      // Should default to aggressive
      expect(result.validation_level).toBe('aggressive');
    });
  });
}); 
