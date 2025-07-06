import { BaseValidator, CommandValidationResult } from './BaseValidator.js';

export class NoneValidator extends BaseValidator {
  validateCommand(command: string, args: string[]): CommandValidationResult {
    // Minimal validation - just ensure command is a string
    if (!command || typeof command !== 'string') {
      return { isValid: false, error: 'Command must be a non-empty string' };
    }

    if (!Array.isArray(args)) {
      return { isValid: false, error: 'Arguments must be an array' };
    }

    // Normalize command
    const normalizedCommand = command.trim().toLowerCase();

    // Minimal sanitization - just ensure args are strings
    const sanitizedArgs: string[] = [];
    for (const arg of args) {
      if (typeof arg !== 'string') {
        return { isValid: false, error: 'All arguments must be strings' };
      }
      sanitizedArgs.push(arg);
    }

    return {
      isValid: true,
      sanitizedCommand: normalizedCommand,
      sanitizedArgs
    };
  }

  validateFilePath(path: string): boolean {
    // No file path restrictions in none mode
    return true;
  }

  buildEnvironment(additionalEnv?: Record<string, string>): Record<string, string> {
    const env: Record<string, string> = {};

    // Passthrough mode - include all environment variables
    Object.assign(env, process.env);

    // Add additional environment variables
    if (additionalEnv) {
      Object.assign(env, additionalEnv);
    }

    return env;
  }

  getTimeout(requestedTimeout?: number): number {
    // No timeout limits in none mode
    return requestedTimeout || 0; // 0 means no timeout
  }
}
