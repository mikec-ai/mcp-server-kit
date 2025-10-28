/**
 * Binding Types - Type definitions for Cloudflare binding scaffolding
 *
 * This module defines types for scaffolding Cloudflare Workers bindings
 * (KV, D1, R2, Queues, etc.) in MCP servers.
 */

/**
 * Supported Cloudflare binding types
 *
 * Phase 1: kv, d1, r2 (implemented)
 * Phase 2: ai (implemented)
 * Phase 3: queues
 * Phase 4: vectorize, hyperdrive
 */
export type BindingType = 'kv' | 'd1' | 'r2' | 'queues' | 'ai' | 'vectorize' | 'hyperdrive';

/**
 * Phase 1 binding types (storage primitives)
 */
export type Phase1BindingType = Extract<BindingType, 'kv' | 'd1' | 'r2'>;

/**
 * Phase 2 binding types (AI/ML primitives)
 */
export type Phase2BindingType = Extract<BindingType, 'ai'>;

/**
 * Configuration for scaffolding a Cloudflare binding
 */
export interface BindingScaffoldConfig {
  /**
   * Type of binding to scaffold
   */
  bindingType: BindingType;

  /**
   * Name of the binding in UPPER_SNAKE_CASE format
   * Example: MY_CACHE, MY_DATABASE, USER_DATA
   *
   * Must match pattern: /^[A-Z][A-Z0-9_]*$/
   */
  bindingName: string;

  /**
   * Database name for D1 bindings (optional)
   * If not provided, will be generated from bindingName
   * Example: "my-database" for MY_DATABASE binding
   */
  databaseName?: string;

  /**
   * Bucket name for R2 bindings (optional, Phase 2)
   * If not provided, will be generated from bindingName
   */
  bucketName?: string;

  /**
   * Whether to skip helper generation (advanced use case)
   * Default: false
   */
  skipHelper?: boolean;

  /**
   * Whether to skip running cf-typegen after config update
   * Default: false (will run cf-typegen)
   */
  skipTypegen?: boolean;
}

/**
 * Result of binding scaffolding operation
 */
export interface BindingScaffoldResult {
  /**
   * Whether the scaffolding operation succeeded
   */
  success: boolean;

  /**
   * Type of binding that was scaffolded
   */
  bindingType: BindingType;

  /**
   * Name of the binding that was created
   */
  bindingName: string;

  /**
   * Path to the generated helper file (if generated)
   */
  helperPath?: string;

  /**
   * Paths to all files that were created
   */
  filesCreated: string[];

  /**
   * Paths to all files that were modified
   */
  filesModified: string[];

  /**
   * Next steps for the user to complete the setup
   */
  nextSteps: string[];

  /**
   * Error message if scaffolding failed
   */
  error?: string;

  /**
   * Warning messages (non-fatal issues)
   */
  warnings?: string[];

  /**
   * Additional metadata specific to the binding type
   */
  metadata?: Record<string, any>;
}

/**
 * Template variables for Handlebars templates
 */
export interface BindingTemplateVars {
  /**
   * Original binding name in UPPER_SNAKE_CASE
   * Example: MY_CACHE
   */
  BINDING_NAME: string;

  /**
   * Helper class name in PascalCase
   * Example: MyCacheKV, MyDatabaseD1
   */
  HELPER_CLASS_NAME: string;

  /**
   * Kebab-case name for file paths
   * Example: my-cache, my-database
   */
  KEBAB_NAME: string;

  /**
   * Camel-case name for variable names
   * Example: myCache, myDatabase
   */
  CAMEL_NAME: string;

  /**
   * Type suffix (KV, D1, R2, etc.)
   */
  TYPE_SUFFIX: string;

  /**
   * Database name for D1 bindings (optional)
   */
  DATABASE_NAME?: string;

  /**
   * Bucket name for R2 bindings (optional)
   */
  BUCKET_NAME?: string;

  /**
   * Additional binding-specific variables
   */
  [key: string]: string | undefined;
}

/**
 * Validation error for binding configuration
 */
export interface BindingValidationError {
  /**
   * Error message
   */
  message: string;

  /**
   * Field that caused the error
   */
  field?: string;

  /**
   * Suggested fix for the error
   */
  suggestion?: string;
}

/**
 * Options for binding validator
 */
export interface BindingValidatorOptions {
  /**
   * Whether to check for duplicate bindings
   * Default: true
   */
  checkDuplicates?: boolean;

  /**
   * Whether to validate anchor presence
   * Default: true
   */
  checkAnchors?: boolean;

  /**
   * Whether to validate project structure
   * Default: true
   */
  checkProjectStructure?: boolean;
}

/**
 * Binding configuration in wrangler.jsonc
 */
export interface WranglerBindingConfig {
  /**
   * KV namespace bindings
   */
  kv_namespaces?: Array<{
    binding: string;
    id?: string;
    preview_id?: string;
  }>;

  /**
   * D1 database bindings
   */
  d1_databases?: Array<{
    binding: string;
    database_name: string;
    database_id?: string;
    preview_database_id?: string;
  }>;

  /**
   * R2 bucket bindings (Phase 2)
   */
  r2_buckets?: Array<{
    binding: string;
    bucket_name: string;
    preview_bucket_name?: string;
  }>;

  /**
   * Queue bindings (Phase 2)
   */
  queues?: {
    producers?: Array<{
      binding: string;
      queue: string;
    }>;
    consumers?: Array<{
      queue: string;
      max_batch_size?: number;
      max_batch_timeout?: number;
    }>;
  };

  /**
   * Workers AI binding (Phase 3)
   */
  ai?: {
    binding: string;
  };

  /**
   * Vectorize bindings (Phase 3)
   */
  vectorize?: Array<{
    binding: string;
    index_name: string;
  }>;

  /**
   * Hyperdrive bindings (Phase 4)
   */
  hyperdrive?: Array<{
    binding: string;
    id: string;
  }>;
}

/**
 * Type guard to check if a binding type is implemented in Phase 1
 */
export function isPhase1Binding(type: BindingType): type is Phase1BindingType {
  return type === 'kv' || type === 'd1' || type === 'r2';
}

/**
 * Type guard to check if a binding type is implemented in Phase 2
 */
export function isPhase2Binding(type: BindingType): type is Phase2BindingType {
  return type === 'ai';
}

/**
 * Get human-readable name for binding type
 */
export function getBindingTypeName(type: BindingType): string {
  const names: Record<BindingType, string> = {
    kv: 'KV Namespace',
    d1: 'D1 Database',
    r2: 'R2 Bucket',
    queues: 'Queue',
    ai: 'Workers AI',
    vectorize: 'Vectorize Index',
    hyperdrive: 'Hyperdrive Config',
  };
  return names[type];
}

/**
 * Get wrangler.jsonc key for binding type
 */
export function getWranglerKey(type: BindingType): string {
  const keys: Record<BindingType, string> = {
    kv: 'kv_namespaces',
    d1: 'd1_databases',
    r2: 'r2_buckets',
    queues: 'queues',
    ai: 'ai',
    vectorize: 'vectorize',
    hyperdrive: 'hyperdrive',
  };
  return keys[type];
}
