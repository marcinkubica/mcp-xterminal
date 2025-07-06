#!/usr/bin/env node

/**
 * Integration test for custom validation without starting full MCP server
 */

import { ValidatorFactory } from './dist/validation/ValidatorFactory.js';
import { ValidationTypeDetector } from './dist/config/ValidationTypeDetector.js';

async function testCustomValidation() {
  try {
    console.log('=== Testing Custom Validation Integration ===');
    
    // Set custom configuration
    process.env.COMMAND_VALIDATION = 'config/validation/custom-example.yaml';
    
    // Detect validation type
    const validationResult = ValidationTypeDetector.detectValidationType();
    console.log('Validation result:', validationResult);
    
    // Create validator
    const validator = await ValidatorFactory.getValidator();
    console.log('Validator created successfully');
    
    // Test 1: Test allowed command
    console.log('\n1. Testing allowed command (ls):');
    const result1 = await validator.validateCommand('ls', ['-la']);
    console.log('Result:', result1.isValid ? 'ALLOWED' : `BLOCKED: ${result1.error}`);
    
    // Test 2: Test custom allowed command (grep)
    console.log('\n2. Testing custom allowed command (grep):');
    const result2 = await validator.validateCommand('grep', ['pattern', 'file.txt']);
    console.log('Result:', result2.isValid ? 'ALLOWED' : `BLOCKED: ${result2.error}`);
    
    // Test 3: Test blocked command (curl)
    console.log('\n3. Testing blocked command (curl):');
    const result3 = await validator.validateCommand('curl', ['http://example.com']);
    console.log('Result:', result3.isValid ? 'ALLOWED' : `BLOCKED: ${result3.error}`);
    
    // Test 4: Test command not in custom config (should be blocked)
    console.log('\n4. Testing command not in custom config (rm):');
    const result4 = await validator.validateCommand('rm', ['file.txt']);
    console.log('Result:', result4.isValid ? 'ALLOWED' : `BLOCKED: ${result4.error}`);
    
    // Test 5: Test forbidden pattern
    console.log('\n5. Testing forbidden pattern (rm with space):');
    const result5 = await validator.validateCommand('rm', ['-rf', '/tmp/test']);
    console.log('Result:', result5.isValid ? 'ALLOWED' : `BLOCKED: ${result5.error}`);
    
    console.log('\n=== Custom validation test completed ===');
    
  } catch (error) {
    console.error('Error during testing:', error);
    process.exit(1);
  }
}

testCustomValidation();
