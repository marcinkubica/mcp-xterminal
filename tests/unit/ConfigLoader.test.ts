import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationConfig } from '../../src/config/ValidationConfig.js';
import { ValidationTypeResult } from '../../src/config/ValidationTypeDetector.js';

// Mock fs, yaml, and path modules before importing ConfigLoader
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn()
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn()
}));

vi.mock('js-yaml', () => ({
  default: {
    load: vi.fn()
  },
  load: vi.fn()
}));

vi.mock('path', () => ({
  default: {
    dirname: vi.fn(),
    join: vi.fn(),
    resolve: vi.fn(),
    isAbsolute: vi.fn()
  },
  dirname: vi.fn(),
  join: vi.fn(),
  resolve: vi.fn(),
  isAbsolute: vi.fn()
}));

// Import ConfigLoader after mocking
import { ConfigLoader } from '../../src/config/ConfigLoader.js';

describe('ConfigLoader', () => {
  let mockFs: any;
  let mockYaml: any;
  
  const mockConfig: ValidationConfig = {
    validation_level: 'aggressive',
    description: 'Maximum security - suitable for untrusted environments',
    allowed_commands: {
      ls: { allowed_args: ['-l', '-a', '-la', '-h', '-R', '--help'], description: 'List directory contents' },
      cat: { allowed_args: ['--help'], description: 'Display file contents', requires_file: true },
      head: { allowed_args: ['-n', '--help'], description: 'Display first lines of file', requires_file: true },
      tail: { allowed_args: ['-n', '--help'], description: 'Display last lines of file', requires_file: true },
      file: { allowed_args: ['--help'], description: 'Determine file type', requires_file: true },
      wc: { allowed_args: ['-l', '-w', '-c', '--help'], description: 'Word, line, character count', requires_file: true },
      pwd: { allowed_args: ['--help'], description: 'Print working directory' },
      find: { allowed_args: ['-name', '-type', '-maxdepth', '--help'], description: 'Find files and directories' },
      tree: { allowed_args: ['-L', '-a', '--help'], description: 'Display directory tree' },
      whoami: { allowed_args: ['--help'], description: 'Show current user' },
      id: { allowed_args: ['--help'], description: 'Show user and group IDs' },
      uname: { allowed_args: ['-a', '-r', '-s', '--help'], description: 'System information' },
      date: { allowed_args: ['--help'], description: 'Show current date and time' },
      uptime: { allowed_args: ['--help'], description: 'Show system uptime' },
      df: { allowed_args: ['-h', '--help'], description: 'Show disk space usage' },
      free: { allowed_args: ['-h', '--help'], description: 'Show memory usage' },
      ps: { allowed_args: ['aux', '--help'], description: 'Show running processes' },
      node: { allowed_args: ['--version', '--help'], description: 'Node.js version' },
      npm: { allowed_args: ['--version', 'list', '--help'], description: 'NPM operations (limited)' },
      git: { allowed_args: ['status', 'log', '--oneline', 'branch', 'diff', '--help'], description: 'Git operations (read-only)' },
      which: { allowed_args: ['--help'], description: 'Locate command' },
      type: { allowed_args: ['--help'], description: 'Display command type' },
      grep: { allowed_args: ['-n', '-i', '-r', '--help'], description: 'Search text patterns', requires_file: true },
      sort: { allowed_args: ['-n', '-r', '--help'], description: 'Sort lines', requires_file: true },
      uniq: { allowed_args: ['-c', '--help'], description: 'Report unique lines', requires_file: true },
      man: { allowed_args: ['--help'], description: 'Manual pages', requires_file: true },
      help: { allowed_args: [], description: 'Help command' },
      echo: { allowed_args: ['--help'], description: 'Display text (limited)' }
    },
    forbidden_patterns: [
      '[;&|`$(){}]',
      '\\brm\\b|\\bmv\\b|\\bcp\\b|\\btouch\\b|\\bmkdir\\b|\\brmdir\\b',
      '\\bcurl\\b|\\bwget\\b|\\bssh\\b|\\bscp\\b|\\brsync\\b|\\bftp\\b|\\btelnet\\b',
      '\\bsudo\\b|\\bsu\\b|\\bchmod\\b|\\bchown\\b|\\bmount\\b|\\bumount\\b',
      '\\bkill\\b|\\bkillall\\b|\\bnohup\\b|\\bbg\\b|\\bfg\\b|\\bjobs\\b',
      '\\bapt\\b|\\byum\\b|\\bpip\\b|\\binstall\\b|\\bremove\\b|\\bupdate\\b|\\bupgrade\\b',
      '\\bvi\\b|\\bvim\\b|\\bnano\\b|\\bemacs\\b|\\btop\\b|\\bhtop\\b|\\bless\\b|\\bmore\\b',
      '\\bsource\\b|\\b\\.\\b|\\bexport\\b|\\balias\\b|\\bunalias\\b|\\bhistory\\b',
      '[<>]',
      '[*?\\[\\]]'
    ],
    file_path_restrictions: {
      enabled: true,
      pattern: '^/?[a-zA-Z0-9._/-]+$',
      max_path_length: 255
    },
    environment_policy: {
      mode: 'whitelist',
      allowed_vars: ['PATH', 'HOME', 'USER', 'SHELL']
    },
    limits: {
      max_arguments: 10,
      max_command_length: 1000,
      timeout_max: 10000,
      timeout_default: 10000
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockFs = {
      existsSync: vi.fn(),
      readFileSync: vi.fn()
    };
    
    mockYaml = {
      load: vi.fn()
    };

    // Set up mock implementations for ES6 imports
    const fs = require('fs');
    const yaml = require('js-yaml');
    const path = require('path');
    
    // Mock both default and named exports
    fs.existsSync = mockFs.existsSync;
    fs.readFileSync = mockFs.readFileSync;
    fs.default = { existsSync: mockFs.existsSync, readFileSync: mockFs.readFileSync };
    
    yaml.load = mockYaml.load;
    yaml.default = { load: mockYaml.load };
    
    // Mock path functions
    path.dirname = vi.fn().mockReturnValue('/mock/dir');
    path.join = vi.fn().mockImplementation((...args) => args.join('/'));
    path.resolve = vi.fn().mockImplementation((...args) => '/resolved/' + args.join('/'));
    path.isAbsolute = vi.fn().mockReturnValue(false);
    path.default = {
      dirname: path.dirname,
      join: path.join,
      resolve: path.resolve,
      isAbsolute: path.isAbsolute
    };
  });

  describe('loadConfig', () => {
    it('should load aggressive config when level is aggressive', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('test yaml content');
      mockYaml.load.mockReturnValue(mockConfig);

      const result = await ConfigLoader.loadConfig('aggressive');

      expect(result).toEqual(mockConfig);
    });

    it('should return fallback config when file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      const result = await ConfigLoader.loadConfig('aggressive');
      expect(result.validation_level).toBe('aggressive');
      expect(result.allowed_commands).toBeDefined();
    });

    it('should return fallback config when yaml parsing fails', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid yaml');
      mockYaml.load.mockImplementation(() => { throw new Error('YAML parsing error'); });
      const result = await ConfigLoader.loadConfig('aggressive');
      expect(result.validation_level).toBe('aggressive');
    });

    it('should return fallback config when file reading fails', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => { throw new Error('File read error'); });
      const result = await ConfigLoader.loadConfig('aggressive');
      expect(result.validation_level).toBe('aggressive');
    });
  });

  describe('loadConfigFromResult', () => {
    it('should load builtin config for builtin type', async () => {
      const typeResult: ValidationTypeResult = { type: 'builtin', value: 'aggressive' };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('test yaml content');
      mockYaml.load.mockReturnValue(mockConfig);
      const result = await ConfigLoader.loadConfigFromResult(typeResult);
      expect(result).toEqual(mockConfig);
    });
    it('should load custom config for custom type', async () => {
      const typeResult: ValidationTypeResult = { type: 'custom', value: '/path/to/custom.yaml' };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('test yaml content');
      mockYaml.load.mockReturnValue(mockConfig);
      const result = await ConfigLoader.loadConfigFromResult(typeResult);
      expect(result).toEqual(mockConfig);
    });
    it('should return fallback config when custom config file does not exist', async () => {
      const typeResult: ValidationTypeResult = { type: 'custom', value: '/path/to/nonexistent.yaml' };
      mockFs.existsSync.mockReturnValue(false);
      const result = await ConfigLoader.loadConfigFromResult(typeResult);
      expect(result.validation_level).toBe('aggressive');
    });
    it('should return fallback config when custom config yaml parsing fails', async () => {
      const typeResult: ValidationTypeResult = { type: 'custom', value: '/path/to/custom.yaml' };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid yaml');
      mockYaml.load.mockImplementation(() => { throw new Error('YAML parsing error'); });
      const result = await ConfigLoader.loadConfigFromResult(typeResult);
      expect(result.validation_level).toBe('aggressive');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config structure', () => {
      expect(() => ConfigLoader['validateConfig'](mockConfig, 'aggressive')).not.toThrow();
    });
    it('should throw error for missing validation_level', () => {
      const invalidConfig = { ...mockConfig };
      delete (invalidConfig as any).validation_level;
      expect(() => ConfigLoader['validateConfig'](invalidConfig, 'aggressive')).toThrow('Configuration missing validation_level');
    });
    it('should throw error for validation_level mismatch', () => {
      const invalidConfig = { ...mockConfig, validation_level: 'medium' };
      expect(() => ConfigLoader['validateConfig'](invalidConfig, 'aggressive')).toThrow('Configuration validation_level mismatch: expected aggressive, got medium');
    });
    it('should throw error for missing description', () => {
      const invalidConfig = { ...mockConfig };
      delete (invalidConfig as any).description;
      expect(() => ConfigLoader['validateConfig'](invalidConfig, 'aggressive')).toThrow('Configuration missing description');
    });
    it('should throw error for missing allowed_commands', () => {
      const invalidConfig = { ...mockConfig };
      delete (invalidConfig as any).allowed_commands;
      expect(() => ConfigLoader['validateConfig'](invalidConfig, 'aggressive')).toThrow('Configuration missing allowed_commands');
    });
    it('should throw error for forbidden_patterns not array', () => {
      const invalidConfig = { ...mockConfig, forbidden_patterns: undefined };
      expect(() => ConfigLoader['validateConfig'](invalidConfig, 'aggressive')).toThrow('Configuration forbidden_patterns must be an array');
    });
    it('should throw error for missing file_path_restrictions', () => {
      const invalidConfig = { ...mockConfig };
      delete (invalidConfig as any).file_path_restrictions;
      expect(() => ConfigLoader['validateConfig'](invalidConfig, 'aggressive')).toThrow('Configuration missing file_path_restrictions');
    });
    it('should throw error for missing environment_policy', () => {
      const invalidConfig = { ...mockConfig };
      delete (invalidConfig as any).environment_policy;
      expect(() => ConfigLoader['validateConfig'](invalidConfig, 'aggressive')).toThrow('Configuration missing environment_policy');
    });
    it('should throw error for missing limits', () => {
      const invalidConfig = { ...mockConfig };
      delete (invalidConfig as any).limits;
      expect(() => ConfigLoader['validateConfig'](invalidConfig, 'aggressive')).toThrow('Configuration missing limits');
    });
  });
}); 
