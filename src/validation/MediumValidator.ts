import { BaseValidator, CommandValidationResult } from './BaseValidator.js';

export class MediumValidator extends BaseValidator {
  validateCommand(command: string, args: string[]): CommandValidationResult {
    // Basic input validation
    const basicValidation = this.validateBasicInput(command, args);
    if (basicValidation) {
      return basicValidation;
    }

    // Normalize command
    const normalizedCommand = command.trim().toLowerCase();

    // Check if command is in whitelist (if whitelist is configured)
    if (Object.keys(this.config.allowed_commands).length > 0) {
      if (!(normalizedCommand in this.config.allowed_commands)) {
        return {
          isValid: false,
          error: `Command '${normalizedCommand}' is not in the allowed whitelist. Allowed commands: ${Object.keys(this.config.allowed_commands).join(', ')}`
        };
      }
    }

    // Check for forbidden patterns
    const fullCommand = `${normalizedCommand} ${args.join(' ')}`;
    const forbiddenError = this.checkForbiddenPatterns(fullCommand);
    if (forbiddenError) {
      return { isValid: false, error: forbiddenError };
    }

    // Validate arguments more flexibly than aggressive mode
    const sanitizedArgs: string[] = [];
    const commandConfig = this.config.allowed_commands[normalizedCommand];

    for (const arg of args) {
      if (typeof arg !== 'string') {
        return { isValid: false, error: 'All arguments must be strings' };
      }

      const trimmedArg = arg.trim();
      if (!trimmedArg) continue; // Skip empty args

      // If we have a command config, check arguments
      if (commandConfig) {
        let isAllowed = false;
        if (commandConfig.allowed_args.length > 0) {
          // More flexible argument matching
          isAllowed = commandConfig.allowed_args.some(allowedArg => 
            trimmedArg === allowedArg || 
            (allowedArg.startsWith('-') && trimmedArg.startsWith(allowedArg))
          );
        }

        // Allow file paths for commands that require a file
        if (commandConfig.requires_file && !trimmedArg.startsWith('-')) {
          if (this.validateFilePath(trimmedArg)) {
            isAllowed = true;
          } else {
            return { isValid: false, error: `File path argument '${trimmedArg}' is not allowed` };
          }
        }

        // For medium validation, also allow common safe patterns
        if (!isAllowed && /^[a-zA-Z0-9._/-]+$/.test(trimmedArg)) {
          isAllowed = true;
        }

        if (!isAllowed) {
          return { isValid: false, error: `Argument '${trimmedArg}' not allowed for command '${normalizedCommand}'` };
        }
      }

      sanitizedArgs.push(trimmedArg);
    }

    return {
      isValid: true,
      sanitizedCommand: normalizedCommand,
      sanitizedArgs
    };
  }

  validateFilePath(path: string): boolean {
    if (!this.config.file_path_restrictions.enabled) {
      return true;
    }

    if (this.config.file_path_restrictions.pattern) {
      const pattern = new RegExp(this.config.file_path_restrictions.pattern);
      if (!pattern.test(path)) {
        return false;
      }
    }

    if (this.config.file_path_restrictions.max_path_length) {
      if (path.length > this.config.file_path_restrictions.max_path_length) {
        return false;
      }
    }

    return true;
  }

  buildEnvironment(additionalEnv?: Record<string, string>): Record<string, string> {
    const env: Record<string, string> = {};

    if (this.config.environment_policy.mode === 'whitelist') {
      // Only include whitelisted variables
      for (const varName of this.config.environment_policy.allowed_vars || []) {
        const value = process.env[varName];
        if (value !== undefined) {
          env[varName] = value;
        }
      }
    } else if (this.config.environment_policy.mode === 'blacklist') {
      // Include all except blacklisted variables
      const blockedVars = new Set(this.config.environment_policy.blocked_vars || []);
      for (const [key, value] of Object.entries(process.env)) {
        if (!blockedVars.has(key) && value !== undefined) {
          env[key] = value;
        }
      }
    } else {
      // Passthrough mode - include all environment variables
      Object.assign(env, process.env);
    }

    // Add additional environment variables
    if (additionalEnv) {
      Object.assign(env, additionalEnv);
    }

    return env;
  }
}
