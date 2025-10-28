/**
 * Unit tests for binding type definitions
 */

import { describe, expect, it } from 'vitest';
import type {
  BindingScaffoldConfig,
  BindingScaffoldResult,
  BindingTemplateVars,
  BindingType,
  BindingValidationError,
  BindingValidatorOptions,
  Phase1BindingType,
  WranglerBindingConfig,
} from '@/types/binding-types.js';
import {
  getBindingTypeName,
  getWranglerKey,
  isPhase1Binding,
} from '@/types/binding-types.js';

describe('binding-types', () => {
  describe('Type definitions', () => {
    it('should define BindingType union correctly', () => {
      const validTypes: BindingType[] = ['kv', 'd1', 'r2', 'queues', 'ai', 'vectorize', 'hyperdrive'];

      // TypeScript compilation validates the type union
      expect(validTypes).toHaveLength(7);
    });

    it('should define Phase1BindingType correctly', () => {
      const phase1Types: Phase1BindingType[] = ['kv', 'd1'];

      expect(phase1Types).toHaveLength(2);
    });

    it('should define BindingScaffoldConfig interface', () => {
      const config: BindingScaffoldConfig = {
        bindingType: 'kv',
        bindingName: 'MY_CACHE',
      };

      expect(config.bindingType).toBe('kv');
      expect(config.bindingName).toBe('MY_CACHE');
    });

    it('should define BindingScaffoldConfig with optional fields', () => {
      const configD1: BindingScaffoldConfig = {
        bindingType: 'd1',
        bindingName: 'MY_DB',
        databaseName: 'my-database',
        skipHelper: true,
        skipTypegen: true,
      };

      expect(configD1.databaseName).toBe('my-database');
      expect(configD1.skipHelper).toBe(true);
      expect(configD1.skipTypegen).toBe(true);
    });

    it('should define BindingScaffoldResult interface', () => {
      const result: BindingScaffoldResult = {
        success: true,
        bindingType: 'kv',
        bindingName: 'MY_CACHE',
        helperPath: 'src/utils/bindings/kv-my-cache.ts',
        filesCreated: ['src/utils/bindings/kv-my-cache.ts'],
        filesModified: ['wrangler.jsonc'],
        nextSteps: ['Create a KV namespace', 'Update binding ID'],
      };

      expect(result.success).toBe(true);
      expect(result.filesCreated).toHaveLength(1);
      expect(result.nextSteps).toHaveLength(2);
    });

    it('should define BindingScaffoldResult with error', () => {
      const result: BindingScaffoldResult = {
        success: false,
        bindingType: 'kv',
        bindingName: 'MY_CACHE',
        filesCreated: [],
        filesModified: [],
        nextSteps: [],
        error: 'Binding already exists',
        warnings: ['Missing anchor block'],
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Binding already exists');
      expect(result.warnings).toHaveLength(1);
    });

    it('should define BindingTemplateVars interface', () => {
      const vars: BindingTemplateVars = {
        BINDING_NAME: 'MY_CACHE',
        HELPER_CLASS_NAME: 'MyCacheKV',
        KEBAB_NAME: 'my-cache',
        CAMEL_NAME: 'myCache',
        TYPE_SUFFIX: 'KV',
      };

      expect(vars.BINDING_NAME).toBe('MY_CACHE');
      expect(vars.HELPER_CLASS_NAME).toBe('MyCacheKV');
      expect(vars.KEBAB_NAME).toBe('my-cache');
    });

    it('should define BindingTemplateVars with optional fields', () => {
      const vars: BindingTemplateVars = {
        BINDING_NAME: 'MY_DB',
        HELPER_CLASS_NAME: 'MyDbD1',
        KEBAB_NAME: 'my-db',
        CAMEL_NAME: 'myDb',
        TYPE_SUFFIX: 'D1',
        DATABASE_NAME: 'my-database',
        customField: 'custom-value',
      };

      expect(vars.DATABASE_NAME).toBe('my-database');
      expect(vars.customField).toBe('custom-value');
    });

    it('should define BindingValidationError interface', () => {
      const error: BindingValidationError = {
        message: 'Invalid binding name',
        field: 'bindingName',
        suggestion: 'Use UPPER_SNAKE_CASE format',
      };

      expect(error.message).toBe('Invalid binding name');
      expect(error.field).toBe('bindingName');
      expect(error.suggestion).toBeDefined();
    });

    it('should define BindingValidatorOptions interface', () => {
      const options: BindingValidatorOptions = {
        checkDuplicates: true,
        checkAnchors: false,
        checkProjectStructure: true,
      };

      expect(options.checkDuplicates).toBe(true);
      expect(options.checkAnchors).toBe(false);
    });

    it('should define WranglerBindingConfig interface', () => {
      const config: WranglerBindingConfig = {
        kv_namespaces: [
          { binding: 'MY_CACHE', id: 'abc123' },
        ],
        d1_databases: [
          { binding: 'MY_DB', database_name: 'my-db', database_id: 'def456' },
        ],
      };

      expect(config.kv_namespaces).toHaveLength(1);
      expect(config.d1_databases).toHaveLength(1);
    });

    it('should define WranglerBindingConfig with all binding types', () => {
      const config: WranglerBindingConfig = {
        kv_namespaces: [{ binding: 'MY_KV' }],
        d1_databases: [{ binding: 'MY_DB', database_name: 'db' }],
        r2_buckets: [{ binding: 'MY_BUCKET', bucket_name: 'bucket' }],
        queues: {
          producers: [{ binding: 'MY_QUEUE', queue: 'queue' }],
          consumers: [{ queue: 'queue', max_batch_size: 10 }],
        },
        ai: { binding: 'AI' },
        vectorize: [{ binding: 'MY_INDEX', index_name: 'index' }],
        hyperdrive: [{ binding: 'MY_HYPERDRIVE', id: 'hyp123' }],
      };

      expect(config.kv_namespaces).toBeDefined();
      expect(config.d1_databases).toBeDefined();
      expect(config.r2_buckets).toBeDefined();
      expect(config.queues).toBeDefined();
      expect(config.ai).toBeDefined();
      expect(config.vectorize).toBeDefined();
      expect(config.hyperdrive).toBeDefined();
    });
  });

  describe('isPhase1Binding()', () => {
    it('should return true for kv binding', () => {
      expect(isPhase1Binding('kv')).toBe(true);
    });

    it('should return true for d1 binding', () => {
      expect(isPhase1Binding('d1')).toBe(true);
    });

    it('should return true for r2 binding', () => {
      expect(isPhase1Binding('r2')).toBe(true);
    });

    it('should return false for queues binding', () => {
      expect(isPhase1Binding('queues')).toBe(false);
    });

    it('should return false for ai binding', () => {
      expect(isPhase1Binding('ai')).toBe(false);
    });

    it('should return false for vectorize binding', () => {
      expect(isPhase1Binding('vectorize')).toBe(false);
    });

    it('should return false for hyperdrive binding', () => {
      expect(isPhase1Binding('hyperdrive')).toBe(false);
    });
  });

  describe('getBindingTypeName()', () => {
    it('should return correct name for kv', () => {
      expect(getBindingTypeName('kv')).toBe('KV Namespace');
    });

    it('should return correct name for d1', () => {
      expect(getBindingTypeName('d1')).toBe('D1 Database');
    });

    it('should return correct name for r2', () => {
      expect(getBindingTypeName('r2')).toBe('R2 Bucket');
    });

    it('should return correct name for queues', () => {
      expect(getBindingTypeName('queues')).toBe('Queue');
    });

    it('should return correct name for ai', () => {
      expect(getBindingTypeName('ai')).toBe('Workers AI');
    });

    it('should return correct name for vectorize', () => {
      expect(getBindingTypeName('vectorize')).toBe('Vectorize Index');
    });

    it('should return correct name for hyperdrive', () => {
      expect(getBindingTypeName('hyperdrive')).toBe('Hyperdrive Config');
    });
  });

  describe('getWranglerKey()', () => {
    it('should return correct wrangler key for kv', () => {
      expect(getWranglerKey('kv')).toBe('kv_namespaces');
    });

    it('should return correct wrangler key for d1', () => {
      expect(getWranglerKey('d1')).toBe('d1_databases');
    });

    it('should return correct wrangler key for r2', () => {
      expect(getWranglerKey('r2')).toBe('r2_buckets');
    });

    it('should return correct wrangler key for queues', () => {
      expect(getWranglerKey('queues')).toBe('queues');
    });

    it('should return correct wrangler key for ai', () => {
      expect(getWranglerKey('ai')).toBe('ai');
    });

    it('should return correct wrangler key for vectorize', () => {
      expect(getWranglerKey('vectorize')).toBe('vectorize');
    });

    it('should return correct wrangler key for hyperdrive', () => {
      expect(getWranglerKey('hyperdrive')).toBe('hyperdrive');
    });
  });

  describe('Type safety and compilation', () => {
    it('should enforce Phase1BindingType constraint', () => {
      const phase1: Phase1BindingType = 'kv';
      const allBindings: BindingType = phase1;

      expect(allBindings).toBe('kv');
    });

    it('should allow BindingType to include Phase1BindingType', () => {
      const binding: BindingType = 'kv' as Phase1BindingType;

      expect(binding).toBe('kv');
    });

    it('should support all BindingScaffoldConfig field combinations', () => {
      const configs: BindingScaffoldConfig[] = [
        { bindingType: 'kv', bindingName: 'MY_CACHE' },
        { bindingType: 'd1', bindingName: 'MY_DB', databaseName: 'db' },
        { bindingType: 'r2', bindingName: 'MY_BUCKET', bucketName: 'bucket' },
        { bindingType: 'kv', bindingName: 'CACHE', skipHelper: true },
        { bindingType: 'd1', bindingName: 'DB', skipTypegen: true },
      ];

      expect(configs).toHaveLength(5);
      configs.forEach((config) => {
        expect(config.bindingType).toBeDefined();
        expect(config.bindingName).toBeDefined();
      });
    });

    it('should support partial BindingScaffoldResult fields', () => {
      const minimalResult: BindingScaffoldResult = {
        success: true,
        bindingType: 'kv',
        bindingName: 'CACHE',
        filesCreated: [],
        filesModified: [],
        nextSteps: [],
      };

      const fullResult: BindingScaffoldResult = {
        ...minimalResult,
        helperPath: 'path/to/helper.ts',
        error: 'Some error',
        warnings: ['Warning 1', 'Warning 2'],
        metadata: { key: 'value' },
      };

      expect(minimalResult.success).toBe(true);
      expect(fullResult.helperPath).toBeDefined();
      expect(fullResult.warnings).toHaveLength(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty arrays in BindingScaffoldResult', () => {
      const result: BindingScaffoldResult = {
        success: true,
        bindingType: 'kv',
        bindingName: 'CACHE',
        filesCreated: [],
        filesModified: [],
        nextSteps: [],
      };

      expect(result.filesCreated).toHaveLength(0);
      expect(result.filesModified).toHaveLength(0);
      expect(result.nextSteps).toHaveLength(0);
    });

    it('should handle optional fields as undefined', () => {
      const config: BindingScaffoldConfig = {
        bindingType: 'kv',
        bindingName: 'CACHE',
      };

      expect(config.databaseName).toBeUndefined();
      expect(config.bucketName).toBeUndefined();
      expect(config.skipHelper).toBeUndefined();
      expect(config.skipTypegen).toBeUndefined();
    });

    it('should handle empty metadata in BindingScaffoldResult', () => {
      const result: BindingScaffoldResult = {
        success: true,
        bindingType: 'kv',
        bindingName: 'CACHE',
        filesCreated: [],
        filesModified: [],
        nextSteps: [],
        metadata: {},
      };

      expect(result.metadata).toEqual({});
    });

    it('should handle template vars with all uppercase binding names', () => {
      const vars: BindingTemplateVars = {
        BINDING_NAME: 'MY_LONG_CACHE_NAME',
        HELPER_CLASS_NAME: 'MyLongCacheNameKV',
        KEBAB_NAME: 'my-long-cache-name',
        CAMEL_NAME: 'myLongCacheName',
        TYPE_SUFFIX: 'KV',
      };

      expect(vars.BINDING_NAME).toMatch(/^[A-Z_]+$/);
      expect(vars.KEBAB_NAME).toMatch(/^[a-z-]+$/);
    });
  });
});
