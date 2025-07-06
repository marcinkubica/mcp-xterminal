import { BaseValidator, CommandValidationResult } from './BaseValidator.js';

export class MinimalValidator extends BaseValidator {
  validateCommand(command: string, args: string[]): CommandValidationResult {
    // Basic input validation
    const basicValidation = this.validateBasicInput(command, args);
    if (basicValidation) {
      return basicValidation;
    }

    // Normalize command
    const normalizedCommand = command.trim().toLowerCase();

    // Check for forbidden patterns (only critical ones)
    const fullCommand = `${normalizedCommand} ${args.join(' ')}`;
    const forbiddenError = this.checkForbiddenPatterns(fullCommand);
    if (forbiddenError) {
      return { isValid: false, error: forbiddenError };
    }

    // Minimal validation - just basic sanitization
    const sanitizedArgs: string[] = [];
    for (const arg of args) {
      if (typeof arg !== 'string') {
        return { isValid: false, error: 'All arguments must be strings' };
      }

      const trimmedArg = arg.trim();
      if (trimmedArg) {
        sanitizedArgs.push(trimmedArg);
      }
    }

    return {
      isValid: true,
      sanitizedCommand: normalizedCommand,
      sanitizedArgs
    };
  }

  validateFilePath(path: string): boolean {
    // File path restrictions are disabled in minimal mode
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
}
