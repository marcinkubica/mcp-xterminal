# Command Validation Types - Modular Security Configuration

## Overview

This proposal outlines a modular approach to command validation security levels in the MCP xterminal project. Instead of hardcoded aggressive security settings, the system will support three configurable validation types through the `COMMAND_VALIDATION` environment variable.

## Current State Analysis

### Hardcoded Aggressive Security
Currently, the system has hardcoded aggressive security settings in `src/index.ts`:
- **28 whitelisted commands** with strictly defined allowed arguments
- **15 forbidden patterns** blocking dangerous operations
- **File path restrictions** using regex patterns
- **Argument count limits** (max 10 arguments)
- **Essential environment variables only** (PATH, HOME, USER, SHELL)

### Security Enforcement Points
1. **Command Whitelisting**: Only approved commands allowed
2. **Argument Validation**: Strict argument checking against allowed lists
3. **Pattern Blocking**: Regex patterns to prevent injection attacks
4. **File Path Sanitization**: Safe file path patterns only
5. **Environment Variable Filtering**: Limited environment exposure

## Proposed Architecture

### Environment Variable Configuration
```bash
# Set validation type
export COMMAND_VALIDATION=aggressive|medium|minimal|none

# Fallback to aggressive if not set
COMMAND_VALIDATION=${COMMAND_VALIDATION:-aggressive}
```

### Configuration Files Structure
```
config/
├── validation/
│   ├── aggressive.yaml
│   ├── medium.yaml
│   ├── minimal.yaml
│   └── none.yaml
└── validation.schema.yaml
```

### Configuration Schema (YAML)
```yaml
# validation.schema.yaml
validation_level: string  # aggressive|medium|minimal|none
description: string
allowed_commands:
  command_name:
    allowed_args: string[]
    description: string
    requires_file: boolean?
    max_args: number?
    environment_vars: string[]?
forbidden_patterns: string[]
file_path_restrictions:
  enabled: boolean
  pattern: string?
  max_path_length: number?
environment_policy:
  mode: string  # whitelist|blacklist|passthrough
  allowed_vars: string[]?
  blocked_vars: string[]?
limits:
  max_arguments: number
  max_command_length: number
  timeout_max: number
  timeout_default: number
```

## Security Level Comparison

| Feature | Aggressive | Medium | Minimal | None |
|---------|-----------|--------|---------|------|
| Command Whitelist | 28 commands | 60+ commands | All allowed | All allowed |
| Argument Validation | Strict | Flexible | Basic | None |
| Forbidden Patterns | 15 patterns | 5 patterns | 2 patterns | 0 patterns |
| File Path Restrictions | Strict regex | Relaxed regex | Disabled | Disabled |
| Environment Variables | 4 essential only | Blacklist mode | Passthrough | Passthrough |
| Max Arguments | 10 | 20 | 100 | Unlimited |
| Max Command Length | 1000 chars | 2000 chars | 10000 chars | Unlimited |
| Timeout Max | 10 seconds | 30 seconds | 5 minutes | Unlimited |
| Use Case | AI agents, public APIs | Development | Trusted dev | Maximum trust |
| Risk Level | Very Low | Low | Medium | High |

## Security Level Definitions

### 1. Aggressive (Current Implementation)
**Target Use Case**: Maximum security for untrusted environments, AI agents, public APIs

**Features**:
- Strict command whitelist (28 commands)
- Heavily restricted argument validation
- Comprehensive forbidden patterns
- File path sanitization
- Essential environment variables only
- Maximum timeout limits

**Configuration**: `config/validation/aggressive.yaml`
```yaml
validation_level: aggressive
description: "Maximum security - suitable for untrusted environments"
allowed_commands:
  ls:
    allowed_args: ['-l', '-a', '-la', '-h', '-R', '--help']
    description: 'List directory contents'
    max_args: 3
  cat:
    allowed_args: ['--help']
    description: 'Display file contents'
    requires_file: true
  # ... (complete current command set)
forbidden_patterns:
  - '[;&|`$(){}]'
  - '\brm\b|\bmv\b|\bcp\b|\btouch\b|\bmkdir\b|\brmdir\b'
  - '\bcurl\b|\bwget\b|\bssh\b|\bscp\b|\brsync\b|\bftp\b|\btelnet\b'
  - '\bsudo\b|\bsu\b|\bchmod\b|\bchown\b|\bmount\b|\bumount\b'
  - '\bkill\b|\bkillall\b|\bnohup\b|\bbg\b|\bfg\b|\bjobs\b'
  - '\bapt\b|\byum\b|\bpip\b|\binstall\b|\bremove\b|\bupdate\b|\bupgrade\b'
  - '\bvi\b|\bvim\b|\bnano\b|\bemacs\b|\btop\b|\bhtop\b|\bless\b|\bmore\b'
  - '\bsource\b|\b\.\b|\bexport\b|\balias\b|\bunalias\b|\bhistory\b'
  - '[<>]'
  - '[*?[\]]'
file_path_restrictions:
  enabled: true
  pattern: '^/?[a-zA-Z0-9._/-]+$'
  max_path_length: 255
environment_policy:
  mode: whitelist
  allowed_vars: ['PATH', 'HOME', 'USER', 'SHELL']
limits:
  max_arguments: 10
  max_command_length: 1000
  timeout_max: 10000
  timeout_default: 10000
```

### 2. Medium Security
**Target Use Case**: Balanced security for trusted development environments

**Features**:
- Expanded command whitelist (60+ commands)
- More flexible argument validation
- Reduced forbidden patterns (focus on critical security)
- Relaxed file path restrictions
- Development-friendly environment variables
- Extended timeout limits

**Configuration**: `config/validation/medium.yaml`
```yaml
validation_level: medium
description: "Balanced security - suitable for trusted development environments"
allowed_commands:
  # File operations (expanded)
  ls:
    allowed_args: ['-l', '-a', '-la', '-h', '-R', '-1', '-F', '-t', '-S', '--help']
    description: 'List directory contents'
  cat:
    allowed_args: ['-n', '-b', '-s', '--help']
    description: 'Display file contents'
    requires_file: true
  head:
    allowed_args: ['-n', '-c', '--help']
    description: 'Display first lines of file'
    requires_file: true
  tail:
    allowed_args: ['-n', '-c', '-f', '--help']
    description: 'Display last lines of file'
    requires_file: true
  # Text processing (expanded)
  grep:
    allowed_args: ['-n', '-i', '-r', '-v', '-c', '-l', '-w', '-x', '-E', '-F', '--help']
    description: 'Search text patterns'
    requires_file: true
  sed:
    allowed_args: ['-n', '-e', '-f', '--help']
    description: 'Stream editor'
    requires_file: true
  awk:
    allowed_args: ['-F', '-v', '--help']
    description: 'Pattern scanning and processing'
    requires_file: true
  # Development tools (expanded)
  node:
    allowed_args: ['--version', '--help', '-e', '-p', '--eval', '--print']
    description: 'Node.js runtime'
  npm:
    allowed_args: ['--version', 'list', 'ls', 'info', 'view', 'search', 'outdated', '--help']
    description: 'NPM operations'
  git:
    allowed_args: ['status', 'log', '--oneline', 'branch', 'diff', 'show', 'config', '--help']
    description: 'Git operations'
  # System tools (expanded)
  ps:
    allowed_args: ['aux', 'ef', '-u', '-p', '--help']
    description: 'Process status'
  netstat:
    allowed_args: ['-tuln', '-r', '--help']
    description: 'Network statistics'
  lsof:
    allowed_args: ['-i', '-p', '-u', '--help']
    description: 'List open files'
forbidden_patterns:
  - '[;&|`$(){}]'  # Command injection
  - '\brm\b -rf|\brm\b -fr'  # Dangerous rm operations
  - '\bsudo\b|\bsu\b'  # Privilege escalation
  - '\bkill\b -9|\bkillall\b'  # Dangerous process termination
  - '\bchmod\b 777|\bchown\b root'  # Dangerous permission changes
file_path_restrictions:
  enabled: true
  pattern: '^/?[a-zA-Z0-9._/-]+$'
  max_path_length: 1000
environment_policy:
  mode: blacklist
  blocked_vars: ['PASSWORD', 'SECRET', 'TOKEN', 'KEY', 'PRIVATE']
limits:
  max_arguments: 20
  max_command_length: 2000
  timeout_max: 30000
  timeout_default: 10000
```

### 3. Minimal Security
**Target Use Case**: Trusted development environments with basic safety nets

**Features**:
- No command whitelist (all commands allowed)
- Basic argument validation only
- Minimal forbidden patterns (only critical system protection)
- No file path restrictions
- Full environment variable passthrough
- Extended timeout limits

**Configuration**: `config/validation/minimal.yaml`
```yaml
validation_level: minimal
description: "Minimal security - basic safety nets for trusted environments"
allowed_commands: {}  # Empty = all commands allowed
forbidden_patterns:
  - '\bsudo\b rm -rf /'  # Prevent system destruction
  - '\bchmod\b 777 /'   # Prevent root permission changes
file_path_restrictions:
  enabled: false
environment_policy:
  mode: passthrough
limits:
  max_arguments: 100
  max_command_length: 10000
  timeout_max: 300000  # 5 minutes
  timeout_default: 30000
```

### 4. None (Zero Limits)
**Target Use Case**: Complete developer freedom, maximum trust environments only

**Features**:
- No command whitelist (all commands allowed)
- No argument validation
- No forbidden patterns
- No file path restrictions
- Full environment variable passthrough
- No timeout limits
- No argument count limits
- No command length limits

**Configuration**: `config/validation/none.yaml`
```yaml
validation_level: none
description: "Zero security limits - complete  freedom (maximum trust only, also UNSAFE)"
allowed_commands: {}  # Empty = all commands allowed
forbidden_patterns: []  # No restrictions
file_path_restrictions:
  enabled: false
environment_policy:
  mode: passthrough
limits:
  max_arguments: -1      # No limit (-1 = unlimited)
  max_command_length: -1 # No limit (-1 = unlimited)
  timeout_max: -1        # No limit (-1 = unlimited)
  timeout_default: -1    # No limit (-1 = unlimited)
```

## Implementation Plan

### Phase 1: Configuration Infrastructure
1. **Create YAML configuration files** for each validation level
2. **Implement configuration loader** with YAML parsing
3. **Add environment variable detection** (`COMMAND_VALIDATION`)
4. **Create validation schema** for configuration validation

### Phase 2: Refactor Validation Logic
1. **Extract hardcoded constants** into configuration-driven system
2. **Implement dynamic command validation** based on loaded config
3. **Update pattern matching** to use configurable patterns
4. **Refactor environment variable handling** for different policies

### Phase 3: Testing and Documentation
1. **Update existing tests** to work with all validation levels
2. **Create comprehensive test suite** for each validation type
3. **Add configuration validation tests** 
4. **Update documentation** with security level explanations

### Phase 4: Deployment and Migration
1. **Implement backward compatibility** (default to aggressive)
2. **Add configuration validation** at startup
3. **Provide migration guide** for existing users
4. **Add runtime configuration switching** (if needed)

## Code Structure Changes

### New Files
```
src/
├── config/
│   ├── ValidationConfig.ts          # Configuration interfaces
│   ├── ConfigLoader.ts             # YAML configuration loader
│   └── ValidationTypeDetector.ts   # Environment variable handling
├── validation/
│   ├── AggressiveValidator.ts      # Aggressive validation logic
│   ├── MediumValidator.ts         # Medium validation logic
│   ├── MinimalValidator.ts        # Minimal validation logic
│   ├── NoneValidator.ts           # Zero limits validation logic
│   └── ValidatorFactory.ts        # Validator creation based on config
```

### Modified Files
```
src/
├── index.ts                        # Remove hardcoded validation, use factory
└── types.ts                       # Add configuration interfaces
```

### Confirm need for both files
src/index_secure.ts
src/index.ts

## Security Considerations

### Migration Safety
- **Default to aggressive** if `COMMAND_VALIDATION` is not set
- **Validate configuration files** at startup
- **Fail safe** - if config loading fails, use aggressive hardcoded fallback

### Configuration Security
- **Validate YAML against schema** to prevent configuration injection
- **Sanitize configuration values** before use
- **Log security level changes** for audit trails

### Runtime Security
- **Immutable configurations** - no runtime modification
- **Configuration integrity checks** on startup
- **Clear security level indicators** in logs and UI

## Benefits

1. **Flexibility**: Users can choose appropriate security level for their environment
2. **Maintainability**: Security rules are externalized and easily updated
3. **Testability**: Each validation level can be thoroughly tested
4. **Extensibility**: New validation levels can be added easily
5. **Transparency**: Security rules are clearly documented and visible

## Migration Strategy

### For Existing Users
1. **No breaking changes** - aggressive mode remains default
2. **Opt-in configuration** - users can choose to use medium/minimal/none
3. **Clear documentation** on security implications of each level
4. **Migration tools** to help users choose appropriate level
5. **Security warnings** for minimal and none levels

### For New Users
1. **Guided setup** with security level explanation
2. **Environment-specific recommendations**
3. **Quick start configurations** for common use cases
4. **Clear warnings** about security implications of none level

## Security Warnings

### ⚠️ Minimal Level Warning
Using `minimal` validation level removes most security protections. Only use in trusted development environments where you control all input sources.

### 🚨 None Level Critical Warning
Using `none` validation level **REMOVES ALL SECURITY PROTECTIONS**. This level should **ONLY** be used in:
- Completely isolated development environments
- Local development with trusted code only
- Environments where you have complete control over all inputs
- Testing scenarios where maximum flexibility is required

**Never use `none` level with:**
- AI agents or automated systems
- Public-facing APIs
- Shared development environments
- Production systems
- Any environment processing untrusted input

## Implementation Considerations

### Validation Logic Changes
The validation system will need to handle special cases for unlimited values:
- `-1` values indicate "no limit"
- Empty arrays indicate "no restrictions"
- Validation functions must check for these special values

### Runtime Safety
Even with `none` level, the system should:
- Log all executed commands for audit purposes
- Maintain basic input sanitization to prevent crashes
- Provide clear indicators when running in unrestricted mode

## Future Enhancements

1. **Dynamic validation switching** without restart
2. **Custom validation profiles** - users can create their own YAML configs
3. **Validation rule inheritance** - extend existing levels
4. **Real-time security monitoring** and alerting
5. **Integration with external security policies**

## Conclusion

This modular approach provides a robust, flexible, and maintainable security validation system that can adapt to different use cases while maintaining the high security standards required for AI agent environments. The configuration-driven approach ensures that security policies are transparent, testable, and easily maintainable.
