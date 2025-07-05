import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TerminalServer } from '../../src/index.js';

describe('Server Lifecycle Tests', () => {
  let server: TerminalServer;
  let originalConsoleError: any;
  let originalProcessExit: any;
  let originalProcessOn: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  let processOnSpy: any;

  beforeEach(() => {
    // Mock console.error to capture server messages
    originalConsoleError = console.error;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock process.exit to prevent actual exit during tests
    originalProcessExit = (globalThis as any).process.exit;
    processExitSpy = vi.fn();
    (globalThis as any).process.exit = processExitSpy;
    
    // Mock process.on to capture signal handlers
    originalProcessOn = (globalThis as any).process.on;
    processOnSpy = vi.fn();
    (globalThis as any).process.on = processOnSpy;
  });

  afterEach(() => {
    // Restore original functions
    console.error = originalConsoleError;
    (globalThis as any).process.exit = originalProcessExit;
    (globalThis as any).process.on = originalProcessOn;
  });

  describe('Server Initialization', () => {
    it('should initialize server instance correctly', () => {
      server = new TerminalServer();
      expect(server).toBeInstanceOf(TerminalServer);
      expect(typeof server.handleListTools).toBe('function');
      expect(typeof server.handleCallTool).toBe('function');
      expect(typeof server.run).toBe('function');
    });

    it('should set up signal handlers during initialization', () => {
      server = new TerminalServer();
      
      // Verify that process.on was called with SIGINT
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should initialize with correct server state', async () => {
      server = new TerminalServer();
      
      // Test initial state by calling get_terminal_info
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'get_terminal_info', arguments: {} }
      });
      
      expect(result.content[0].text).toMatch(/shell:/);
      expect(result.content[0].text).toMatch(/user:/);
      expect(result.content[0].text).toMatch(/currentDirectory:/);
      expect(result.content[0].text).toMatch(/lastCommand: null/);
      expect(result.content[0].text).toMatch(/lastExitCode: null/);
      expect(result.content[0].text).toMatch(/securityMode: 🔒 WHITELIST_ENABLED/);
      expect(result.content[0].text).toMatch(/allowedCommands: 28/);
    });
  });

  describe('Server Tools Registration', () => {
    it('should register all required tools', async () => {
      server = new TerminalServer();
      const toolsResult = await server.handleListTools();
      
      expect(toolsResult.tools).toHaveLength(5);
      
      const toolNames = toolsResult.tools.map(tool => tool.name);
      expect(toolNames).toContain('execute_command');
      expect(toolNames).toContain('change_directory');
      expect(toolNames).toContain('get_current_directory');
      expect(toolNames).toContain('get_terminal_info');
      expect(toolNames).toContain('list_allowed_commands');
    });

    it('should have proper tool descriptions with security indicators', async () => {
      server = new TerminalServer();
      const toolsResult = await server.handleListTools();
      
      const secureTools = toolsResult.tools.filter(tool => 
        tool.description.includes('🔒')
      );
      
      expect(secureTools).toHaveLength(3); // execute_command, change_directory, list_allowed_commands
    });
  });

  describe('Signal Handling', () => {
    it('should set up SIGINT signal handler', () => {
      server = new TerminalServer();
      
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should have async SIGINT handler that calls server.close and process.exit', async () => {
      server = new TerminalServer();
      
      // Get the SIGINT handler
      const sigintCall = processOnSpy.mock.calls.find(call => call[0] === 'SIGINT');
      expect(sigintCall).toBeDefined();
      
      const sigintHandler = sigintCall[1];
      expect(typeof sigintHandler).toBe('function');
      
      // Mock the server.close method
      const mockClose = vi.fn().mockResolvedValue(undefined);
      (server as any).server = { close: mockClose };
      
      // Call the handler
      await sigintHandler();
      
      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle server close errors during SIGINT gracefully', async () => {
      server = new TerminalServer();
      
      const sigintCall = processOnSpy.mock.calls.find(call => call[0] === 'SIGINT');
      const sigintHandler = sigintCall[1];
      
      // Mock server.close to throw an error
      const mockClose = vi.fn().mockRejectedValue(new Error('Close failed'));
      (server as any).server = { close: mockClose };
      
      // The handler should propagate the error
      await expect(sigintHandler()).rejects.toThrow('Close failed');
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Server State Management', () => {
    it('should maintain state between operations', async () => {
      server = new TerminalServer();
      
      // Execute a command to update state
      await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'execute_command', arguments: { command: 'pwd', args: [] } }
      });
      
      // Check that state was updated
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'get_terminal_info', arguments: {} }
      });
      
      expect(result.content[0].text).toMatch(/lastCommand: pwd/);
      expect(result.content[0].text).toMatch(/lastExitCode: 0/);
    });

    it('should track directory changes in state', async () => {
      server = new TerminalServer();
      
      // Change directory
      await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'change_directory', arguments: { path: '/tmp' } }
      });
      
      // Check that state was updated
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'get_current_directory', arguments: {} }
      });
      
      expect(result.content[0].text).toMatch(/Current directory: \/(?:private\/)?tmp/);
    });

    it('should track failed command execution in state', async () => {
      server = new TerminalServer();
      
      // Execute a command that will fail
      await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'execute_command', arguments: { command: 'cat', args: ['/nonexistent/file'] } }
      });
      
      // Check that state was updated with failure
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'get_terminal_info', arguments: {} }
      });
      
      expect(result.content[0].text).toMatch(/lastCommand: cat \/nonexistent\/file/);
      expect(result.content[0].text).toMatch(/lastExitCode: 1/);
    });
  });

  describe('Error Handling Setup', () => {
    it('should set up error handler on server instance', () => {
      server = new TerminalServer();
      
      // Access the server instance to check error handler
      const serverInstance = (server as any).server;
      expect(serverInstance.onerror).toBeDefined();
      expect(typeof serverInstance.onerror).toBe('function');
    });

    it('should log errors when error handler is called', () => {
      server = new TerminalServer();
      
      const serverInstance = (server as any).server;
      const testError = new Error('Test error');
      
      // Call the error handler
      serverInstance.onerror(testError);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[MCP Error]', testError);
    });

    it('should handle non-Error objects in error handler', () => {
      server = new TerminalServer();
      
      const serverInstance = (server as any).server;
      const testError = 'String error';
      
      serverInstance.onerror(testError);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[MCP Error]', testError);
    });
  });

  describe('Server Method Binding', () => {
    it('should properly bind handler methods to server instance', async () => {
      server = new TerminalServer();
      
      // Test that methods are properly bound by calling them
      const toolsResult = await server.handleListTools();
      expect(toolsResult.tools).toHaveLength(5);
      
      const callResult = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'get_current_directory', arguments: {} }
      });
      expect(callResult.content[0].text).toMatch(/Current directory:/);
    });

    it('should maintain proper context in bound methods', async () => {
      server = new TerminalServer();
      
      // Extract the method and call it independently
      const handleListTools = server.handleListTools;
      const result = await handleListTools();
      
      expect(result.tools).toHaveLength(5);
    });
  });

  describe('Server Configuration', () => {
    it('should initialize with correct server configuration', () => {
      server = new TerminalServer();
      
      // Check that the server was created (we can't easily test the exact config
      // without mocking, but we can verify the server exists and works)
      expect(server).toBeInstanceOf(TerminalServer);
      expect(typeof (server as any).server).toBe('object');
    });

    it('should have capabilities configured for tools', async () => {
      server = new TerminalServer();
      
      // Verify tools capability by testing that tools can be listed
      const result = await server.handleListTools();
      expect(result.tools).toHaveLength(5);
      expect(result.tools.every(tool => tool.name && tool.description)).toBe(true);
    });
  });

  describe('Server Lifecycle Integration', () => {
    it('should handle complete request lifecycle', async () => {
      server = new TerminalServer();
      
      // Test a complete request lifecycle
      // 1. List tools
      const toolsResult = await server.handleListTools();
      expect(toolsResult.tools).toHaveLength(5);
      
      // 2. Call a tool
      const callResult = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'execute_command', arguments: { command: 'pwd', args: [] } }
      });
      expect(callResult.content[0].text).toMatch(/STDOUT:/);
      
      // 3. Check state was updated
      const stateResult = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'get_terminal_info', arguments: {} }
      });
      expect(stateResult.content[0].text).toMatch(/lastCommand: pwd/);
    });

    it('should handle errors in request lifecycle gracefully', async () => {
      server = new TerminalServer();
      
      // Test error handling in request lifecycle
      await expect(server.handleCallTool({
        method: 'tools/call',
        params: { name: 'nonexistent_tool', arguments: {} }
      })).rejects.toThrow('Unknown tool');
      
      // Server should still be functional after error
      const result = await server.handleListTools();
      expect(result.tools).toHaveLength(5);
    });
  });
});
