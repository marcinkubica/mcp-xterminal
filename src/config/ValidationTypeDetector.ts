import { ValidationLevel } from './ValidationConfig.js';
import * as path from 'path';
import * as fs from 'fs';

export interface ValidationTypeResult {
  type: 'builtin' | 'custom';
  value: ValidationLevel | string;
}

export class ValidationTypeDetector {
  /**
   * Detects the validation type from environment variables
   * @returns The validation type result with type and value
   */
  static detectValidationType(): ValidationTypeResult {
    const envValue = process.env.COMMAND_VALIDATION;
    
    if (!envValue) {
      console.warn('🔒 COMMAND_VALIDATION not set, defaulting to aggressive security');
      return { type: 'builtin', value: 'aggressive' };
    }

    const validLevels: ValidationLevel[] = ['aggressive', 'medium', 'minimal', 'none'];
    const normalizedValue = envValue.toLowerCase() as ValidationLevel;

    // Check if it's a built-in validation level
    if (validLevels.includes(normalizedValue)) {
      console.log(`🔒 Using ${normalizedValue} validation level`);
      
      if (normalizedValue === 'none') {
        console.warn('🚨 WARNING: Using "none" validation level - ALL SECURITY PROTECTIONS DISABLED!');
      } else if (normalizedValue === 'minimal') {
        console.warn('⚠️  WARNING: Using "minimal" validation level - Most security protections disabled!');
      }
      
      return { type: 'builtin', value: normalizedValue };
    }

    // Check if it's a custom YAML file path
    if (this.isCustomConfigPath(envValue)) {
      console.log(`🔒 Using custom validation configuration: ${envValue}`);
      return { type: 'custom', value: envValue };
    }

    console.warn(`🔒 Invalid COMMAND_VALIDATION "${envValue}", defaulting to aggressive security`);
    return { type: 'builtin', value: 'aggressive' };
  }

  /**
   * Checks if the provided value is a custom configuration file path
   * @param value The value to check
   * @returns true if it's a valid custom config path
   */
  private static isCustomConfigPath(value: string): boolean {
    // Check if it ends with .yaml or .yml
    if (!(value.endsWith('.yaml') || value.endsWith('.yml'))) {
      return false;
    }

    // If it's a relative path, resolve it from current working directory
    let resolvedPath: string;
    if (path.isAbsolute(value)) {
      resolvedPath = value;
    } else {
      // Try to resolve relative to the original working directory or project root
      const moduleDir = path.dirname(new URL(import.meta.url).pathname);
      const projectRoot = path.join(moduleDir, '..', '..');
      resolvedPath = path.resolve(projectRoot, value);
      
      // If that doesn't exist, try current working directory
      if (!fs.existsSync(resolvedPath)) {
        resolvedPath = path.resolve(process.cwd(), value);
      }
    }
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      console.warn(`🔒 Custom configuration file not found: ${resolvedPath}`);
      return false;
    }

    return true;
  }

  /**
   * Gets the current validation type for logging/debugging
   */
  static getCurrentValidationType(): ValidationTypeResult {
    return this.detectValidationType();
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use detectValidationType() instead
   */
  static detectValidationLevel(): ValidationLevel {
    const result = this.detectValidationType();
    return result.type === 'builtin' ? result.value as ValidationLevel : 'aggressive';
  }
}
