import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ValidatorFactory } from '../../src/validation/ValidatorFactory.js';
import { ValidationTypeDetector } from '../../src/config/ValidationTypeDetector.js';
import { ConfigLoader } from '../../src/config/ConfigLoader.js';
import { AggressiveValidator } from '../../src/validation/AggressiveValidator.js';
import { MediumValidator } from '../../src/validation/MediumValidator.js';
import { MinimalValidator } from '../../src/validation/MinimalValidator.js';
import { NoneValidator } from '../../src/validation/NoneValidator.js';
import { ValidationConfig } from '../../src/config/ValidationConfig.js';

// Mock dependencies
vi.mock('../../src/config/ValidationTypeDetector.js', () => ({
  ValidationTypeDetector: {
    detectValidationType: vi.fn()
  }
}));

vi.mock('../../src/config/ConfigLoader.js', () => ({
  ConfigLoader: {
    loadConfigFromResult: vi.fn(),
    loadConfig: vi.fn()
  }
}));

vi.mock('../../src/validation/AggressiveValidator.js', () => ({
  AggressiveValidator: vi.fn()
}));

vi.mock('../../src/validation/MediumValidator.js', () => ({
  MediumValidator: vi.fn()
}));

vi.mock('../../src/validation/MinimalValidator.js', () => ({
  MinimalValidator: vi.fn()
}));

vi.mock('../../src/validation/NoneValidator.js', () => ({
  NoneValidator: vi.fn()
}));

describe('ValidatorFactory', () => {
  let mockValidationTypeDetector: any;
  let mockConfigLoader: any;
  let mockAggressiveValidator: any;
  let mockMediumValidator: any;
  let mockMinimalValidator: any;
  let mockNoneValidator: any;
  let mockConfig: ValidationConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      validation_level: 'aggressive',
      description: 'Test configuration',
      allowed_commands: {
        'ls': { allowed_args: ['-l', '-a'], description: 'List files' }
      },
      forbidden_patterns: ['rm\\s+-rf'],
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
        max_arguments: 10,
        max_command_length: 1000,
        timeout_max: 30000,
        timeout_default: 10000
      }
    };

    mockValidationTypeDetector = {
      detectValidationType: vi.fn()
    };

    mockConfigLoader = {
      loadConfigFromResult: vi.fn(),
      loadConfig: vi.fn()
    };

    mockAggressiveValidator = {
      validateCommand: vi.fn(),
      validateFilePath: vi.fn(),
      buildEnvironment: vi.fn()
    };

    mockMediumValidator = {
      validateCommand: vi.fn(),
      validateFilePath: vi.fn(),
      buildEnvironment: vi.fn()
    };

    mockMinimalValidator = {
      validateCommand: vi.fn(),
      validateFilePath: vi.fn(),
      buildEnvironment: vi.fn()
    };

    mockNoneValidator = {
      validateCommand: vi.fn(),
      validateFilePath: vi.fn(),
      buildEnvironment: vi.fn()
    };

    (ValidationTypeDetector.detectValidationType as any) = mockValidationTypeDetector.detectValidationType;
    (ConfigLoader.loadConfigFromResult as any) = mockConfigLoader.loadConfigFromResult;
    (ConfigLoader.loadConfig as any) = mockConfigLoader.loadConfig;
    (AggressiveValidator as any).mockImplementation(() => mockAggressiveValidator);
    (MediumValidator as any).mockImplementation(() => mockMediumValidator);
    (MinimalValidator as any).mockImplementation(() => mockMinimalValidator);
    (NoneValidator as any).mockImplementation(() => mockNoneValidator);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clear static state
    (ValidatorFactory as any).instance = null;
    (ValidatorFactory as any).currentTypeResult = null;
  });

  describe('getValidator', () => {
    it('should create aggressive validator for aggressive type', async () => {
      mockValidationTypeDetector.detectValidationType.mockReturnValue({
        type: 'builtin',
        value: 'aggressive'
      });
      mockConfigLoader.loadConfigFromResult.mockResolvedValue(mockConfig);

      const result = await ValidatorFactory.getValidator();

      expect(ValidationTypeDetector.detectValidationType).toHaveBeenCalled();
      expect(ConfigLoader.loadConfigFromResult).toHaveBeenCalledWith({
        type: 'builtin',
        value: 'aggressive'
      });
      expect(AggressiveValidator).toHaveBeenCalledWith(mockConfig);
      expect(result).toBe(mockAggressiveValidator);
    });

    it('should create medium validator for medium type', async () => {
      mockValidationTypeDetector.detectValidationType.mockReturnValue({
        type: 'builtin',
        value: 'medium'
      });
      mockConfigLoader.loadConfigFromResult.mockResolvedValue(mockConfig);

      const result = await ValidatorFactory.getValidator();

      expect(MediumValidator).toHaveBeenCalledWith(mockConfig);
      expect(result).toBe(mockMediumValidator);
    });

    it('should create minimal validator for minimal type', async () => {
      mockValidationTypeDetector.detectValidationType.mockReturnValue({
        type: 'builtin',
        value: 'minimal'
      });
      mockConfigLoader.loadConfigFromResult.mockResolvedValue(mockConfig);

      const result = await ValidatorFactory.getValidator();

      expect(MinimalValidator).toHaveBeenCalledWith(mockConfig);
      expect(result).toBe(mockMinimalValidator);
    });

    it('should create none validator for none type', async () => {
      mockValidationTypeDetector.detectValidationType.mockReturnValue({
        type: 'builtin',
        value: 'none'
      });
      mockConfigLoader.loadConfigFromResult.mockResolvedValue(mockConfig);

      const result = await ValidatorFactory.getValidator();

      expect(NoneValidator).toHaveBeenCalledWith(mockConfig);
      expect(result).toBe(mockNoneValidator);
    });

    it('should create custom validator for custom type', async () => {
      const customConfig = { ...mockConfig, validation_level: 'custom' };
      mockValidationTypeDetector.detectValidationType.mockReturnValue({
        type: 'custom',
        value: '/path/to/config.yaml'
      });
      mockConfigLoader.loadConfigFromResult.mockResolvedValue(customConfig);

      const result = await ValidatorFactory.getValidator();

      expect(ConfigLoader.loadConfigFromResult).toHaveBeenCalledWith({
        type: 'custom',
        value: '/path/to/config.yaml'
      });
      expect(result).toBeDefined();
    });

    it('should cache validator instances', async () => {
      mockValidationTypeDetector.detectValidationType.mockReturnValue({
        type: 'builtin',
        value: 'aggressive'
      });
      mockConfigLoader.loadConfigFromResult.mockResolvedValue(mockConfig);

      const result1 = await ValidatorFactory.getValidator();
      const result2 = await ValidatorFactory.getValidator();

      expect(result1).toBe(result2);
      expect(AggressiveValidator).toHaveBeenCalledTimes(1);
    });

    it('should handle validation type detection errors', async () => {
      mockValidationTypeDetector.detectValidationType.mockImplementation(() => {
        throw new Error('Detection failed');
      });

      await expect(ValidatorFactory.getValidator()).rejects.toThrow('Detection failed');
    });

    it('should use aggressive fallback when config loading fails', async () => {
      mockValidationTypeDetector.detectValidationType.mockReturnValue({
        type: 'builtin',
        value: 'medium'
      });
      mockConfigLoader.loadConfigFromResult.mockRejectedValue(new Error('Config loading failed'));
      mockConfigLoader.loadConfig.mockResolvedValue(mockConfig);

      const result = await ValidatorFactory.getValidator();

      expect(ConfigLoader.loadConfig).toHaveBeenCalledWith('aggressive');
      expect(AggressiveValidator).toHaveBeenCalledWith(mockConfig);
      expect(result).toBe(mockAggressiveValidator);
    });
  });

  describe('getCurrentTypeResult', () => {
    it('should return null when no validator has been created', () => {
      const result = ValidatorFactory.getCurrentTypeResult();
      expect(result).toBeNull();
    });

    it('should return current type result after validator creation', async () => {
      const typeResult = { type: 'builtin', value: 'medium' };
      mockValidationTypeDetector.detectValidationType.mockReturnValue(typeResult);
      mockConfigLoader.loadConfigFromResult.mockResolvedValue(mockConfig);

      await ValidatorFactory.getValidator();
      const result = ValidatorFactory.getCurrentTypeResult();

      expect(result).toEqual(typeResult);
    });
  });

  describe('getCurrentLevel', () => {
    it('should return null when no validator has been created', () => {
      const result = ValidatorFactory.getCurrentLevel();
      expect(result).toBeNull();
    });

    it('should return validation level for builtin type', async () => {
      const typeResult = { type: 'builtin', value: 'aggressive' };
      mockValidationTypeDetector.detectValidationType.mockReturnValue(typeResult);
      mockConfigLoader.loadConfigFromResult.mockResolvedValue(mockConfig);

      await ValidatorFactory.getValidator();
      const result = ValidatorFactory.getCurrentLevel();

      expect(result).toBe('aggressive');
    });

    it('should return null for custom type', async () => {
      const typeResult = { type: 'custom', value: '/path/to/config.yaml' };
      mockValidationTypeDetector.detectValidationType.mockReturnValue(typeResult);
      mockConfigLoader.loadConfigFromResult.mockResolvedValue(mockConfig);

      await ValidatorFactory.getValidator();
      const result = ValidatorFactory.getCurrentLevel();

      expect(result).toBeNull();
    });
  });

  describe('recreateValidator', () => {
    it('should force recreation of validator', async () => {
      mockValidationTypeDetector.detectValidationType.mockReturnValue({
        type: 'builtin',
        value: 'aggressive'
      });
      mockConfigLoader.loadConfigFromResult.mockResolvedValue(mockConfig);

      const result1 = await ValidatorFactory.getValidator();
      const result2 = await ValidatorFactory.recreateValidator();

      expect(result1).toBe(result2);
      expect(AggressiveValidator).toHaveBeenCalledTimes(2);
    });

    it('should clear cached instance and type result', async () => {
      const typeResult = { type: 'builtin', value: 'aggressive' };
      mockValidationTypeDetector.detectValidationType.mockReturnValue(typeResult);
      mockConfigLoader.loadConfigFromResult.mockResolvedValue(mockConfig);

      await ValidatorFactory.getValidator();
      expect(ValidatorFactory.getCurrentTypeResult()).toEqual(typeResult);

      await ValidatorFactory.recreateValidator();
      expect(ValidatorFactory.getCurrentTypeResult()).toEqual(typeResult);
    });
  });
}); 
