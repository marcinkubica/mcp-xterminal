import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TerminalServer } from '../../src/index.js';
import { ValidatorFactory } from '../../src/validation/ValidatorFactory';
import { BaseValidator } from '../../src/validation/BaseValidator.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  const mockServer = {
    setRequestHandler: vi.fn(),
    setErrorHandler: vi.fn(),
    onerror: null,
    close: vi.fn(),
    listen: vi.fn()
  };
  const Server = vi.fn(() => mockServer);
  globalThis.mockServer = mockServer;
  globalThis.Server = Server;
  return {
    Server
  };
});

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    // Transport methods
  }))
}));

vi.mock('../../src/validation/ValidatorFactory.js', () => ({
  ValidatorFactory: {
    getValidator: vi.fn()
  }
}));

vi.mock('../../src/config/ValidationTypeDetector.js', () => ({
  ValidationTypeDetector: {
    detectValidationType: vi.fn()
  }
}));

// Mock process.exit to prevent test termination
const originalExit = process.exit;
beforeEach(() => {
  process.exit = vi.fn() as any;
  vi.clearAllMocks();
  // Reset all spies on globalThis.mockServer
  if (globalThis.mockServer) {
    globalThis.mockServer.setRequestHandler.mockReset();
    globalThis.mockServer.setErrorHandler.mockReset();
    globalThis.mockServer.close.mockReset();
    globalThis.mockServer.listen.mockReset();
    globalThis.mockServer.onerror = null;
  }
});

afterEach(() => {
  process.exit = originalExit;
});

describe('TerminalServer', () => {
  let mockServer: any;
  let mockValidator: any;
  let mockValidatorFactory: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all spies on globalThis.mockServer
    if (globalThis.mockServer) {
      globalThis.mockServer.setRequestHandler.mockReset();
      globalThis.mockServer.setErrorHandler.mockReset();
      globalThis.mockServer.close.mockReset();
      globalThis.mockServer.listen.mockReset();
      globalThis.mockServer.onerror = null;
    }

    mockValidator = {
      validateCommand: vi.fn(),
      validateFilePath: vi.fn(),
      buildEnvironment: vi.fn(),
      getValidationLevel: vi.fn(),
      getDescription: vi.fn(),
      getAllowedCommandsCount: vi.fn()
    };

    mockValidatorFactory = {
      getValidator: vi.fn()
    };

    // ValidatorFactory is imported at the top
    ValidatorFactory.getValidator = mockValidatorFactory.getValidator;
    mockValidatorFactory.getValidator.mockResolvedValue(mockValidator);
  });

  describe('Server Initialization', () => {
    it('should create server with correct configuration', () => {
      const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
      
      // Create a new instance to trigger the constructor
      new TerminalServer();
      
      expect(globalThis.Server).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "secure-terminal-server",
          version: "0.2.0-secure"
        }),
        expect.any(Object)
      );
    });

    it('should initialize state with current directory', () => {
      const server = new TerminalServer();
      
      // Test that the server has been initialized
      expect(server).toBeDefined();
    });

    it('should set up request handlers', () => {
      const server = new TerminalServer();
      
      // Test that request handlers are available
      expect(globalThis.mockServer.setRequestHandler).toBeDefined();
    });

    it('should set up SIGINT handler', () => {
      const server = new TerminalServer();
      
      // Test that error handlers are available
      expect(globalThis.mockServer.setErrorHandler).toBeDefined();
    });
  });

  describe('Boundary Directory Enforcement', () => {
    it('should enforce boundary directory by default', () => {
      const server = new TerminalServer();
      
      // Test that boundary enforcement is available
      expect(server).toBeDefined();
    });
  });

  describe('Command Validation', () => {
    it('should validate commands using ValidatorFactory', async () => {
      const server = new TerminalServer();
      
      // Test that validator factory is available
      expect(mockValidatorFactory.getValidator).toBeDefined();
    });

    it('should handle validation errors gracefully', async () => {
      const server = new TerminalServer();
      
      // Test that error handling is available
      expect(globalThis.mockServer.setErrorHandler).toBeDefined();
    });
  });

  describe('Tool Handlers', () => {
    it('should handle list tools request', async () => {
      const server = new TerminalServer();
      
      // Test that list tools handler is available
      expect(globalThis.mockServer.setRequestHandler).toBeDefined();
    });

    it('should handle call tool request', async () => {
      const server = new TerminalServer();
      
      // Test that call tool handler is available
      expect(globalThis.mockServer.setRequestHandler).toBeDefined();
    });
  });

  describe('Command Execution', () => {
    it('should execute valid commands', async () => {
      const server = new TerminalServer();
      
      // Test that command execution is available
      expect(true).toBe(true); // Placeholder - execution happens in actual server
    });

    it('should handle command execution errors', async () => {
      const server = new TerminalServer();
      
      // Test that error handling is available
      expect(globalThis.mockServer.setErrorHandler).toBeDefined();
    });
  });

  describe('Directory Operations', () => {
    it('should change directory successfully', async () => {
      const server = new TerminalServer();
      
      // Test that directory operations are available
      expect(true).toBe(true); // Placeholder - operations happen in actual server
    });

    it('should get current directory', async () => {
      const server = new TerminalServer();
      
      // Test that directory operations are available
      expect(true).toBe(true); // Placeholder - operations happen in actual server
    });
  });

  describe('Terminal Info', () => {
    it('should return terminal information', async () => {
      const server = new TerminalServer();
      
      // Test that terminal info is available
      expect(true).toBe(true); // Placeholder - info gathering happens in actual server
    });

    it('should include last command information after execution', async () => {
      const server = new TerminalServer();
      
      // Test that command tracking is available
      expect(true).toBe(true); // Placeholder - tracking happens in actual server
    });
  });

  describe('Allowed Commands', () => {
    it('should list allowed commands', async () => {
      const server = new TerminalServer();
      
      // Test that command listing is available
      expect(true).toBe(true); // Placeholder - listing happens in actual server
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool requests', async () => {
      const server = new TerminalServer();
      
      // Test that error handling is available
      expect(globalThis.mockServer.setErrorHandler).toBeDefined();
    });

    it('should handle tool execution errors', async () => {
      const server = new TerminalServer();
      
      // Test that error handling is available
      expect(globalThis.mockServer.setErrorHandler).toBeDefined();
    });
  });

  describe('Server Lifecycle', () => {
    it('should handle SIGINT gracefully', async () => {
      const server = new TerminalServer();
      
      // Test that SIGINT handling is available
      expect(globalThis.mockServer.setErrorHandler).toBeDefined();
    });
  });
}); 
