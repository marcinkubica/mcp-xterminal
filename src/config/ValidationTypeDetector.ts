import { ValidationLevel } from './ValidationConfig.js';

export class ValidationTypeDetector {
  /**
   * Detects the validation type from environment variables
   * @returns The validation level, defaulting to 'aggressive' if not set or invalid
   */
  static detectValidationType(): ValidationLevel {
    const envValue = process.env.COMMAND_VALIDATION;
    
    if (!envValue) {
      console.warn('🔒 COMMAND_VALIDATION not set, defaulting to aggressive security');
      return 'aggressive';
    }

    const validLevels: ValidationLevel[] = ['aggressive', 'medium', 'minimal', 'none'];
    const normalizedValue = envValue.toLowerCase() as ValidationLevel;

    if (validLevels.includes(normalizedValue)) {
      console.log(`🔒 Using ${normalizedValue} validation level`);
      
      if (normalizedValue === 'none') {
        console.warn('🚨 WARNING: Using "none" validation level - ALL SECURITY PROTECTIONS DISABLED!');
      } else if (normalizedValue === 'minimal') {
        console.warn('⚠️  WARNING: Using "minimal" validation level - Most security protections disabled!');
      }
      
      return normalizedValue;
    }

    console.warn(`🔒 Invalid COMMAND_VALIDATION "${envValue}", defaulting to aggressive security`);
    return 'aggressive';
  }

  /**
   * Gets the current validation type for logging/debugging
   */
  static getCurrentValidationType(): ValidationLevel {
    return this.detectValidationType();
  }
}
