// --- BOUNDARY DIR ENFORCEMENT HELPERS ---

function getBoundaryDir(): string {
  return process.env.BOUNDARY_DIR || '/tmp';
}

function isBoundaryEscapeEnabled(): boolean {
  return process.env.BOUNDARY_ESCAPE === 'true';
}

// Ensure process starts in boundary dir unless escape is enabled
if (!isBoundaryEscapeEnabled()) {
  const boundaryDir = getBoundaryDir();
  if (process.cwd() !== boundaryDir) {
    try {
      process.chdir(boundaryDir);
      // Optionally, log or track this change if needed
    } catch (err) {
      // Fail safe: do not crash, but warn
      console.warn(`Warning: Could not change working directory to boundary dir (${boundaryDir}):`, err);
    }
  }
} else {
  console.warn('🔓 BOUNDARY_ESCAPE enabled: Directory enforcement disabled');
}

/**
 * Resolves a user-supplied path against the current directory and ensures it stays within the boundary dir.
 * Throws McpError if the resolved path is outside the boundary (unless BOUNDARY_ESCAPE is enabled).
 */
function resolveAndValidatePath(currentDir: string, userPath: string): string {
  const resolved = path.resolve(currentDir, userPath);
  
  // Skip boundary validation if escape is enabled
  if (isBoundaryEscapeEnabled()) {
    return resolved;
  }
  
  const boundary = path.resolve(getBoundaryDir());
  // Ensure resolved path is within boundary (prefix match, with trailing slash or exact)
  if (
    resolved === boundary ||
    resolved.startsWith(boundary + path.sep)
  ) {
    return resolved;
  }
  throw new McpError(
    ErrorCode.InvalidParams,
    `🔒 SECURITY BLOCK: Path '${resolved}' is outside the allowed boundary (${boundary})`
  );
}


import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { ValidatorFactory } from './validation/ValidatorFactory.js';
import { BaseValidator } from './validation/BaseValidator.js';

const execAsync = promisify(exec);

// Legacy interface for backward compatibility
interface CommandValidationResult {
  isValid: boolean;
  sanitizedCommand?: string;
  sanitizedArgs?: string[];
  error?: string;
}

// Legacy function that now uses the new validation system
async function validateAndSanitizeCommand(command: string, args: string[]): Promise<CommandValidationResult> {
  try {
    const validator = await ValidatorFactory.getValidator();
    return validator.validateCommand(command, args);
  } catch (error) {
    console.error('Error in validation:', error);
    return {
      isValid: false,
      error: `Validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

const ExecuteCommandSchema = z.object({
  command: z.string().describe("The command to execute (must be from whitelist)"),
  args: z.array(z.string()).optional().default([]).describe("Command arguments (validated)"),
  options: z.object({
    cwd: z.string().optional().describe("Working directory"),
    timeout: z.number().optional().describe("Command timeout in milliseconds (max 10s)"),
    env: z.record(z.string()).optional().describe("Additional environment variables")
  }).optional().default({})
});

const ChangeDirectorySchema = z.object({
  path: z.string().describe("Directory path to change to")
});

const GetCurrentDirectorySchema = z.object({});

const GetTerminalInfoSchema = z.object({});

const ListAllowedCommandsSchema = z.object({});

interface ServerState {
  currentDirectory: string;
  lastExitCode: number | null;
  lastCommand: string | null;
}

class TerminalServer {
  private server: Server;
  private state: ServerState;

  constructor() {
    this.server = new Server({
      name: "secure-terminal-server",
      version: "0.2.0-secure"
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.state = {
      currentDirectory: (globalThis as any).process.cwd(),
      lastExitCode: null,
      lastCommand: null
    };

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error: unknown) => {
      console.error("[MCP Error]", error);
    };

    (globalThis as any).process.on('SIGINT', async () => {
      await this.server.close();
      (globalThis as any).process.exit(0);
    });
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, this.handleListTools.bind(this));
    this.server.setRequestHandler(CallToolRequestSchema, this.handleCallTool.bind(this));
  }

  public async handleListTools() {
    const ToolInputSchema = ToolSchema.shape.inputSchema;
    type ToolInput = z.infer<typeof ToolInputSchema>;

    return {
      tools: [
        {
          name: "execute_command",
          description: "🔒 Execute a WHITELISTED terminal command with validated arguments only.",
          inputSchema: zodToJsonSchema(ExecuteCommandSchema) as ToolInput,
        },
        {
          name: "change_directory",
          description: "🔒 Change working directory (RESTRICTED to home and /tmp only).",
          inputSchema: zodToJsonSchema(ChangeDirectorySchema) as ToolInput,
        },
        {
          name: "get_current_directory",
          description: "Get the current working directory path.",
          inputSchema: zodToJsonSchema(GetCurrentDirectorySchema) as ToolInput,
        },
        {
          name: "get_terminal_info",
          description: "Get terminal environment info and security status.",
          inputSchema: zodToJsonSchema(GetTerminalInfoSchema) as ToolInput,
        },
        {
          name: "list_allowed_commands",
          description: "🔒 List all commands allowed by the security whitelist.",
          inputSchema: zodToJsonSchema(ListAllowedCommandsSchema) as ToolInput,
        }
      ]
    };
  }

  private formatCommandOutput(stdout: string, stderr: string, exitCode: number | null): string {
    let output = '';
    
    if (stdout) {
      output += `STDOUT:\n${stdout}\n`;
    }
    
    if (stderr) {
      output += `STDERR:\n${stderr}\n`;
    }
    
    if (exitCode !== null) {
      output += `Exit Code: ${exitCode}\n`;
    }
    
    return output.trim();
  }

  private async executeCommand(
    command: string,
    args: string[],
    options: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
    } = {}
  ) {
    // 🔒 SECURITY: Validate and sanitize the command first
    const validation = await validateAndSanitizeCommand(command, args);
    if (!validation.isValid) {
      throw new McpError(ErrorCode.InvalidParams, `🔒 SECURITY BLOCK: ${validation.error}`);
    }

    const { sanitizedCommand, sanitizedArgs } = validation;
    const fullCommand = `${sanitizedCommand} ${sanitizedArgs!.join(' ')}`;
    
    // Get validator for environment and timeout configuration
    const validator = await ValidatorFactory.getValidator();
    
    // 🔒 SECURITY: Enforce execution limits based on validation level
    const execOptions = {
      cwd: options.cwd || this.state.currentDirectory,
      timeout: validator.getTimeout(options.timeout),
      env: validator.buildEnvironment(options.env),
      // Additional security options
      windowsHide: true // Hide windows on Windows
    };

    try {
      console.error(`🔒 [SECURITY] Executing whitelisted command: ${fullCommand}`);
      const { stdout, stderr } = await execAsync(fullCommand, execOptions);
      this.state.lastExitCode = 0;
      this.state.lastCommand = fullCommand;
      return this.formatCommandOutput(stdout, stderr, 0);
    } catch (error: any) {
      this.state.lastExitCode = error.code || 1;
      this.state.lastCommand = fullCommand;
      console.error(`🔒 [SECURITY] Command failed: ${fullCommand}, Error: ${error.message}`);
      return this.formatCommandOutput(
        error.stdout || '',
        error.stderr || error.message,
        error.code || 1
      );
    }
  }

  public async handleCallTool(request: z.infer<typeof CallToolRequestSchema>) {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "execute_command": {
          const parsed = ExecuteCommandSchema.safeParse(args);
          if (!parsed.success) {
            throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${parsed.error}`);
          }

          // 🔒 SECURITY: Validate command and arguments before execution
          const validation = await validateAndSanitizeCommand(parsed.data.command, parsed.data.args);
          if (!validation.isValid) {
            throw new McpError(ErrorCode.InvalidParams, `🔒 SECURITY BLOCK: ${validation.error}`);
          }

          const result = await this.executeCommand(
            parsed.data.command,
            parsed.data.args,
            parsed.data.options
          );

          return {
            content: [{ type: "text", text: result }]
          };
        }

        case "change_directory": {
          const parsed = ChangeDirectorySchema.safeParse(args);
          if (!parsed.success) {
            throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${parsed.error}`);
          }
          // 🔒 SECURITY: Enforce boundary dir
          let newPath: string;
          try {
            newPath = resolveAndValidatePath(this.state.currentDirectory, parsed.data.path);
          } catch (err) {
            throw err;
          }
          // 🔒 SECURITY: Directory must exist
          try {
            if (!fs.existsSync(newPath)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `🔒 SECURITY BLOCK: Directory does not exist: ${newPath}`
              );
            }
            (globalThis as any).process.chdir(newPath);
            this.state.currentDirectory = (globalThis as any).process.cwd();
            console.error(`🔒 [SECURITY] Directory changed to: ${this.state.currentDirectory}`);
            return {
              content: [{
                type: "text",
                text: `Current directory changed to: ${this.state.currentDirectory}`
              }]
            };
          } catch (error: any) {
            if (error instanceof McpError) throw error;
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to change directory: ${error.message}`
            );
          }
        }

        case "get_current_directory": {
          return {
            content: [{
              type: "text",
              text: `Current directory: ${this.state.currentDirectory}`
            }]
          };
        }

        case "get_terminal_info": {
          const validator = await ValidatorFactory.getValidator();
          const info = {
            shell: (globalThis as any).process.env.SHELL || 'unknown',
            user: (globalThis as any).process.env.USER || os.userInfo().username,
            home: os.homedir(),
            platform: (globalThis as any).process.platform,
            currentDirectory: this.state.currentDirectory,
            lastCommand: this.state.lastCommand,
            lastExitCode: this.state.lastExitCode,
            securityMode: `🔒 ${validator.getValidationLevel().toUpperCase()}_ENABLED`,
            validationLevel: validator.getValidationLevel(),
            allowedCommands: validator.getAllowedCommandsCount()
          };

          return {
            content: [{
              type: "text",
              text: Object.entries(info)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            }]
          };
        }

        case "list_allowed_commands": {
          const validator = await ValidatorFactory.getValidator();
          const config = (validator as any).config; // Access config for command listing
          
          if (Object.keys(config.allowed_commands).length === 0) {
            // No whitelist - all commands allowed
            return {
              content: [{
                type: "text",
                text: `🔒 SECURITY: ${validator.getValidationLevel().toUpperCase()} Mode\n\n${validator.getDescription()}\n\n⚠️ All commands are allowed in this validation level.\n\nActive restrictions:\n- Forbidden patterns: ${config.forbidden_patterns.length}\n- File path restrictions: ${config.file_path_restrictions.enabled ? 'Enabled' : 'Disabled'}\n- Environment policy: ${config.environment_policy.mode}`
              }]
            };
          } else {
            // Whitelist mode
            const commandList = Object.entries(config.allowed_commands)
              .map(([cmd, commandConfig]: [string, any]) => `🔒 ${cmd}: ${commandConfig.description}`)
              .join('\n');

            return {
              content: [{
                type: "text",
                text: `🔒 SECURITY: ${validator.getValidationLevel().toUpperCase()} Mode - Whitelisted Commands Only\n\n${validator.getDescription()}\n\nAllowed commands:\n${commandList}\n\n🔒 Note: All commands are validated against security patterns and argument restrictions.`
              }]
            };
          }
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, `Error executing tool: ${errorMessage}`);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Get validator information for startup logging
    const validator = await ValidatorFactory.getValidator();
    
    console.error("🔒 SECURE Terminal MCP Server running on stdio");
    console.error(`🔒 Security: ${validator.getValidationLevel().toUpperCase()} validation enabled`);
    console.error(`🔒 ${validator.getDescription()}`);
    console.error(`🔒 Allowed commands: ${validator.getAllowedCommandsCount()}`);
    console.error("🔒 Current directory:", this.state.currentDirectory);
    
    if (validator.getValidationLevel() === 'aggressive') {
      console.error("🔒 Dangerous commands BLOCKED (rm, curl, sudo, etc.)");
    } else if (validator.getValidationLevel() === 'none') {
      console.error("🚨 WARNING: ALL SECURITY PROTECTIONS DISABLED!");
    }
  }
}

const server = new TerminalServer();
server.run().catch((error) => {
  console.error("Fatal error running server:", error);
  (globalThis as any).process.exit(1);
});

// Export for testing
export { TerminalServer };
