import { ValidationLevel } from '../config/ValidationConfig.js';
import { ConfigLoader } from '../config/ConfigLoader.js';
import { ValidationTypeDetector, ValidationTypeResult } from '../config/ValidationTypeDetector.js';
import { BaseValidator } from './BaseValidator.js';
import { AggressiveValidator } from './AggressiveValidator.js';
import { MediumValidator } from './MediumValidator.js';
import { MinimalValidator } from './MinimalValidator.js';
import { NoneValidator } from './NoneValidator.js';

export class ValidatorFactory {
  private static instance: BaseValidator | null = null;
  private static currentTypeResult: ValidationTypeResult | null = null;

  /**
   * Gets the current validator instance, creating it if necessary
   */
  static async getValidator(): Promise<BaseValidator> {
    const detectedTypeResult = ValidationTypeDetector.detectValidationType();
    
    // If we already have a validator for this type, return it
    if (this.instance && this.currentTypeResult && 
        this.currentTypeResult.type === detectedTypeResult.type &&
        this.currentTypeResult.value === detectedTypeResult.value) {
      return this.instance;
    }

    // Create new validator
    this.instance = await this.createValidator(detectedTypeResult);
    this.currentTypeResult = detectedTypeResult;
    
    return this.instance;
  }

  /**
   * Creates a validator for the specified type result
   */
  private static async createValidator(typeResult: ValidationTypeResult): Promise<BaseValidator> {
    try {
      const config = await ConfigLoader.loadConfigFromResult(typeResult);
      
      // For custom configs, determine validator type based on config content
      if (typeResult.type === 'custom') {
        return this.createCustomValidator(config);
      }
      
      // For built-in configs, use the validation level
      const level = typeResult.value as ValidationLevel;
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
   * Creates a validator for custom configuration based on its validation level
   */
  private static createCustomValidator(config: any): BaseValidator {
    const level = config.validation_level;
    
    switch (level) {
      case 'aggressive':
        return new AggressiveValidator(config);
      case 'medium':
        return new MediumValidator(config);
      case 'minimal':
        return new MinimalValidator(config);
      case 'none':
        return new NoneValidator(config);
      case 'custom':
        // For custom validation level, choose validator based on security characteristics
        const commandCount = Object.keys(config.allowed_commands || {}).length;
        const hasForbiddenPatterns = config.forbidden_patterns && config.forbidden_patterns.length > 0;
        
        if (commandCount <= 10 && hasForbiddenPatterns) {
          console.log('🔒 Using aggressive validator for custom config (high security)');
          return new AggressiveValidator(config);
        } else if (commandCount <= 20) {
          console.log('🔒 Using medium validator for custom config (balanced security)');
          return new MediumValidator(config);
        } else {
          console.log('🔒 Using minimal validator for custom config (low security)');
          return new MinimalValidator(config);
        }
      default:
        console.warn(`Unknown validation level in custom config: ${level}, using aggressive validator`);
        return new AggressiveValidator(config);
    }
  }

  /**
   * Forces recreation of the validator (useful for testing or config changes)
   */
  static async recreateValidator(): Promise<BaseValidator> {
    this.instance = null;
    this.currentTypeResult = null;
    return await this.getValidator();
  }

  /**
   * Gets the current validation type result
   */
  static getCurrentTypeResult(): ValidationTypeResult | null {
    return this.currentTypeResult;
  }

  /**
   * Gets the current validation level (for backward compatibility)
   */
  static getCurrentLevel(): ValidationLevel | null {
    if (!this.currentTypeResult) return null;
    
    if (this.currentTypeResult.type === 'builtin') {
      return this.currentTypeResult.value as ValidationLevel;
    } else {
      // For custom configs, we'd need to check the loaded config
      // For now, return null to indicate it's custom
      return null;
    }
  }
}
