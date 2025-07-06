# Custom Validation Configuration Guide

## Overview

The MCP XTerminal now supports custom validation configurations through user-provided YAML files. This allows you to define your own security rules, command whitelists, and validation policies beyond the built-in validation levels.

## Quick Start

Instead of using a built-in validation level, you can specify a path to your custom YAML configuration file:

```bash
# Using relative path
COMMAND_VALIDATION=config/validation/my-custom.yaml npm start

# Using absolute path
COMMAND_VALIDATION=/path/to/my/custom-validation.yaml npm start
```

## Built-in vs Custom Validation

### Built-in Validation Levels
- `aggressive` - Maximum security with 28 whitelisted commands
- `medium` - Balanced security with 32 whitelisted commands
- `minimal` - Basic validation with no command whitelist
- `none` - No validation, all commands allowed

### Custom Validation
- Define your own command whitelist
- Set custom security patterns
- Configure file path restrictions
- Define environment variable policies
- Set custom timeouts and limits

## Custom Configuration Format

### Basic Structure

```yaml
validation_level: custom
description: "Your custom validation description"

# Define allowed commands
allowed_commands:
  ls: "List directory contents"
  cat: "Display file contents"
  pwd: "Print working directory"
  # ... add more commands as needed

# Security patterns to block
forbidden_patterns:
  - "rm\\s"
  - "sudo\\s"
  - "\\|\\s*sh"
  # ... add more patterns as needed

# Command execution limits
limits:
  max_arguments: 20
  max_command_length: 1000
  timeout_max: 30000      # 30 seconds
  timeout_default: 10000  # 10 seconds
```

### Complete Configuration Example

```yaml
validation_level: custom
description: "Development-focused custom validation"

# Define allowed commands with descriptions
allowed_commands:
  # Basic file operations
  ls: "List directory contents"
  cat: "Display file contents"
  pwd: "Print working directory"
  whoami: "Show current user"
  
  # Text processing
  grep: "Search text patterns"
  head: "Display first lines of file"
  tail: "Display last lines of file"
  wc: "Word, line, character count"
  
  # Development tools
  git: "Git operations (read-only)"
  node: "Node.js operations"
  npm: "NPM operations (limited)"
  
  # System info
  date: "Show current date and time"
  which: "Locate command"
  find: "Find files and directories"

# Security patterns to block dangerous operations
forbidden_patterns:
  - "rm\\s"              # Block rm command
  - "sudo\\s"            # Block sudo
  - "su\\s"              # Block su
  - "chmod\\s+x"         # Block chmod +x
  - "curl.*\\|"          # Block curl pipes
  - "wget.*\\|"          # Block wget pipes
  - "&\\s*$"             # Block background execution
  - ";\\s*rm"            # Block command chains with rm
  - "\\|\\s*sh"          # Block pipes to shell
  - "\\|\\s*bash"        # Block pipes to bash
  - ">\\s*/dev/"         # Block redirects to devices
  - "2>&1"               # Block stderr redirects

# File path restrictions
file_path_restrictions:
  enabled: true
  blocked_paths:
    - "/etc/passwd"
    - "/etc/shadow"
    - "/root/"
    - "/sys/"
    - "/proc/"
  allowed_extensions:
    - ".txt"
    - ".md"
    - ".json"
    - ".yaml"
    - ".yml"
    - ".js"
    - ".ts"
    - ".py"

# Environment variable policy
environment_policy:
  mode: whitelist          # or "blacklist" or "none"
  allowed_vars:
    - PATH
    - HOME
    - USER
    - SHELL
    - PWD
    - TERM
    - LANG
    - NODE_ENV

# Command execution limits
limits:
  max_arguments: 20
  max_command_length: 1000
  timeout_max: 30000      # 30 seconds max
  timeout_default: 10000  # 10 seconds default

# Argument validation for specific commands
allowed_arguments:
  ls:
    - "-l"
    - "-a"
    - "-la"
    - "-h"
    - "--help"
  git:
    - "status"
    - "log"
    - "diff"
    - "show"
    - "branch"
    - "remote"
    - "-v"
    - "--oneline"
    - "--stat"
    - "--help"
  npm:
    - "list"
    - "version"
    - "info"
    - "--version"
    - "--help"
  # ... add more command-specific arguments
```

## How Custom Validation Works

### 1. Configuration Detection
The system automatically detects whether you're using a built-in validation level or a custom YAML file:

```typescript
// Built-in validation
COMMAND_VALIDATION=medium

// Custom validation (detected by .yaml/.yml extension)
COMMAND_VALIDATION=my-config.yaml
```

### 2. Configuration Loading
Custom configurations are loaded and normalized to ensure compatibility with the validation system:

- **Simple format**: Just command names as strings
- **Detailed format**: Command objects with descriptions and arguments
- **Mixed format**: Combination of both formats

### 3. Validator Selection
For custom configurations, the system automatically selects the appropriate validator based on the security characteristics:

- **High Security**: ≤10 commands + forbidden patterns → Aggressive Validator
- **Medium Security**: ≤20 commands → Medium Validator  
- **Low Security**: >20 commands → Minimal Validator

## Configuration Fields Reference

### Required Fields
- `validation_level`: Must be set to "custom"
- `allowed_commands`: Object defining allowed commands

### Optional Fields
- `description`: Human-readable description
- `forbidden_patterns`: Array of regex patterns to block
- `file_path_restrictions`: File access restrictions
- `environment_policy`: Environment variable handling
- `limits`: Execution limits and timeouts
- `allowed_arguments`: Per-command argument restrictions

### Field Details

#### `allowed_commands`
Define which commands are allowed. Supports two formats:

```yaml
# Simple format
allowed_commands:
  ls: "List files"
  cat: "Display file contents"

# Detailed format (for future extensions)
allowed_commands:
  ls:
    description: "List files"
    max_args: 10
  cat:
    description: "Display file contents"
    max_args: 5
```

#### `forbidden_patterns`
Regular expressions to block dangerous patterns:

```yaml
forbidden_patterns:
  - "rm\\s"              # Block rm command
  - "sudo\\s"            # Block sudo
  - "\\|\\s*sh"          # Block pipes to shell
```

#### `limits`
Execution limits:

```yaml
limits:
  max_arguments: 20        # Maximum arguments per command
  max_command_length: 1000 # Maximum command string length
  timeout_max: 30000       # Maximum timeout (ms)
  timeout_default: 10000   # Default timeout (ms)
```

#### `environment_policy`
Environment variable handling:

```yaml
environment_policy:
  mode: whitelist          # whitelist, blacklist, or none
  allowed_vars:
    - PATH
    - HOME
    - USER
```

## Testing Custom Configurations

### 1. Configuration Validation
Test your configuration loading:

```bash
# Test configuration loading
COMMAND_VALIDATION=my-config.yaml node test-custom-config.js
```

### 2. Validation Testing
Test command validation:

```bash
# Test command validation
COMMAND_VALIDATION=my-config.yaml node test-custom-validation.js
```

### 3. Full Integration Testing
Run the complete test suite:

```bash
# Run all tests with custom configuration
COMMAND_VALIDATION=my-config.yaml npm test
```

## Best Practices

### Security Considerations
1. **Start Restrictive**: Begin with a minimal command set and add as needed
2. **Use Forbidden Patterns**: Block dangerous operations with regex patterns
3. **Limit File Access**: Restrict access to sensitive system files
4. **Control Environment**: Use environment variable whitelisting
5. **Set Timeouts**: Prevent long-running commands from blocking the system

### Configuration Management
1. **Version Control**: Store custom configurations in version control
2. **Environment-Specific**: Use different configs for dev/staging/prod
3. **Documentation**: Document your custom rules and their purposes
4. **Regular Review**: Periodically review and update security rules

### Example Use Cases

#### Development Environment
```yaml
validation_level: custom
description: "Development environment - moderate security"
allowed_commands:
  ls: "List files"
  cat: "Display file contents"
  pwd: "Print working directory"
  git: "Git operations"
  node: "Node.js operations"
  npm: "NPM operations"
  echo: "Display text"
  # ... more development tools
```

#### CI/CD Environment
```yaml
validation_level: custom
description: "CI/CD environment - build tools only"
allowed_commands:
  git: "Git operations"
  node: "Node.js operations"
  npm: "NPM operations"
  yarn: "Yarn operations"
  docker: "Docker operations"
  # ... CI/CD specific tools
```

#### Production Environment
```yaml
validation_level: custom
description: "Production environment - minimal access"
allowed_commands:
  ls: "List files"
  cat: "Display file contents"
  pwd: "Print working directory"
  # ... very limited set
forbidden_patterns:
  - ".*" # Block almost everything except whitelisted
```

## Error Handling

### Configuration Errors
- **File Not Found**: Falls back to aggressive validation
- **Invalid YAML**: Falls back to aggressive validation
- **Missing Required Fields**: Falls back to aggressive validation
- **Invalid Patterns**: Logs warnings and continues

### Runtime Errors
- **Command Validation**: Returns detailed error messages
- **Timeout Errors**: Respects custom timeout settings
- **Permission Errors**: Enforces file path restrictions

## Migration Guide

### From Built-in to Custom
1. Start with the built-in configuration that matches your needs
2. Copy the relevant YAML file as a starting point
3. Modify the configuration to match your requirements
4. Test thoroughly before deploying

### Configuration Updates
1. Update your YAML configuration file
2. Restart the MCP server to load new configuration
3. Test the changes with your specific use cases

## Troubleshooting

### Common Issues
1. **Configuration Not Loading**: Check file path and permissions
2. **Commands Still Blocked**: Verify command is in `allowed_commands`
3. **Unexpected Behavior**: Check `forbidden_patterns` for conflicts
4. **Performance Issues**: Review `limits` and `timeout` settings

### Debug Information
The system provides detailed logging for configuration loading and validation decisions. Check the console output for debugging information.

## Future Enhancements

The custom validation system is designed to be extensible. Future enhancements may include:

- **Schema Validation**: Formal JSON schema validation for custom configurations
- **Configuration Templates**: Pre-built templates for common use cases
- **Dynamic Reloading**: Hot-reload configuration changes without restart
- **Advanced Patterns**: More sophisticated command pattern matching
- **Audit Logging**: Detailed logging of all command validations

## Contributing

If you have suggestions for improving the custom validation system or encounter issues, please:

1. Check existing documentation and examples
2. Review the test files for usage patterns
3. Submit detailed bug reports or feature requests
4. Contribute example configurations for common use cases

The custom validation system represents a significant enhancement to the MCP XTerminal's security and flexibility, enabling fine-grained control over command execution in various environments.
