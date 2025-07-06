import { ValidationLevel } from '../config/ValidationConfig.js';
import { ConfigLoader } from '../config/ConfigLoader.js';
import { ValidationTypeDetector } from '../config/ValidationTypeDetector.js';
import { BaseValidator } from './BaseValidator.js';
import { AggressiveValidator } from './AggressiveValidator.js';
import { MediumValidator } from './MediumValidator.js';
import { MinimalValidator } from './MinimalValidator.js';
import { NoneValidator } from './NoneValidator.js';

export class ValidatorFactory {
  private static instance: BaseValidator | null = null;
  private static currentLevel: ValidationLevel | null = null;

  /**
   * Gets the current validator instance, creating it if necessary
   */
  static async getValidator(): Promise<BaseValidator> {
    const detectedLevel = ValidationTypeDetector.detectValidationType();
    
    // If we already have a validator for this level, return it
    if (this.instance && this.currentLevel === detectedLevel) {
      return this.instance;
    }

    // Create new validator
    this.instance = await this.createValidator(detectedLevel);
    this.currentLevel = detectedLevel;
    
    return this.instance;
  }

  /**
   * Creates a validator for the specified level
   */
  private static async createValidator(level: ValidationLevel): Promise<BaseValidator> {
    try {
      const config = await ConfigLoader.loadConfig(level);
      
      switch (level) {
        case 'aggressive':
          return new AggressiveValidator(config);
        case 'medium':
          return new MediumValidator(config);
        case 'minimal':
          return new MinimalValidator(config);
        case 'none':
          return new NoneValidator(config);
        default:
          console.warn(`Unknown validation level: ${level}, defaulting to aggressive`);
          const fallbackConfig = await ConfigLoader.loadConfig('aggressive');
          return new AggressiveValidator(fallbackConfig);
      }
    } catch (error) {
      console.error('Error creating validator:', error);
      console.warn('Using aggressive validator as fallback');
      const fallbackConfig = await ConfigLoader.loadConfig('aggressive');
      return new AggressiveValidator(fallbackConfig);
    }
  }

  /**
   * Forces recreation of the validator (useful for testing or config changes)
   */
  static async recreateValidator(): Promise<BaseValidator> {
    this.instance = null;
    this.currentLevel = null;
    return await this.getValidator();
  }

  /**
   * Gets the current validation level
   */
  static getCurrentLevel(): ValidationLevel | null {
    return this.currentLevel;
  }
}
