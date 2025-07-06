import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { ValidationConfig, ValidationLevel } from './ValidationConfig.js';

export class ConfigLoader {
  private static readonly CONFIG_DIR = path.join(process.cwd(), 'config', 'validation');
  
  /**
   * Loads validation configuration from YAML file
   * @param validationLevel The validation level to load
   * @returns The loaded configuration
   */
  static async loadConfig(validationLevel: ValidationLevel): Promise<ValidationConfig> {
    const configPath = path.join(this.CONFIG_DIR, `${validationLevel}.yaml`);
    
    try {
      // Check if config file exists
      if (!fs.existsSync(configPath)) {
        console.warn(`🔒 Configuration file not found: ${configPath}, using hardcoded fallback`);
        return this.getHardcodedFallback(validationLevel);
      }

      // Read and parse YAML file
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent) as ValidationConfig;
      
      // Validate the loaded configuration
      this.validateConfig(config, validationLevel);
      
      console.log(`🔒 Loaded ${validationLevel} validation configuration from ${configPath}`);
      return config;
      
    } catch (error) {
      console.error(`🔒 Error loading configuration file ${configPath}:`, error);
      console.warn('🔒 Using hardcoded fallback configuration');
      return this.getHardcodedFallback(validationLevel);
    }
  }

  /**
   * Validates the loaded configuration
   * @param config The configuration to validate
   * @param expectedLevel The expected validation level
   */
  private static validateConfig(config: ValidationConfig, expectedLevel: ValidationLevel): void {
    if (!config.validation_level) {
      throw new Error('Configuration missing validation_level');
    }
    
    if (config.validation_level !== expectedLevel) {
      throw new Error(`Configuration validation_level mismatch: expected ${expectedLevel}, got ${config.validation_level}`);
    }
    
    if (!config.description) {
      throw new Error('Configuration missing description');
    }
    
    if (!config.allowed_commands && expectedLevel !== 'minimal' && expectedLevel !== 'none') {
      throw new Error('Configuration missing allowed_commands');
    }
    
    if (!Array.isArray(config.forbidden_patterns)) {
      throw new Error('Configuration forbidden_patterns must be an array');
    }
    
    if (!config.file_path_restrictions) {
      throw new Error('Configuration missing file_path_restrictions');
    }
    
    if (!config.environment_policy) {
      throw new Error('Configuration missing environment_policy');
    }
    
    if (!config.limits) {
      throw new Error('Configuration missing limits');
    }
  }

  /**
   * Returns hardcoded fallback configuration for when YAML files are not available
   * @param validationLevel The validation level
   * @returns Hardcoded configuration
   */
  private static getHardcodedFallback(validationLevel: ValidationLevel): ValidationConfig {
    switch (validationLevel) {
      case 'aggressive':
        return this.getAggressiveConfig();
      case 'medium':
        return this.getMediumConfig();
      case 'minimal':
        return this.getMinimalConfig();
      case 'none':
        return this.getNoneConfig();
      default:
        return this.getAggressiveConfig();
    }
  }

  private static getAggressiveConfig(): ValidationConfig {
    return {
      validation_level: 'aggressive',
      description: 'Maximum security - suitable for untrusted environments',
      allowed_commands: {
        'ls': { allowed_args: ['-l', '-a', '-la', '-h', '-R', '--help'], description: 'List directory contents' },
        'cat': { allowed_args: ['--help'], description: 'Display file contents', requires_file: true },
        'head': { allowed_args: ['-n', '--help'], description: 'Display first lines of file', requires_file: true },
        'tail': { allowed_args: ['-n', '--help'], description: 'Display last lines of file', requires_file: true },
        'file': { allowed_args: ['--help'], description: 'Determine file type', requires_file: true },
        'wc': { allowed_args: ['-l', '-w', '-c', '--help'], description: 'Word, line, character count', requires_file: true },
        'pwd': { allowed_args: ['--help'], description: 'Print working directory' },
        'find': { allowed_args: ['-name', '-type', '-maxdepth', '--help'], description: 'Find files and directories' },
        'tree': { allowed_args: ['-L', '-a', '--help'], description: 'Display directory tree' },
        'whoami': { allowed_args: ['--help'], description: 'Show current user' },
        'id': { allowed_args: ['--help'], description: 'Show user and group IDs' },
        'uname': { allowed_args: ['-a', '-r', '-s', '--help'], description: 'System information' },
        'date': { allowed_args: ['--help'], description: 'Show current date and time' },
        'uptime': { allowed_args: ['--help'], description: 'Show system uptime' },
        'df': { allowed_args: ['-h', '--help'], description: 'Show disk space usage' },
        'free': { allowed_args: ['-h', '--help'], description: 'Show memory usage' },
        'ps': { allowed_args: ['aux', '--help'], description: 'Show running processes' },
        'node': { allowed_args: ['--version', '--help'], description: 'Node.js version' },
        'npm': { allowed_args: ['--version', 'list', '--help'], description: 'NPM operations (limited)' },
        'git': { allowed_args: ['status', 'log', '--oneline', 'branch', 'diff', '--help'], description: 'Git operations (read-only)' },
        'which': { allowed_args: ['--help'], description: 'Locate command' },
        'type': { allowed_args: ['--help'], description: 'Display command type' },
        'grep': { allowed_args: ['-n', '-i', '-r', '--help'], description: 'Search text patterns', requires_file: true },
        'sort': { allowed_args: ['-n', '-r', '--help'], description: 'Sort lines', requires_file: true },
        'uniq': { allowed_args: ['-c', '--help'], description: 'Report unique lines', requires_file: true },
        'man': { allowed_args: ['--help'], description: 'Manual pages', requires_file: true },
        'help': { allowed_args: [], description: 'Help command' },
        'echo': { allowed_args: ['--help'], description: 'Display text (limited)' }
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
  }

  private static getMediumConfig(): ValidationConfig {
    return {
      validation_level: 'medium',
      description: 'Balanced security - suitable for trusted development environments',
      allowed_commands: {
        // File operations (expanded)
        'ls': { allowed_args: ['-l', '-a', '-la', '-h', '-R', '-1', '-F', '-t', '-S', '--help'], description: 'List directory contents' },
        'cat': { allowed_args: ['-n', '-b', '-s', '--help'], description: 'Display file contents', requires_file: true },
        'head': { allowed_args: ['-n', '-c', '--help'], description: 'Display first lines of file', requires_file: true },
        'tail': { allowed_args: ['-n', '-c', '-f', '--help'], description: 'Display last lines of file', requires_file: true },
        'file': { allowed_args: ['--help'], description: 'Determine file type', requires_file: true },
        'wc': { allowed_args: ['-l', '-w', '-c', '--help'], description: 'Word, line, character count', requires_file: true },
        'pwd': { allowed_args: ['--help'], description: 'Print working directory' },
        'find': { allowed_args: ['-name', '-type', '-maxdepth', '--help'], description: 'Find files and directories' },
        'tree': { allowed_args: ['-L', '-a', '--help'], description: 'Display directory tree' },
        'whoami': { allowed_args: ['--help'], description: 'Show current user' },
        'id': { allowed_args: ['--help'], description: 'Show user and group IDs' },
        'uname': { allowed_args: ['-a', '-r', '-s', '--help'], description: 'System information' },
        'date': { allowed_args: ['--help'], description: 'Show current date and time' },
        'uptime': { allowed_args: ['--help'], description: 'Show system uptime' },
        'df': { allowed_args: ['-h', '--help'], description: 'Show disk space usage' },
        'free': { allowed_args: ['-h', '--help'], description: 'Show memory usage' },
        'ps': { allowed_args: ['aux', 'ef', '-u', '-p', '--help'], description: 'Process status' },
        'netstat': { allowed_args: ['-tuln', '-r', '--help'], description: 'Network statistics' },
        'lsof': { allowed_args: ['-i', '-p', '-u', '--help'], description: 'List open files' },
        // Text processing (expanded)
        'grep': { allowed_args: ['-n', '-i', '-r', '-v', '-c', '-l', '-w', '-x', '-E', '-F', '--help'], description: 'Search text patterns', requires_file: true },
        'sed': { allowed_args: ['-n', '-e', '-f', '--help'], description: 'Stream editor', requires_file: true },
        'awk': { allowed_args: ['-F', '-v', '--help'], description: 'Pattern scanning and processing', requires_file: true },
        'sort': { allowed_args: ['-n', '-r', '--help'], description: 'Sort lines', requires_file: true },
        'uniq': { allowed_args: ['-c', '--help'], description: 'Report unique lines', requires_file: true },
        // Development tools (expanded)
        'node': { allowed_args: ['--version', '--help', '-e', '-p', '--eval', '--print'], description: 'Node.js runtime' },
        'npm': { allowed_args: ['--version', 'list', 'ls', 'info', 'view', 'search', 'outdated', '--help'], description: 'NPM operations' },
        'git': { allowed_args: ['status', 'log', '--oneline', 'branch', 'diff', 'show', 'config', '--help'], description: 'Git operations' },
        'which': { allowed_args: ['--help'], description: 'Locate command' },
        'type': { allowed_args: ['--help'], description: 'Display command type' },
        'man': { allowed_args: ['--help'], description: 'Manual pages', requires_file: true },
        'help': { allowed_args: [], description: 'Help command' },
        'echo': { allowed_args: ['--help'], description: 'Display text (limited)' }
      },
      forbidden_patterns: [
        '[;&|`$(){}]',
        '\\brm\\b -rf|\\brm\\b -fr',
        '\\bsudo\\b|\\bsu\\b',
        '\\bkill\\b -9|\\bkillall\\b',
        '\\bchmod\\b 777|\\bchown\\b root'
      ],
      file_path_restrictions: {
        enabled: true,
        pattern: '^/?[a-zA-Z0-9._/-]+$',
        max_path_length: 1000
      },
      environment_policy: {
        mode: 'blacklist',
        blocked_vars: ['PASSWORD', 'SECRET', 'TOKEN', 'KEY', 'PRIVATE']
      },
      limits: {
        max_arguments: 20,
        max_command_length: 2000,
        timeout_max: 30000,
        timeout_default: 10000
      }
    };
  }

  private static getMinimalConfig(): ValidationConfig {
    return {
      validation_level: 'minimal',
      description: 'Minimal security - basic safety nets for trusted environments',
      allowed_commands: {}, // Empty = all commands allowed
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
        timeout_max: 300000, // 5 minutes
        timeout_default: 30000
      }
    };
  }

  private static getNoneConfig(): ValidationConfig {
    return {
      validation_level: 'none',
      description: 'Zero security limits - complete freedom (maximum trust only, also UNSAFE)',
      allowed_commands: {}, // Empty = all commands allowed
      forbidden_patterns: [], // No restrictions
      file_path_restrictions: {
        enabled: false
      },
      environment_policy: {
        mode: 'passthrough'
      },
      limits: {
        max_arguments: -1, // No limit (-1 = unlimited)
        max_command_length: -1, // No limit (-1 = unlimited)
        timeout_max: -1, // No limit (-1 = unlimited)
        timeout_default: -1 // No limit (-1 = unlimited)
      }
    };
  }
}
