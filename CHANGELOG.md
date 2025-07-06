# Changelog

## [0.3.0]

### Added
- **Modular Command Validation System**: Replaced hardcoded aggressive security with flexible, configuration-driven validation
  - Support for four validation levels: `aggressive`, `medium`, `minimal`, `none`
  - Environment variable configuration via `COMMAND_VALIDATION`
  - YAML-based configuration files for each validation level
  - Custom validation support via user-defined YAML files
- **Comprehensive Validator Architecture**: 
  - BaseValidator abstract class with common validation logic
  - Specialized validators for each security level
  - ValidatorFactory for dynamic validator instantiation
- **Configuration Infrastructure**:
  - ConfigLoader with YAML parsing and schema validation
  - ValidationTypeDetector for environment variable detection
  - Robust error handling with hardcoded fallbacks
- **Security Level Flexibility**:
  - Aggressive: 28 whitelisted commands (maximum security)
  - Medium: Extended command set for development environments
  - Minimal: Basic validation with no command whitelist
  - None: No validation for maximum trust environments
  - Custom: User-defined security policies

### Changed
- **Logging System**: All log messages now use stderr instead of stdout to prevent MCP JSON-RPC communication interference
- **Validation Logic**: Extracted from hardcoded constants to configuration-driven system
- **Command Processing**: Enhanced argument validation and sanitization per security level

### Fixed
- **MCP Communication**: Resolved "Failed to parse message" errors by redirecting log output to stderr
- **Configuration Loading**: Improved error handling and fallback mechanisms

### Technical Details
- Added comprehensive TypeScript interfaces for configuration structure
- Implemented dynamic validator selection based on security characteristics
- Enhanced test coverage for all validation levels
- Maintained backward compatibility with existing deployments

## [0.2.0]

### Added
- **Automatic Boundary Directory Enforcement**: Server now automatically starts in a secure boundary directory
  - Default boundary directory is `/tmp`
  - Can be overridden with `BOUNDARY_DIR` environment variable
  - Process automatically changes to boundary directory on startup
  - Safe fallback behavior if boundary directory doesn't exist (warns but continues)
  - All directory operations remain restricted to within the boundary
- **Boundary Escape Override**: New `BOUNDARY_ESCAPE` environment variable
  - Set `BOUNDARY_ESCAPE=true` to disable boundary enforcement entirely
  - When enabled, server starts in current directory and allows unrestricted navigation
  - Provides flexibility for advanced users while maintaining security by default
- Unit tests for boundary directory enforcement functionality
- Unit tests for boundary escape functionality

### Changed
- Server working directory is now automatically set to boundary directory at startup
- Improved security posture by ensuring operations start in controlled environment

### Technical Details
- Added startup logic in `getBoundaryDir()` function to enforce working directory
- Enhanced test suite to validate boundary directory behavior
- Handles filesystem symlinks properly (e.g., `/tmp` → `/private/tmp` on macOS)

## Previous Versions
- See git history for previous changes before this changelog was introduced
