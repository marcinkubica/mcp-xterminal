#!/usr/bin/env node

/**
 * Demo script showing BOUNDARY_ESCAPE functionality
 * 
 * This script demonstrates how the BOUNDARY_ESCAPE environment variable 
 * can be used to disable boundary directory enforcement in the Terminal MCP server.
 */

import { TerminalServer } from '../../dist/index.js';
const originalCwd = process.cwd();

console.log('=== BOUNDARY_ESCAPE Demo ===\n');

console.log('1. Testing default behavior (boundary enforcement enabled):');
console.log(`   Original directory: ${originalCwd}`);
delete process.env.BOUNDARY_ESCAPE;
delete process.env.BOUNDARY_DIR;

try {
  const server1 = new TerminalServer();
  console.log(`   After server creation: ${process.cwd()}`);
  console.log('   ✅ Server enforced boundary directory (/tmp)\n');
} catch (error) {
  console.error('   ❌ Error:', error.message);
}

console.log('2. Testing BOUNDARY_ESCAPE=true (boundary enforcement disabled):');
// Reset to original directory
process.chdir(originalCwd);
console.log(`   Reset to original directory: ${process.cwd()}`);

process.env.BOUNDARY_ESCAPE = 'true';
try {
  const server2 = new TerminalServer();
  console.log(`   After server creation: ${process.cwd()}`);
  console.log('   ✅ Server did NOT enforce boundary directory');
  console.log('   🔓 BOUNDARY_ESCAPE enabled: Directory enforcement disabled\n');
} catch (error) {
  console.error('   ❌ Error:', error.message);
}

console.log('3. Testing custom BOUNDARY_DIR with escape disabled:');
delete process.env.BOUNDARY_ESCAPE;
process.env.BOUNDARY_DIR = '/tmp';
process.chdir(originalCwd);
console.log(`   Reset to original directory: ${process.cwd()}`);

try {
  const server3 = new TerminalServer();
  console.log(`   After server creation: ${process.cwd()}`);
  console.log('   ✅ Server enforced custom boundary directory\n');
} catch (error) {
  console.error('   ❌ Error:', error.message);
}

console.log('Demo complete! 🎉');
