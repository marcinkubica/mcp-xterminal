import { ValidationConfig } from '../config/ValidationConfig.js';

export interface CommandValidationResult {
  isValid: boolean;
  sanitizedCommand?: string;
  sanitizedArgs?: string[];
  error?: string;
}

export abstract class BaseValidator {
  protected config: ValidationConfig;

  constructor(config: ValidationConfig) {
    this.config = config;
  }

  /**
   * Validates a command and its arguments
   * @param command The command to validate
   * @param args The command arguments
   * @returns Validation result
   */
  abstract validateCommand(command: string, args: string[]): CommandValidationResult;

  /**
   * Validates file path access
   * @param path The file path to validate
   * @returns True if path is allowed
   */
  abstract validateFilePath(path: string): boolean;

  /**
   * Builds environment variables based on policy
   * @param additionalEnv Additional environment variables to include
   * @returns Filtered environment variables
   */
  abstract buildEnvironment(additionalEnv?: Record<string, string>): Record<string, string>;

  /**
   * Gets the timeout value for command execution
   * @param requestedTimeout The requested timeout
   * @returns The actual timeout to use
   */
  getTimeout(requestedTimeout?: number): number {
    if (this.config.limits.timeout_max === -1) {
      return requestedTimeout || this.config.limits.timeout_default;
    }
    
    const defaultTimeout = this.config.limits.timeout_default === -1 ? 30000 : this.config.limits.timeout_default;
    const maxTimeout = this.config.limits.timeout_max === -1 ? Number.MAX_SAFE_INTEGER : this.config.limits.timeout_max;
    
    return Math.min(requestedTimeout || defaultTimeout, maxTimeout);
  }

  /**
   * Gets the validation level
   */
  getValidationLevel(): string {
    return this.config.validation_level;
  }

  /**
   * Gets the description
   */
  getDescription(): string {
    return this.config.description;
  }

  /**
   * Gets allowed commands count
   */
  getAllowedCommandsCount(): number {
    return Object.keys(this.config.allowed_commands).length;
  }

  /**
   * Common validation for basic input
   */
  protected validateBasicInput(command: string, args: string[]): CommandValidationResult | null {
    if (!command || typeof command !== 'string') {
      return { isValid: false, error: 'Command must be a non-empty string' };
    }

    if (!Array.isArray(args)) {
      return { isValid: false, error: 'Arguments must be an array' };
    }

    // Check argument count limits
    if (this.config.limits.max_arguments !== -1 && args.length > this.config.limits.max_arguments) {
      return { 
        isValid: false, 
        error: `Too many arguments (maximum ${this.config.limits.max_arguments} allowed)` 
      };
    }

    // Check command length limits
    const fullCommand = `${command} ${args.join(' ')}`;
    if (this.config.limits.max_command_length !== -1 && fullCommand.length > this.config.limits.max_command_length) {
      return { 
        isValid: false, 
        error: `Command too long (maximum ${this.config.limits.max_command_length} characters allowed)` 
      };
    }

    return null; // No validation errors
  }

  /**
   * Checks forbidden patterns
   */
  protected checkForbiddenPatterns(fullCommand: string): string | null {
    for (const patternStr of this.config.forbidden_patterns) {
      const pattern = new RegExp(patternStr);
      if (pattern.test(fullCommand)) {
        return `Command contains forbidden pattern: ${patternStr}`;
      }
    }
    return null;
  }
}
