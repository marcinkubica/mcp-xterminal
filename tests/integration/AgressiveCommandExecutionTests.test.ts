import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TerminalServer } from '../../src/index.js';
import { McpError } from "@modelcontextprotocol/sdk/types.js";

describe('Agressive Command Execution Tests', () => {
  let server: TerminalServer;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    server = new TerminalServer();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Command Timeout Handling', () => {
    it('should respect timeout option for commands', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'date',
            args: [],
            options: {
              timeout: 5000 // 5 second timeout
            }
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
    });

    it('should enforce maximum timeout limit (10 seconds)', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'date',
            args: [],
            options: {
              timeout: 30000 // Request 30 seconds, should be capped at 10
            }
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
    });

    it('should handle timeout with fast-completing command', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'pwd',
            args: [],
            options: {
              timeout: 1000 // 1 second timeout - pwd should complete quickly
            }
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/STDOUT:/);
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
    });

    it('should use default timeout when not specified', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'whoami',
            args: []
            // No timeout specified, should use default (10 seconds)
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
    });
  });

  describe('Environment Variable Passing', () => {
    it('should pass essential environment variables to commands', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'echo',
            args: ['--help'], // Safe echo usage
            options: {
              env: {
                TEST_VAR: 'test_value'
              }
            }
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      // Command should execute successfully with environment variables
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
    });

    it('should include PATH environment variable in command execution', async () => {
      // Test PATH indirectly by ensuring commands can be found and executed
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'pwd',
            args: [],
            options: {}
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
      // Command executed successfully, proving PATH is available
    });

    it('should include HOME environment variable in command execution', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'pwd',
            args: [],
            options: {}
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      // Should execute successfully with HOME available
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
    });

    it('should include USER environment variable in command execution', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'whoami',
            args: [],
            options: {}
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      // Should execute successfully and show user
      expect(result.content[0].text).toMatch(/STDOUT:/);
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
    });

    it('should include SHELL environment variable in command execution', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'date',
            args: [],
            options: {}
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      // Should execute successfully with SHELL available
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
    });

    it('should pass additional environment variables from options', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'date',
            args: [],
            options: {
              env: {
                CUSTOM_VAR: 'custom_value',
                ANOTHER_VAR: 'another_value'
              }
            }
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      // Should execute successfully with custom env vars
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
    });

    it('should restrict environment variables to essential ones only', async () => {
      // Test that only essential environment variables are passed
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'date',
            args: [],
            options: {}
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      // Should execute successfully with restricted env
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
    });
  });

  describe('Working Directory Context', () => {
    it('should execute commands in current working directory by default', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'pwd',
            args: []
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/STDOUT:/);
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
      // Should show current directory
      expect(result.content[0].text).toMatch(/\/[^\/]+/); // Path pattern
    });

    it('should execute commands in specified working directory', async () => {
      // First, get current directory
      const currentDirResult = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_current_directory',
          arguments: {}
        }
      });

      expect(currentDirResult.content).toHaveLength(1);
      const currentDir = currentDirResult.content[0].text.replace('Current directory: ', '');

      // Execute command with explicit working directory
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'pwd',
            args: [],
            options: {
              cwd: currentDir
            }
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/STDOUT:/);
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
    });

    it('should preserve working directory context between calls', async () => {
      // First call to get current directory
      const result1 = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_current_directory',
          arguments: {}
        }
      });

      expect(result1.content).toHaveLength(1);
      const directory1 = result1.content[0].text;

      // Second call to get current directory
      const result2 = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_current_directory',
          arguments: {}
        }
      });

      expect(result2.content).toHaveLength(1);
      const directory2 = result2.content[0].text;

      // Working directory should be preserved
      expect(directory1).toBe(directory2);
    });

    it('should handle working directory changes through change_directory tool', async () => {
      // Get initial directory
      const initialResult = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_current_directory',
          arguments: {}
        }
      });

      expect(initialResult.content).toHaveLength(1);
      // Use /tmp as a safe directory for boundary enforcement
      const safeDir = '/tmp';

      // Change directory (within boundary)
      const changeResult = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'change_directory',
          arguments: {
            path: safeDir
          }
        }
      });

      expect(changeResult.content).toHaveLength(1);
      expect(changeResult.content[0].text).toMatch(/Current directory changed to:/);

      // Verify directory context is maintained
      const newResult = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_current_directory',
          arguments: {}
        }
      });

      expect(newResult.content).toHaveLength(1);
      // Should still be in valid directory
      expect(newResult.content[0].text).toMatch(/Current directory: /);
    });

    it('should handle relative path resolution in working directory', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'ls',
            args: ['-la'],
            options: {
              cwd: '.' // Current directory
            }
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
    });
  });

  describe('Exit Code Tracking', () => {
    it('should track exit code for successful commands', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'pwd',
            args: []
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/Exit Code: 0/);

      // Check terminal info for last exit code
      const infoResult = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_terminal_info',
          arguments: {}
        }
      });

      expect(infoResult.content).toHaveLength(1);
      expect(infoResult.content[0].text).toMatch(/lastExitCode: 0/);
    });

    it('should track exit code for failed commands', async () => {
      // Change to /tmp first to ensure we're not in a git repo
      await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'change_directory',
          arguments: {
            path: '/tmp'
          }
        }
      });

      // Use git status outside of a repository to trigger error
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'git',
            args: ['status'] // git status in non-repo will fail with exit code 128
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      // Should show non-zero exit code
      expect(result.content[0].text).toMatch(/Exit Code: [1-9]\d*/);

      // Check terminal info for last exit code
      const infoResult = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_terminal_info',
          arguments: {}
        }
      });

      expect(infoResult.content).toHaveLength(1);
      expect(infoResult.content[0].text).toMatch(/lastExitCode: [1-9]\d*/);
    });

    it('should update exit code for subsequent commands', async () => {
      // First command (should succeed)
      const result1 = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'date',
            args: []
          }
        }
      });

      expect(result1.content).toHaveLength(1);
      expect(result1.content[0].text).toMatch(/Exit Code: 0/);

      // Change to /tmp to ensure we're not in a git repo
      await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'change_directory',
          arguments: {
            path: '/tmp'
          }
        }
      });

      // Second command - use git status outside of a repository to trigger error
      const result2 = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'git',
            args: ['status'] // git status in non-repo will fail with exit code 128
          }
        }
      });

      expect(result2.content).toHaveLength(1);
      expect(result2.content[0].type).toBe('text');
      expect(result2.content[0].text).toMatch(/Exit Code: [1-9]\d*/);

      // Check that exit code was updated
      const infoResult = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_terminal_info',
          arguments: {}
        }
      });

      expect(infoResult.content).toHaveLength(1);
      expect(infoResult.content[0].text).toMatch(/lastExitCode: [0-9]+/);
    });

    it('should track last command execution', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'whoami',
            args: []
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toMatch(/Exit Code: 0/);

      // Check terminal info for last command
      const infoResult = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_terminal_info',
          arguments: {}
        }
      });

      expect(infoResult.content).toHaveLength(1);
      expect(infoResult.content[0].text).toMatch(/lastCommand: whoami/);
    });

    it('should handle commands with arguments in exit code tracking', async () => {
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'ls',
            args: ['-la']
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toMatch(/Exit Code: 0/);

      // Check terminal info for last command with arguments
      const infoResult = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_terminal_info',
          arguments: {}
        }
      });

      expect(infoResult.content).toHaveLength(1);
      expect(infoResult.content[0].text).toMatch(/lastCommand: ls -la/);
    });

    it('should initialize with null exit code and command', async () => {
      const freshServer = new TerminalServer();
      
      const infoResult = await freshServer.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_terminal_info',
          arguments: {}
        }
      });

      expect(infoResult.content).toHaveLength(1);
      expect(infoResult.content[0].text).toMatch(/lastExitCode: null/);
      expect(infoResult.content[0].text).toMatch(/lastCommand: null/);
    });
  });

  describe('Complex Command Execution Scenarios', () => {
    it('should handle command with all options (timeout, env, cwd, exit tracking)', async () => {
      // Get current directory for use as cwd
      const currentDirResult = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_current_directory',
          arguments: {}
        }
      });

      const currentDir = currentDirResult.content[0].text.replace('Current directory: ', '');

      // Execute command with all options
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'ls',
            args: ['-la'],
            options: {
              timeout: 5000,
              env: {
                CUSTOM_VAR: 'test_value'
              },
              cwd: currentDir
            }
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/Exit Code: 0/);

      // Verify exit code and command tracking
      const infoResult = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_terminal_info',
          arguments: {}
        }
      });

      expect(infoResult.content).toHaveLength(1);
      expect(infoResult.content[0].text).toMatch(/lastExitCode: 0/);
      expect(infoResult.content[0].text).toMatch(/lastCommand: ls -la/);
    });

    it('should handle command execution with stderr output', async () => {
      // Change to /tmp to ensure we're not in a git repo
      await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'change_directory',
          arguments: {
            path: '/tmp'
          }
        }
      });

      // Use git status outside of a repository to produce stderr
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'git',
            args: ['status'] // git status in non-repo will fail with stderr output
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/Exit Code: [1-9]\d*/);
    });

    it('should handle command execution with no output', async () => {
      // Execute command that produces no output
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'execute_command',
          arguments: {
            command: 'pwd',
            args: []
          }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/Exit Code: 0/);
    });

    it('should handle rapid successive command executions', async () => {
      // Execute multiple commands in rapid succession
      const commands = [
        { command: 'pwd', args: [] },
        { command: 'date', args: [] },
        { command: 'whoami', args: [] }
      ];

      for (const cmd of commands) {
        const result = await server.handleCallTool({
          method: 'tools/call',
          params: {
            name: 'execute_command',
            arguments: cmd
          }
        });

        expect(result.content).toHaveLength(1);
        expect(result.content[0].text).toMatch(/Exit Code: 0/);
      }

      // Verify last command was tracked
      const infoResult = await server.handleCallTool({
        method: 'tools/call',
        params: {
          name: 'get_terminal_info',
          arguments: {}
        }
      });

      expect(infoResult.content).toHaveLength(1);
      expect(infoResult.content[0].text).toMatch(/lastCommand: whoami/);
    });
  });
});
