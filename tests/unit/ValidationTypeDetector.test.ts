import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationTypeDetector, ValidationTypeResult } from '../../src/config/ValidationTypeDetector.js';
import { ValidationLevel } from '../../src/config/ValidationConfig.js';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path modules
vi.mock('fs');
vi.mock('path');

const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

describe('ValidationTypeDetector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Mock path operations
    mockPath.dirname.mockReturnValue('/mock/src/config');
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.resolve.mockImplementation((...args) => args.join('/'));
    mockPath.isAbsolute.mockReturnValue(false);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('detectValidationType', () => {
    it('should return aggressive when COMMAND_VALIDATION is not set', () => {
      delete process.env.COMMAND_VALIDATION;

      const result = ValidationTypeDetector.detectValidationType();

      expect(result).toEqual({ type: 'builtin', value: 'aggressive' });
    });

    it('should return aggressive for invalid validation level', () => {
      process.env.COMMAND_VALIDATION = 'invalid';

      const result = ValidationTypeDetector.detectValidationType();

      expect(result).toEqual({ type: 'builtin', value: 'aggressive' });
    });

    it('should return aggressive for valid aggressive level', () => {
      process.env.COMMAND_VALIDATION = 'aggressive';

      const result = ValidationTypeDetector.detectValidationType();

      expect(result).toEqual({ type: 'builtin', value: 'aggressive' });
    });

    it('should return medium for valid medium level', () => {
      process.env.COMMAND_VALIDATION = 'medium';

      const result = ValidationTypeDetector.detectValidationType();

      expect(result).toEqual({ type: 'builtin', value: 'medium' });
    });

    it('should return minimal for valid minimal level', () => {
      process.env.COMMAND_VALIDATION = 'minimal';

      const result = ValidationTypeDetector.detectValidationType();

      expect(result).toEqual({ type: 'builtin', value: 'minimal' });
    });

    it('should return none for valid none level', () => {
      process.env.COMMAND_VALIDATION = 'none';

      const result = ValidationTypeDetector.detectValidationType();

      expect(result).toEqual({ type: 'builtin', value: 'none' });
    });

    it('should handle case-insensitive validation levels', () => {
      process.env.COMMAND_VALIDATION = 'AGGRESSIVE';

      const result = ValidationTypeDetector.detectValidationType();

      expect(result).toEqual({ type: 'builtin', value: 'aggressive' });
    });

    it('should return custom type for valid YAML file path', () => {
      process.env.COMMAND_VALIDATION = '/path/to/config.yaml';
      mockPath.isAbsolute.mockReturnValue(true);
      mockFs.existsSync.mockReturnValue(true);

      const result = ValidationTypeDetector.detectValidationType();

      expect(result).toEqual({ type: 'custom', value: '/path/to/config.yaml' });
    });

    it('should return custom type for relative YAML file path', () => {
      process.env.COMMAND_VALIDATION = 'config.yaml';
      mockPath.isAbsolute.mockReturnValue(false);
      mockFs.existsSync.mockReturnValue(true);

      const result = ValidationTypeDetector.detectValidationType();

      expect(result).toEqual({ type: 'custom', value: 'config.yaml' });
    });

    it('should return aggressive for non-YAML file path', () => {
      process.env.COMMAND_VALIDATION = '/path/to/config.txt';

      const result = ValidationTypeDetector.detectValidationType();

      expect(result).toEqual({ type: 'builtin', value: 'aggressive' });
    });

    it('should return aggressive for non-existent YAML file', () => {
      process.env.COMMAND_VALIDATION = '/path/to/nonexistent.yaml';
      mockPath.isAbsolute.mockReturnValue(true);
      mockFs.existsSync.mockReturnValue(false);

      const result = ValidationTypeDetector.detectValidationType();

      expect(result).toEqual({ type: 'builtin', value: 'aggressive' });
    });

    it('should handle .yml extension', () => {
      process.env.COMMAND_VALIDATION = '/path/to/config.yml';
      mockPath.isAbsolute.mockReturnValue(true);
      mockFs.existsSync.mockReturnValue(true);

      const result = ValidationTypeDetector.detectValidationType();

      expect(result).toEqual({ type: 'custom', value: '/path/to/config.yml' });
    });
  });

  describe('getCurrentValidationType', () => {
    it('should return the same result as detectValidationType', () => {
      process.env.COMMAND_VALIDATION = 'medium';

      const result1 = ValidationTypeDetector.detectValidationType();
      const result2 = ValidationTypeDetector.getCurrentValidationType();

      expect(result2).toEqual(result1);
    });

    it('should return current validation type for logging', () => {
      process.env.COMMAND_VALIDATION = 'aggressive';

      const result = ValidationTypeDetector.getCurrentValidationType();

      expect(result).toEqual({ type: 'builtin', value: 'aggressive' });
    });
  });

  describe('detectValidationLevel (legacy)', () => {
    it('should return builtin level for builtin type', () => {
      process.env.COMMAND_VALIDATION = 'medium';

      const result = ValidationTypeDetector.detectValidationLevel();

      expect(result).toBe('medium');
    });

    it('should return aggressive for custom type', () => {
      process.env.COMMAND_VALIDATION = '/path/to/config.yaml';
      mockPath.isAbsolute.mockReturnValue(true);
      mockFs.existsSync.mockReturnValue(true);

      const result = ValidationTypeDetector.detectValidationLevel();

      expect(result).toBe('aggressive');
    });

    it('should return aggressive when COMMAND_VALIDATION is not set', () => {
      delete process.env.COMMAND_VALIDATION;

      const result = ValidationTypeDetector.detectValidationLevel();

      expect(result).toBe('aggressive');
    });
  });

  describe('isCustomConfigPath (private method)', () => {
    it('should return false for non-YAML files', () => {
      process.env.COMMAND_VALIDATION = '/path/to/config.txt';

      const result = ValidationTypeDetector.detectValidationType();

      expect(result.type).toBe('builtin');
    });

    it('should return true for absolute YAML file path that exists', () => {
      process.env.COMMAND_VALIDATION = '/path/to/config.yaml';
      mockPath.isAbsolute.mockReturnValue(true);
      mockFs.existsSync.mockReturnValue(true);

      const result = ValidationTypeDetector.detectValidationType();

      expect(result.type).toBe('custom');
    });

    it('should return false for absolute YAML file path that does not exist', () => {
      process.env.COMMAND_VALIDATION = '/path/to/nonexistent.yaml';
      mockPath.isAbsolute.mockReturnValue(true);
      mockFs.existsSync.mockReturnValue(false);

      const result = ValidationTypeDetector.detectValidationType();

      expect(result.type).toBe('builtin');
    });

    it('should handle relative paths correctly', () => {
      process.env.COMMAND_VALIDATION = 'config.yaml';
      mockPath.isAbsolute.mockReturnValue(false);
      mockFs.existsSync.mockReturnValue(true);

      const result = ValidationTypeDetector.detectValidationType();

      expect(result.type).toBe('custom');
    });

    it('should try project root first for relative paths', () => {
      process.env.COMMAND_VALIDATION = 'config.yaml';
      mockPath.isAbsolute.mockReturnValue(false);
      mockFs.existsSync
        .mockReturnValueOnce(false) // Project root path doesn't exist
        .mockReturnValueOnce(true); // Current working directory path exists

      const result = ValidationTypeDetector.detectValidationType();

      expect(result.type).toBe('custom');
      expect(mockFs.existsSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('ValidationTypeResult interface', () => {
    it('should support builtin type with ValidationLevel', () => {
      const result: ValidationTypeResult = {
        type: 'builtin',
        value: 'aggressive'
      };

      expect(result.type).toBe('builtin');
      expect(result.value).toBe('aggressive');
    });

    it('should support custom type with string path', () => {
      const result: ValidationTypeResult = {
        type: 'custom',
        value: '/path/to/config.yaml'
      };

      expect(result.type).toBe('custom');
      expect(result.value).toBe('/path/to/config.yaml');
    });
  });
}); 
