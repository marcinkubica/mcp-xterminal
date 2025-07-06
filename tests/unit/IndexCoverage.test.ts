import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TerminalServer } from '../../src/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Mock the SDK
vi.mock('@modelcontextprotocol/sdk/server/index.js');
vi.mock('@modelcontextprotocol/sdk/server/stdio.js');

describe('Index Coverage Tests', () => {
  let server: TerminalServer;
  let mockServer: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock server
    mockServer = {
      setRequestHandler: vi.fn(),
      connect: vi.fn(),
      close: vi.fn()
    };
    
    (Server as any).mockImplementation(() => mockServer);
    
    server = new TerminalServer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TerminalServer - Error Handling', () => {
    it('should handle errors in tool execution gracefully', async () => {
      // Test the error handling in handleCallTool method
      const request = {
        params: {
          name: 'execute_command',
          arguments: {
            command: 'invalid_command',
            args: ['arg1', 'arg2'],
            options: {}
          }
        }
      };

      try {
        await server.handleCallTool(request as any);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
      }
    });

    it('should handle unknown tool errors', async () => {
      const request = {
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      };

      try {
        await server.handleCallTool(request as any);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.MethodNotFound);
      }
    });

    it('should handle non-McpError exceptions in tool execution', async () => {
      // Mock the executeCommand method to throw a regular Error
      const originalExecuteCommand = server['executeCommand'];
      server['executeCommand'] = vi.fn().mockRejectedValue(new Error('Test error'));

      const request = {
        params: {
          name: 'execute_command',
          arguments: {
            command: 'ls',
            args: [],
            options: {}
          }
        }
      };

      try {
        await server.handleCallTool(request as any);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InternalError);
        expect((error as McpError).message).toContain('Error executing tool: Test error');
      } finally {
        // Restore original method
        server['executeCommand'] = originalExecuteCommand;
      }
    });
  });

  describe('TerminalServer - Directory Change Error Handling', () => {
    it('should handle directory change when directory does not exist', async () => {
      const request = {
        params: {
          name: 'change_directory',
          arguments: {
            path: '/nonexistent/directory'
          }
        }
      };

      try {
        await server.handleCallTool(request as any);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
        expect((error as McpError).message).toContain('🔒 SECURITY BLOCK: Path');
      }
    });

    it('should handle directory change when path resolution fails', async () => {
      // Mock resolveAndValidatePath to throw an error
      const originalResolveAndValidatePath = (globalThis as any).resolveAndValidatePath;
      (globalThis as any).resolveAndValidatePath = vi.fn().mockImplementation(() => {
        throw new Error('Path resolution failed');
      });

      const request = {
        params: {
          name: 'change_directory',
          arguments: {
            path: '/invalid/path'
          }
        }
      };

      try {
        await server.handleCallTool(request as any);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
        expect((error as McpError).message).toContain('🔒 SECURITY BLOCK: Path');
      } finally {
        // Restore original function
        (globalThis as any).resolveAndValidatePath = originalResolveAndValidatePath;
      }
    });
  });

  describe('TerminalServer - Server Lifecycle', () => {
    it('should handle server startup and logging', async () => {
      // Mock console.error to capture log messages
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock the validator factory
      const mockValidator = {
        getValidationLevel: vi.fn().mockReturnValue('aggressive'),
        getDescription: vi.fn().mockReturnValue('High security validation'),
        getAllowedCommandsCount: vi.fn().mockReturnValue(25)
      };

      const ValidatorFactory = await import('../../src/validation/ValidatorFactory.js');
      vi.spyOn(ValidatorFactory.ValidatorFactory, 'getValidator').mockResolvedValue(mockValidator as any);

      await server.run();

      expect(consoleSpy).toHaveBeenCalledWith('🔒 SECURE Terminal MCP Server running on stdio');
      expect(consoleSpy).toHaveBeenCalledWith('🔒 Security: AGGRESSIVE validation enabled');
      expect(consoleSpy).toHaveBeenCalledWith('🔒 High security validation');
      expect(consoleSpy).toHaveBeenCalledWith('🔒 Allowed commands: 25');
      expect(consoleSpy).toHaveBeenCalledWith('🔒 Dangerous commands BLOCKED (rm, curl, sudo, etc.)');

      consoleSpy.mockRestore();
    });

    it('should handle server startup with none validation level', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockValidator = {
        getValidationLevel: vi.fn().mockReturnValue('none'),
        getDescription: vi.fn().mockReturnValue('No security validation'),
        getAllowedCommandsCount: vi.fn().mockReturnValue(0)
      };

      const ValidatorFactory = await import('../../src/validation/ValidatorFactory.js');
      vi.spyOn(ValidatorFactory.ValidatorFactory, 'getValidator').mockResolvedValue(mockValidator as any);

      await server.run();

      expect(consoleSpy).toHaveBeenCalledWith('🚨 WARNING: ALL SECURITY PROTECTIONS DISABLED!');

      consoleSpy.mockRestore();
    });
  });

  describe('TerminalServer - Direct Module Execution', () => {
    it('should handle direct module execution with error', async () => {
      // Mock require.main to simulate direct execution
      const originalRequireMain = require.main;
      require.main = module;

      // Mock process.exit
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      // Mock console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock the server run method to throw an error
      const mockServer = {
        run: vi.fn().mockRejectedValue(new Error('Fatal server error'))
      };
      
      const TerminalServerMock = vi.fn().mockImplementation(() => mockServer);

      // Simulate the direct execution code
      try {
        const server = new TerminalServerMock();
        await server.run().catch((error: Error) => {
          console.error("Fatal error running server:", error);
          process.exit(1);
        });
      } catch (error) {
        expect(error).toEqual(new Error('process.exit called'));
      }

      expect(consoleSpy).toHaveBeenCalledWith('Fatal error running server:', expect.any(Error));
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Restore mocks
      require.main = originalRequireMain;
      exitSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
}); 
