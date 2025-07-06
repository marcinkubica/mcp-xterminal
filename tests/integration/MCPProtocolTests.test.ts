import { describe, it, expect } from 'vitest';
import { TerminalServer } from '../../src/index.js';

describe('MCP Protocol Integration Tests', () => {
  it('should list all tools correctly', async () => {
    const server = new TerminalServer();
    const tools = await server.handleListTools();
    
    expect(tools.tools).toHaveLength(5);
    expect(tools.tools.map(t => t.name)).toEqual([
      'execute_command',
      'change_directory', 
      'get_current_directory',
      'get_terminal_info',
      'list_allowed_commands'
    ]);
  });

  it('should handle invalid tool calls', async () => {
    const server = new TerminalServer();
    await expect(server.handleCallTool({ 
      method: 'tools/call',
      params: { name: 'invalid_tool', arguments: {} } 
    }))
      .rejects.toThrow('Unknown tool');
  });

  describe('get_terminal_info Tool', () => {
    it('should return terminal information', async () => {
      const server = new TerminalServer();
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'get_terminal_info', arguments: {} }
      });
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const infoText = result.content[0].text;
      expect(infoText).toMatch(/shell:/);
      expect(infoText).toMatch(/user:/);
      expect(infoText).toMatch(/home:/);
      expect(infoText).toMatch(/platform:/);
      expect(infoText).toMatch(/currentDirectory:/);
      expect(infoText).toMatch(/securityMode: 🔒 AGGRESSIVE_ENABLED/);
      expect(infoText).toMatch(/allowedCommands:/);
    });

    it('should include current directory in terminal info', async () => {
      const server = new TerminalServer();
      
      // First, change directory to a test location
      await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'change_directory', arguments: { path: '/tmp' } }
      });
      
      // Then get terminal info
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'get_terminal_info', arguments: {} }
      });
      
      const infoText = result.content[0].text;
      expect(infoText).toMatch(/currentDirectory: \/(?:private\/)?tmp/);
    });

    it('should include last command information after execution', async () => {
      const server = new TerminalServer();
      
      // Execute a command first
      await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'execute_command', arguments: { command: 'pwd', args: [] } }
      });
      
      // Get terminal info
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'get_terminal_info', arguments: {} }
      });
      
      const infoText = result.content[0].text;
      expect(infoText).toMatch(/lastCommand: pwd/);
      expect(infoText).toMatch(/lastExitCode: 0/);
    });
  });

  describe('list_allowed_commands Tool', () => {
    it('should return list of allowed commands', async () => {
      const server = new TerminalServer();
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'list_allowed_commands', arguments: {} }
      });
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const commandListText = result.content[0].text;
      expect(commandListText).toMatch(/🔒 SECURITY: AGGRESSIVE Mode - Whitelisted Commands Only/);
      expect(commandListText).toMatch(/Allowed commands:/);
      expect(commandListText).toMatch(/🔒 ls: List directory contents/);
      expect(commandListText).toMatch(/🔒 pwd: Print working directory/);
      expect(commandListText).toMatch(/🔒 whoami: Show current user/);
      expect(commandListText).toMatch(/🔒 Note: All commands are validated against security patterns/);
    });

    it('should list all whitelisted commands with descriptions', async () => {
      const server = new TerminalServer();
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'list_allowed_commands', arguments: {} }
      });
      
      const commandListText = result.content[0].text;
      
      // Check for key commands that should be in the whitelist
      const expectedCommands = [
        'ls: List directory contents',
        'cat: Display file contents',
        'pwd: Print working directory',
        'whoami: Show current user',
        'date: Show current date and time',
        'git: Git operations \\(read-only\\)',
        'node: Node.js version'
      ];
      
      expectedCommands.forEach(expectedCommand => {
        expect(commandListText).toMatch(new RegExp(expectedCommand));
      });
    });

    it('should indicate security restrictions', async () => {
      const server = new TerminalServer();
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'list_allowed_commands', arguments: {} }
      });
      
      const commandListText = result.content[0].text;
      expect(commandListText).toMatch(/🔒 SECURITY: AGGRESSIVE Mode - Whitelisted Commands Only/);
      expect(commandListText).toMatch(/🔒 Note: All commands are validated against security patterns/);
    });
  });

  describe('Tool Error Handling', () => {
    it('should handle errors in tool execution gracefully', async () => {
      const server = new TerminalServer();
      
      // Test with a command that should fail
      await expect(
        server.handleCallTool({
          method: 'tools/call',
          params: { name: 'execute_command', arguments: { command: 'cat', args: ['/nonexistent/file'] } }
        })
      ).resolves.toHaveProperty('content');
      
      // The command should execute but return an error result, not throw
      const result = await server.handleCallTool({
        method: 'tools/call',
        params: { name: 'execute_command', arguments: { command: 'cat', args: ['/nonexistent/file'] } }
      });
      
      expect(result.content[0].text).toMatch(/No such file or directory|cannot open/);
    });

    it('should handle missing required arguments', async () => {
      const server = new TerminalServer();
      
      // Test execute_command without command parameter
      await expect(
        server.handleCallTool({
          method: 'tools/call',
          params: { name: 'execute_command', arguments: {} }
        })
      ).rejects.toThrow(/Required|Invalid arguments/);
    });

    it('should handle invalid arguments types', async () => {
      const server = new TerminalServer();
      
      // Test with invalid argument types
      await expect(
        server.handleCallTool({
          method: 'tools/call',
          params: { name: 'execute_command', arguments: { command: 123, args: 'invalid' } }
        })
      ).rejects.toThrow();
    });
  });
});
