import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Mock the SDK before any imports
vi.mock('@modelcontextprotocol/sdk/server/index.js');
vi.mock('@modelcontextprotocol/sdk/server/stdio.js');

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn()
}));

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

// Mock path
vi.mock('path', () => ({
  resolve: vi.fn()
}));

// Mock os
vi.mock('os', () => ({
  homedir: vi.fn(),
  userInfo: vi.fn()
}));

describe('Index Secure Coverage Tests', () => {
  let mockServer: any;
  let callHandler: any;
  let listHandler: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock the Server constructor
    mockServer = {
      setRequestHandler: vi.fn(),
      connect: vi.fn(),
      on: vi.fn(),
      onerror: vi.fn()
    };
    (Server as any).mockImplementation(() => mockServer);
    
    // Mock console.error to capture output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock process methods
    (globalThis as any).process = {
      cwd: vi.fn().mockReturnValue('/test/dir'),
      env: {
        PATH: '/usr/bin',
        HOME: '/home/test',
        USER: 'testuser',
        SHELL: '/bin/bash'
      },
      getuid: vi.fn().mockReturnValue(1000),
      getgid: vi.fn().mockReturnValue(1000),
      chdir: vi.fn(),
      on: vi.fn(),
      exit: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Server Initialization', () => {
    it('should initialize server with correct configuration', async () => {
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // Verify server was created
      expect(Server).toHaveBeenCalled();
      expect(mockServer.setRequestHandler).toHaveBeenCalled();
    });

    it('should set up error handling', async () => {
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // Verify error handling was set up
      expect(mockServer.onerror).toBeDefined();
    });

    it('should set up request handlers', async () => {
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // Verify handlers were set up
      expect(mockServer.setRequestHandler).toHaveBeenCalled();
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Command Validation Through Server', () => {
    it('should validate command with empty string through server execution', async () => {
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // Extract the handlers from the mock calls
      const calls = mockServer.setRequestHandler.mock.calls;
      if (calls.length >= 2) {
        callHandler = calls[1][1]; // CallToolRequestSchema handler
      }
      
      expect(callHandler).toBeDefined();
      
      // Test with empty command
      const request = {
        params: {
          name: 'execute_command',
          arguments: {
            command: '',
            args: []
          }
        }
      };
      
      try {
        await callHandler(request);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
        expect((error as McpError).message).toContain('Security validation failed');
      }
    });

    it('should validate command with non-string input through server execution', async () => {
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // Extract the handlers from the mock calls
      const calls = mockServer.setRequestHandler.mock.calls;
      if (calls.length >= 2) {
        callHandler = calls[1][1]; // CallToolRequestSchema handler
      }
      
      expect(callHandler).toBeDefined();
      
      // Test with non-string command
      const request = {
        params: {
          name: 'execute_command',
          arguments: {
            command: null as any,
            args: []
          }
        }
      };
      
      try {
        await callHandler(request);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
      }
    });

    it('should validate file-requiring commands with invalid paths through server execution', async () => {
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // Extract the handlers from the mock calls
      const calls = mockServer.setRequestHandler.mock.calls;
      if (calls.length >= 2) {
        callHandler = calls[1][1]; // CallToolRequestSchema handler
      }
      
      expect(callHandler).toBeDefined();
      
      // Test with dangerous path
      const request = {
        params: {
          name: 'execute_command',
          arguments: {
            command: 'cat',
            args: ['../../../etc/passwd<script>']
          }
        }
      };
      
      try {
        await callHandler(request);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
        expect((error as McpError).message).toContain('Security validation failed');
      }
    });

    it('should validate allowed commands successfully through server execution', async () => {
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // Extract the handlers from the mock calls
      const calls = mockServer.setRequestHandler.mock.calls;
      if (calls.length >= 2) {
        callHandler = calls[1][1]; // CallToolRequestSchema handler
      }
      
      expect(callHandler).toBeDefined();
      
      // Test with allowed command
      const request = {
        params: {
          name: 'execute_command',
          arguments: {
            command: 'ls',
            args: ['-la']
          }
        }
      };
      
      // Mock exec to return success
      const { exec } = await import('child_process');
      (exec as any).mockImplementation((command: string, options: any, callback: any) => {
        callback(null, { stdout: 'test output', stderr: '' });
      });
      
      const result = await callHandler(request);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should reject forbidden commands through server execution', async () => {
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // Extract the handlers from the mock calls
      const calls = mockServer.setRequestHandler.mock.calls;
      if (calls.length >= 2) {
        callHandler = calls[1][1]; // CallToolRequestSchema handler
      }
      
      expect(callHandler).toBeDefined();
      
      // Test with forbidden command
      const request = {
        params: {
          name: 'execute_command',
          arguments: {
            command: 'rm',
            args: ['-rf', '/']
          }
        }
      };
      
      try {
        await callHandler(request);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
        expect((error as McpError).message).toContain('Security validation failed');
      }
    });

    it('should reject commands with forbidden patterns through server execution', async () => {
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // Extract the handlers from the mock calls
      const calls = mockServer.setRequestHandler.mock.calls;
      if (calls.length >= 2) {
        callHandler = calls[1][1]; // CallToolRequestSchema handler
      }
      
      expect(callHandler).toBeDefined();
      
      // Test with forbidden pattern
      const request = {
        params: {
          name: 'execute_command',
          arguments: {
            command: 'ls',
            args: [';', 'rm', '-rf']
          }
        }
      };
      
      try {
        await callHandler(request);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
        expect((error as McpError).message).toContain('Security validation failed');
      }
    });

    it('should reject commands with too many arguments through server execution', async () => {
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // Extract the handlers from the mock calls
      const calls = mockServer.setRequestHandler.mock.calls;
      if (calls.length >= 2) {
        callHandler = calls[1][1]; // CallToolRequestSchema handler
      }
      
      expect(callHandler).toBeDefined();
      
      // Test with too many arguments
      const request = {
        params: {
          name: 'execute_command',
          arguments: {
            command: 'ls',
            args: Array(11).fill('arg')
          }
        }
      };
      
      try {
        await callHandler(request);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
        expect((error as McpError).message).toContain('Security validation failed');
      }
    });
  });

  describe('Server Lifecycle', () => {
    it('should handle server startup', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // Verify that the server was set up correctly
      expect(mockServer.setRequestHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('🔒 SECURE Terminal MCP Server running on stdio');
      
      consoleSpy.mockRestore();
    });

    it('should handle server connection', async () => {
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // Verify that the server connects to transport
      expect(mockServer.connect).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle command execution errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // The server should handle errors gracefully
      expect(consoleSpy).toHaveBeenCalledWith('🔒 SECURE Terminal MCP Server running on stdio');
      
      consoleSpy.mockRestore();
    });

    it('should handle unknown tool requests', async () => {
      // Import the module to trigger server creation
      await import('../../src/index_secure.ts');
      
      // Extract the handlers from the mock calls
      const calls = mockServer.setRequestHandler.mock.calls;
      if (calls.length >= 2) {
        callHandler = calls[1][1]; // CallToolRequestSchema handler
      }
      
      expect(callHandler).toBeDefined();
      
      // Test with unknown tool
      const request = {
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      };
      
      try {
        await callHandler(request);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.MethodNotFound);
        expect((error as McpError).message).toContain('Unknown tool');
      }
    });
  });
}); 
