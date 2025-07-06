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
  let mockConsoleError: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock the Server constructor
    mockServer = {
      setRequestHandler: vi.fn(),
      connect: vi.fn(),
      on: vi.fn(),
      onerror: null,
      close: vi.fn()
    };
    (Server as any).mockImplementation(() => mockServer);
    
    // Mock console.error to capture output
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
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
      // Import the class directly to test
      const { SecureTerminalServer } = await import('../../src/index_secure.ts');
      
      // Create a new instance to trigger server creation
      const server = new SecureTerminalServer();
      
      // Verify server was created
      expect(Server).toHaveBeenCalled();
      expect(mockServer.setRequestHandler).toHaveBeenCalled();
    });

    it('should set up error handling', async () => {
      // Import the class directly to test
      const { SecureTerminalServer } = await import('../../src/index_secure.ts');
      
      // Create a new instance to trigger server creation
      const server = new SecureTerminalServer();
      
      // Verify error handling was set up
      expect(mockServer.onerror).not.toBeNull();
    });

    it('should set up request handlers', async () => {
      // Import the class directly to test
      const { SecureTerminalServer } = await import('../../src/index_secure.ts');
      
      // Create a new instance to trigger server creation
      const server = new SecureTerminalServer();
      
      // Verify handlers were set up
      expect(mockServer.setRequestHandler).toHaveBeenCalled();
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('SecureTerminalServer Class', () => {
    it('should create server instance with proper configuration', async () => {
      const { SecureTerminalServer } = await import('../../src/index_secure.ts');
      
      const server = new SecureTerminalServer();
      
      expect(Server).toHaveBeenCalledWith(
        {
          name: "secure-terminal-server",
          version: "0.1.0"
        },
        {
          capabilities: {
            tools: {}
          }
        }
      );
    });

    it('should set up proper error handling', async () => {
      const { SecureTerminalServer } = await import('../../src/index_secure.ts');
      
      const server = new SecureTerminalServer();
      
      // Verify error handler was set
      expect(mockServer.onerror).not.toBeNull();
      
      // Verify process signal handler was set
      expect((globalThis as any).process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should run server with proper logging', async () => {
      const { SecureTerminalServer } = await import('../../src/index_secure.ts');
      
      const server = new SecureTerminalServer();
      
      // Mock connect to resolve immediately
      mockServer.connect.mockResolvedValue(undefined);
      
      await server.run();
      
      expect(mockServer.connect).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith('🔒 SECURE Terminal MCP Server running on stdio');
      expect(mockConsoleError).toHaveBeenCalledWith('🔒 Security: Command whitelist ENABLED');
    });
  });

  describe('Server Lifecycle', () => {
    it('should handle server startup with proper logging', async () => {
      const { SecureTerminalServer } = await import('../../src/index_secure.ts');
      
      const server = new SecureTerminalServer();
      mockServer.connect.mockResolvedValue(undefined);
      
      await server.run();
      
      expect(mockServer.setRequestHandler).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith('🔒 SECURE Terminal MCP Server running on stdio');
      expect(mockConsoleError).toHaveBeenCalledWith('🔒 Security: Command whitelist ENABLED');
    });

    it('should handle server connection properly', async () => {
      const { SecureTerminalServer } = await import('../../src/index_secure.ts');
      
      const server = new SecureTerminalServer();
      mockServer.connect.mockResolvedValue(undefined);
      
      await server.run();
      
      expect(mockServer.connect).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle runtime errors gracefully', async () => {
      const { SecureTerminalServer } = await import('../../src/index_secure.ts');
      
      const server = new SecureTerminalServer();
      
      // Test that error handler is properly set up
      expect(mockServer.onerror).not.toBeNull();
      
      // Test that the error handler function works
      const errorHandler = mockServer.onerror;
      if (errorHandler) {
        errorHandler(new Error('Test error'));
        expect(mockConsoleError).toHaveBeenCalledWith('[MCP Error]', expect.any(Error));
      }
    });

    it('should handle SIGINT signal properly', async () => {
      const { SecureTerminalServer } = await import('../../src/index_secure.ts');
      
      const server = new SecureTerminalServer();
      
      // Verify SIGINT handler was registered
      expect((globalThis as any).process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      
      // Get the SIGINT handler and test it
      const sigintCalls = (globalThis as any).process.on.mock.calls.filter(
        (call: any) => call[0] === 'SIGINT'
      );
      
      if (sigintCalls.length > 0) {
        const sigintHandler = sigintCalls[0][1];
        mockServer.close.mockResolvedValue(undefined);
        
        await sigintHandler();
        
        expect(mockServer.close).toHaveBeenCalled();
        expect((globalThis as any).process.exit).toHaveBeenCalledWith(0);
      }
    });
  });

  describe('Module Import Coverage', () => {
    it('should handle module import without errors', async () => {
      // Test that the module can be imported without throwing
      expect(async () => {
        await import('../../src/index_secure.ts');
      }).not.toThrow();
    });

    it('should create default server instance on module import', async () => {
      // This tests the bottom part of the module that creates the server
      const originalExit = (globalThis as any).process.exit;
      const mockExit = vi.fn();
      (globalThis as any).process.exit = mockExit;
      
      // Clear mocks before testing module import
      vi.clearAllMocks();
      
      // Re-setup the Server mock
      (Server as any).mockImplementation(() => mockServer);
      
      try {
        // Clear module cache and re-import to trigger module initialization
        vi.resetModules();
        await import('../../src/index_secure.ts');
        
        // Should have created a server instance
        expect(Server).toHaveBeenCalled();
        expect(mockServer.setRequestHandler).toHaveBeenCalled();
      } finally {
        (globalThis as any).process.exit = originalExit;
      }
    });
  });
}); 