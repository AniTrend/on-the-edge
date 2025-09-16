import { env } from '../../../../common/core/env.ts';
import type { HashConfig, HashMethod } from './hash.ts';

/**
 * Get hash configuration from environment variables
 */
export const getHashConfig = (): HashConfig => {
  try {
    // CURSOR_HASH_METHOD: sha256|sha256-sync|hash64|hash32
    const method = env<string>('CURSOR_HASH_METHOD') as HashMethod;

    // Validate method
    if (!['sha256', 'sha256-sync', 'hash64', 'hash32'].includes(method)) {
      console.warn(`Invalid CURSOR_HASH_METHOD: ${method}. Using default.`);
      return { method: 'sha256-sync' }; // Conservative default (sync SHA-256)
    }

    return { method };
  } catch (_error) {
    // Environment variable not set, use safe default
    return { method: 'sha256-sync' };
  }
}; /**
 * Get whether to force synchronous hashing
 * Useful for environments where async crypto is not available
 */

export const shouldForceSync = (): boolean => {
  try {
    const forceSync = env<string>('CURSOR_HASH_FORCE_SYNC');
    return forceSync === 'true' || forceSync === '1';
  } catch (_error) {
    return false;
  }
};
