# MCP XTerminal - Modular Command Validation System

## Overview

Successfully implemented a modular, configuration-driven command validation system for the MCP xterminal project. The system replaces the previous hardcoded "aggressive" security logic with a flexible architecture that supports four validation levels selectable via environment variables.

## Architecture

### Configuration System
- **ConfigLoader**: Loads YAML configuration files with schema validation and hardcoded fallbacks
- **ValidationTypeDetector**: Detects validation level from `COMMAND_VALIDATION` environment variable
- **ValidationConfig**: TypeScript interfaces for configuration structure

### Validation Levels
1. **aggressive** (default): Maximum security, 28 whitelisted commands
2. **medium**: Balanced security, 32 whitelisted commands  
3. **minimal**: Basic validation, no command whitelist
4. **none**: No validation, all commands allowed

### Validator Architecture
- **BaseValidator**: Abstract base class with common validation logic
- **AggressiveValidator**: Strict whitelist validation
- **MediumValidator**: Moderate whitelist validation
- **MinimalValidator**: Basic path/argument validation only
- **NoneValidator**: No validation, allows all commands
- **ValidatorFactory**: Dynamic validator instantiation

## Files Created/Modified

### New Configuration Files
- `config/validation/aggressive.yaml` - Aggressive security config
- `config/validation/medium.yaml` - Medium security config
- `config/validation/minimal.yaml` - Minimal security config
- `config/validation/none.yaml` - No validation config

### New Source Files
- `src/config/ValidationConfig.ts` - Configuration interfaces
- `src/config/ValidationTypeDetector.ts` - Environment variable detection
- `src/config/ConfigLoader.ts` - YAML configuration loader
- `src/validation/BaseValidator.ts` - Base validator class
- `src/validation/AggressiveValidator.ts` - Aggressive validation
- `src/validation/MediumValidator.ts` - Medium validation
- `src/validation/MinimalValidator.ts` - Minimal validation
- `src/validation/NoneValidator.ts` - No validation
- `src/validation/ValidatorFactory.ts` - Validator factory

### Modified Files
- `src/index.ts` - Refactored to use modular validation system
- `package.json` - Added `js-yaml` and `@types/js-yaml` dependencies
- Test files updated to match new output format

## Usage

### Environment Variable
Set `COMMAND_VALIDATION` to one of: `aggressive`, `medium`, `minimal`, `none`, or a custom YAML file path

```bash
# Use aggressive validation (default)
COMMAND_VALIDATION=aggressive npm start

# Use medium validation
COMMAND_VALIDATION=medium npm start

# Use minimal validation
COMMAND_VALIDATION=minimal npm start

# Use no validation
COMMAND_VALIDATION=none npm start

# Use custom validation configuration
COMMAND_VALIDATION=config/validation/my-custom.yaml npm start

# Use custom validation with absolute path
COMMAND_VALIDATION=/path/to/my/custom-validation.yaml npm start
```

### Testing
All tests pass (70/70) with the new modular system:
- Security boundary tests
- Protocol integration tests
- Command execution tests
- Server lifecycle tests

## Key Features

1. **Backward Compatibility**: Defaults to aggressive validation if no environment variable is set
2. **Configuration-Driven**: All validation rules defined in YAML files
3. **Extensible**: Easy to add new validation levels by creating new YAML configs and validators
4. **Robust Error Handling**: Graceful fallback to hardcoded configurations if YAML loading fails
5. **Type Safety**: Full TypeScript interfaces for configuration structure
6. **Comprehensive Testing**: All existing tests maintained and updated

## Security Comparison

| Level | Commands Allowed | Use Case |
|-------|------------------|----------|
| **aggressive** | 28 whitelisted | Untrusted environments |
| **medium** | 32 whitelisted | Balanced security |
| **minimal** | All with basic validation | Development environments |
| **none** | All without validation | Local development only |
| **custom** | User-defined | Flexible custom security |

## Configuration Schema

Each validation level supports:
- `name`: Human-readable validation level name
- `description`: Description of the validation level
- `maxTimeout`: Maximum command timeout in milliseconds
- `whitelistedCommands`: Array of allowed commands with descriptions
- `allowedArguments`: Per-command argument restrictions
- `blockedPatterns`: Regex patterns for blocked content
- `environment`: Environment variable restrictions

## Custom Validation Support (NEW)

### Custom YAML Configuration
In addition to the built-in validation levels, users can now provide custom YAML configuration files:

```bash
# Using custom validation file
COMMAND_VALIDATION=config/validation/my-custom.yaml
```

### Custom Configuration Features
- **User-defined command whitelist**: Define your own allowed commands
- **Custom security patterns**: Block specific dangerous operations
- **File path restrictions**: Control access to sensitive files
- **Environment variable policies**: Manage environment access
- **Custom timeouts and limits**: Set execution boundaries
- **Argument validation**: Define allowed arguments per command

### Custom Validator Selection
The system automatically selects the appropriate validator for custom configurations:
- **High Security**: ≤10 commands + forbidden patterns → Aggressive Validator
- **Medium Security**: ≤20 commands → Medium Validator
- **Low Security**: >20 commands → Minimal Validator

### Example Custom Configuration
```yaml
validation_level: custom
description: "Development environment security"

allowed_commands:
  ls: "List directory contents"
  cat: "Display file contents"
  pwd: "Print working directory"
  git: "Git operations"
  node: "Node.js operations"

forbidden_patterns:
  - "rm\\s"
  - "sudo\\s"
  - "\\|\\s*sh"

limits:
  max_arguments: 20
  timeout_max: 30000
```

For complete custom validation documentation, see [Custom Validation Guide](custom-validation-guide.md).

The system is now fully operational and ready for production use with flexible security configurations.
