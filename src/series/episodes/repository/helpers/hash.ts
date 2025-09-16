/**
 * Hash utilities for cursor filter hash generation.
 * Uses Deno's std crypto library for robust, collision-resistant hashing.
 */

import { crypto } from '@std/crypto';

/**
 * Hash method preference order:
 * 1. SHA-256 (async) - Most robust, cryptographically secure
 * 2. SHA-256 (sync) - Same security, synchronous operation
 * 3. 64-bit hash - Good compromise, custom implementation
 * 4. 32-bit hash - Legacy fallback
 */
export type HashMethod = 'sha256' | 'sha256-sync' | 'hash64' | 'hash32';

/**
 * Configuration for hash method selection
 */
export interface HashConfig {
  method?: HashMethod;
  /** Force synchronous operation (uses sha256-sync instead of sha256) */
  sync?: boolean;
}

/**
 * 64-bit hash implementation using two 32-bit values
 * Based on the FNV-1a algorithm for better distribution
 */
const hash64 = (input: string): string => {
  // FNV-1a 64-bit constants (split into two 32-bit parts)
  const FNV_PRIME_LOW = 0x01000193;
  const FNV_PRIME_HIGH = 0x00000100;
  const FNV_OFFSET_LOW = 0x811c9dc5;
  const FNV_OFFSET_HIGH = 0xcbf29ce4;

  let hashLow = FNV_OFFSET_LOW;
  let hashHigh = FNV_OFFSET_HIGH;

  for (let i = 0; i < input.length; i++) {
    const byte = input.charCodeAt(i);

    // XOR with byte
    hashLow ^= byte;

    // Multiply by FNV prime (64-bit multiply split into 32-bit operations)
    const lowProduct = Math.imul(hashLow, FNV_PRIME_LOW);
    const highProduct = Math.imul(hashLow, FNV_PRIME_HIGH) +
      Math.imul(hashHigh, FNV_PRIME_LOW);

    hashLow = lowProduct >>> 0; // Ensure unsigned 32-bit
    hashHigh = (highProduct + (lowProduct >>> 32)) >>> 0;
  }

  // Combine into hex string
  const lowHex = (hashLow >>> 0).toString(16).padStart(8, '0');
  const highHex = (hashHigh >>> 0).toString(16).padStart(8, '0');

  return `v2:${highHex}${lowHex}`;
};

/**
 * Legacy 32-bit hash (current implementation)
 * Kept for backwards compatibility
 */
const hash32 = (input: string): string => {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(31, h) + input.charCodeAt(i) | 0;
  }
  return `v1:${Math.abs(h)}`;
};

/**
 * SHA-256 hash using Deno's std crypto (async)
 * Most robust and cryptographically secure
 */
const hashSHA256 = async (input: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  // Take first 8 bytes (64 bits) and convert to hex for reasonable cursor size
  const hex = Array.from(hashArray.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `v4:${hex}`;
};

/**
 * SHA-256 hash using Deno's std crypto (sync)
 * Same security as async version, but synchronous
 */
const hashSHA256Sync = (input: string): string => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = crypto.subtle.digestSync('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  // Take first 8 bytes (64 bits) and convert to hex
  const hex = Array.from(hashArray.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `v4:${hex}`;
};

/**
 * Generate a hash for the given input with fallback strategy
 */
export const generateHash = async (
  input: string,
  config: HashConfig = {},
): Promise<string> => {
  const method = config.method || 'sha256';
  const forceSync = config.sync || false;

  // If sync is forced or method is explicitly synchronous, use sync methods
  if (forceSync || method === 'sha256-sync') {
    return generateHashSync(
      input,
      method === 'sha256' ? 'sha256-sync' : method,
    );
  }

  // Try async methods first, with fallbacks
  try {
    if (method === 'sha256') {
      return await hashSHA256(input);
    } else {
      return generateHashSync(input, method);
    }
  } catch (_error) {
    // Fallback to synchronous SHA-256
    return hashSHA256Sync(input);
  }
};

/**
 * Synchronous hash generation using Deno std crypto
 * For use cases where async is not possible
 */
export const generateHashSync = (
  input: string,
  method: HashMethod = 'sha256-sync',
): string => {
  if (method === 'sha256-sync') {
    return hashSHA256Sync(input);
  } else if (method === 'hash64') {
    return hash64(input);
  } else if (method === 'hash32') {
    return hash32(input);
  } else {
    return hashSHA256Sync(input);
  }
};

/**
 * Test hash collision resistance by generating hashes for similar inputs
 * Useful for development and testing
 */
export const testHashCollisions = async (
  inputs: string[],
  config?: HashConfig,
): Promise<{ collisions: number; uniqueHashes: number; method: string }> => {
  const hashes = new Map<string, string[]>();

  for (const input of inputs) {
    const hash = await generateHash(input, config);
    if (!hashes.has(hash)) {
      hashes.set(hash, []);
    }
    hashes.get(hash)!.push(input);
  }

  const collisions = Array.from(hashes.values())
    .filter((inputs) => inputs.length > 1)
    .reduce((acc, inputs) => acc + inputs.length - 1, 0);

  const sampleHash = await generateHash(inputs[0] || 'test', config);
  const method = sampleHash.split(':')[0] || 'unknown';

  return {
    collisions,
    uniqueHashes: hashes.size,
    method,
  };
};
