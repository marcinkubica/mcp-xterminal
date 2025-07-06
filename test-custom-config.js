#!/usr/bin/env node

/**
 * Simple test script for custom configuration validation
 * This doesn't start the full MCP server, just tests the configuration loading
 */

import { ValidationTypeDetector } from './dist/config/ValidationTypeDetector.js';
import { ConfigLoader } from './dist/config/ConfigLoader.js';
import path from 'path';

async function testCustomConfig() {
  try {
    console.log('=== Testing Custom Configuration Loading ===');
    
    // Test 1: Built-in validation type
    console.log('\n1. Testing built-in validation type:');
    process.env.COMMAND_VALIDATION = 'medium';
    const builtinResult = ValidationTypeDetector.detectValidationType();
    console.log('Result:', builtinResult);
    
    // Test 2: Custom file path (relative)
    console.log('\n2. Testing custom file path (relative):');
    process.env.COMMAND_VALIDATION = 'config/validation/custom-example.yaml';
    const customResult = ValidationTypeDetector.detectValidationType();
    console.log('Result:', customResult);
    
    // Test 3: Load custom configuration
    if (customResult.type === 'custom') {
      console.log('\n3. Loading custom configuration:');
      const config = await ConfigLoader.loadConfigFromResult(customResult);
      console.log('Config loaded successfully:');
      console.log('- Validation Level:', config.validation_level);
      console.log('- Description:', config.description);
      console.log('- Allowed Commands:', Object.keys(config.whitelistedCommands || {}).length);
      console.log('- Max Timeout:', config.maxTimeout);
      console.log('- Environment Policy:', config.environment?.mode || 'default');
    }
    
    // Test 4: Test with absolute path
    console.log('\n4. Testing custom file path (absolute):');
    const absolutePath = path.resolve('config/validation/custom-example.yaml');
    process.env.COMMAND_VALIDATION = absolutePath;
    const absoluteResult = ValidationTypeDetector.detectValidationType();
    console.log('Result:', absoluteResult);
    
    // Test 5: Test with non-existent file
    console.log('\n5. Testing non-existent file:');
    process.env.COMMAND_VALIDATION = 'nonexistent.yaml';
    const nonExistentResult = ValidationTypeDetector.detectValidationType();
    console.log('Result:', nonExistentResult);
    
    console.log('\n=== All tests completed ===');
    
  } catch (error) {
    console.error('Error during testing:', error);
    process.exit(1);
  }
}

testCustomConfig();
