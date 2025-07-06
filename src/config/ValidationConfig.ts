export interface CommandConfig {
  allowed_args: string[];
  description: string;
  requires_file?: boolean;
  max_args?: number;
  environment_vars?: string[];
}

export interface FilePathRestrictions {
  enabled: boolean;
  pattern?: string;
  max_path_length?: number;
}

export interface EnvironmentPolicy {
  mode: 'whitelist' | 'blacklist' | 'passthrough';
  allowed_vars?: string[];
  blocked_vars?: string[];
}

export interface SecurityLimits {
  max_arguments: number;
  max_command_length: number;
  timeout_max: number;
  timeout_default: number;
}

export interface ValidationConfig {
  validation_level: 'aggressive' | 'medium' | 'minimal' | 'none';
  description: string;
  allowed_commands: Record<string, CommandConfig>;
  forbidden_patterns: string[];
  file_path_restrictions: FilePathRestrictions;
  environment_policy: EnvironmentPolicy;
  limits: SecurityLimits;
}

export type ValidationLevel = 'aggressive' | 'medium' | 'minimal' | 'none';
