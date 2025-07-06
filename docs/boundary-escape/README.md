# BOUNDARY_ESCAPE Functionality Documentation

## Overview

The `BOUNDARY_ESCAPE` environment variable is a security feature in the MCP xTerminal server that controls directory boundary enforcement. This documentation explains how it works, its security implications, and usage considerations.

## How It Works

### Default Behavior (Boundary Enforcement Enabled)
When `BOUNDARY_ESCAPE` is not set or set to any value other than `'true'`:
- The server enforces directory boundaries to prevent access outside safe directories
- By default, the server restricts operations to `/tmp` directory
- This provides a security sandbox for untrusted environments

### Escape Mode (Boundary Enforcement Disabled)
When `BOUNDARY_ESCAPE='true'`:
- Directory boundary enforcement is completely disabled
- The server allows operations in any directory accessible to the process
- **Security Warning**: This removes important safety protections

## Environment Variables

### `BOUNDARY_ESCAPE`
- **Type**: String
- **Default**: `undefined` (boundary enforcement enabled)
- **Values**: 
  - `'true'` - Disables boundary enforcement
  - Any other value or undefined - Enables boundary enforcement

### `BOUNDARY_DIR`
- **Type**: String
- **Default**: `/tmp`
- **Purpose**: Sets the boundary directory when enforcement is enabled
- **Note**: Only effective when `BOUNDARY_ESCAPE` is not `'true'`

## Security Implications

### ⚠️ Security Warning
Enabling `BOUNDARY_ESCAPE` removes critical security protections:
- Allows access to sensitive system directories
- Permits operations outside the intended sandbox
- Should only be used in trusted environments

### Security Levels
1. **Maximum Security** (Default): `BOUNDARY_ESCAPE` unset, `BOUNDARY_DIR='/tmp'`
2. **Custom Boundary**: `BOUNDARY_ESCAPE` unset, `BOUNDARY_DIR='/custom/path'`
3. **No Boundary Protection**: `BOUNDARY_ESCAPE='true'` ⚠️

## Usage Examples

### Example 1: Default Secure Mode
```bash
# Server restricts operations to /tmp
node server.js
```

### Example 2: Custom Boundary Directory
```bash
# Server restricts operations to /home/user/sandbox
export BOUNDARY_DIR="/home/user/sandbox"
node server.js
```

### Example 3: Disable Boundary Enforcement (Unsafe)
```bash
# ⚠️ WARNING: Removes security protections
export BOUNDARY_ESCAPE="true"
node server.js
```

## Demo Script Issues

### Terminal Locking Problem
The `demo-boundary-escape.js` script has a known issue where it locks the terminal after execution.

**Root Cause:**
- Creating `TerminalServer()` instances automatically starts the MCP server
- The server connects to stdio transport and waits for MCP protocol messages
- This blocks the terminal indefinitely, waiting for client connections

**Symptoms:**
- Script appears to hang after displaying results
- Terminal becomes unresponsive
- Requires `Ctrl+C` to terminate

**Current Status:**
- The demo script successfully demonstrates the boundary enforcement logic
- However, it cannot be run interactively due to the terminal locking issue
- This is a limitation of the current server architecture

### Recommended Approach
For testing boundary enforcement:
1. Use unit tests in `tests/unit/BoundaryDirEnforcement.test.ts`
2. Test environment variable effects through the test suite
3. Avoid running the demo script in interactive environments

## Implementation Details

### Code Location
- Main implementation: `src/index.ts`
- Boundary enforcement logic: Lines 1-50
- Environment variable checks: `isBoundaryEscapeEnabled()` function

### Key Functions
```typescript
function isBoundaryEscapeEnabled(): boolean {
  return process.env.BOUNDARY_ESCAPE === 'true';
}

function getBoundaryDir(): string {
  return process.env.BOUNDARY_DIR || '/tmp';
}
```

### Initialization Process
1. Server checks `BOUNDARY_ESCAPE` environment variable
2. If not set to `'true'`, enforces boundary directory
3. Changes working directory to boundary directory
4. Validates all path operations against boundary

## Testing

### Unit Tests
Run the comprehensive test suite:
```bash
npm test
```

### Specific Boundary Tests
```bash
# Run boundary enforcement tests
npm test -- --grep "boundary"
```

### Test Coverage
- Default boundary enforcement behavior
- Custom boundary directory settings
- Escape mode functionality
- Path validation logic

## Best Practices

### Production Usage
1. **Never set `BOUNDARY_ESCAPE='true'` in production**
2. Use specific `BOUNDARY_DIR` values for controlled environments
3. Monitor directory access patterns
4. Regularly audit security configurations

### Development Usage
1. Use boundary enforcement during development
2. Test with various `BOUNDARY_DIR` settings
3. Validate security behavior before deployment
4. Document any boundary customizations

## Troubleshooting

### Common Issues
1. **Permission Denied**: Check boundary directory permissions
2. **Invalid Path**: Verify `BOUNDARY_DIR` exists and is accessible
3. **Unexpected Behavior**: Ensure `BOUNDARY_ESCAPE` is not accidentally set

### Debugging
Enable debug logging to trace boundary enforcement:
```bash
export DEBUG="mcp-xterminal:boundary"
node server.js
```

## Version History

- **v0.3.0**: Current implementation with `BOUNDARY_ESCAPE` support
- **v0.2.0**: Initial boundary enforcement
- **v0.1.0**: Basic terminal server without boundary protection

## Related Documentation

- [Security Documentation](../security/)
- [Configuration Guide](../configuration/)
- [API Reference](../api/)
