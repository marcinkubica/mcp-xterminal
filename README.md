# mcp xterminal

A MCP server that suppose work around Copilot inability to autonomously execute terminal commands.

Initially forked from [stat-guy/terminal](https://github.com/stat-guy/terminal)

`Project is in a prototype stage - using is not advised`

## What it does

Secure MCP server that enables AI agents to execute terminal commands with strict security controls:

- **Whitelisted commands only** - Blocks dangerous commands (rm, curl, sudo, etc.)
- **Directory boundaries** - Restricts access to specified directories
- **Argument validation** - Prevents command injection attacks
- **MCP protocol compliant** - Works with VS Code Copilot and other MCP clients

## Tools provided

- `execute_command` - Run whitelisted shell commands
- `change_directory` - Navigate within boundary directories
- `get_current_directory` - Get current working directory
- `get_terminal_info` - System and session information
- `list_allowed_commands` - Show all whitelisted commands

## Security features

- 🔒 Command whitelist with 28+ safe commands
- 🔒 Directory traversal protection
- 🔒 Argument count and pattern validation
- 🔒 Configurable boundary directory enforcement
- 🔒 No network access commands allowed

## Quick start

```bash
npm install
npm run build
```

Configure in VS Code MCP settings:
```json
{
  "mcp": {
    "servers": {
      "terminal": {
        "type": "stdio",
        "command": "node",
        "args": ["~/path/to/mcp-xterminal/dist/index.js"],
        "env": {
          "BOUNDARY_DIR": "/safe/directory/path"
        }
      }
    }
  }
}
```
