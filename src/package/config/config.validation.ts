/**
 * Configuration payload validation for navigation entries.
 *
 * These guards run on the transformed config before the response is
 * returned. They catch duplicate, malformed, or unstable navigation
 * payloads at the source so downstream consumers (edge-graphql,
 * anitrend-v2) never receive invalid data.
 */

import type { Config } from './config.types.ts';

/** Structured validation failure for a navigation payload. */
export interface NavigationValidationError {
  /** Human-readable description of the problem. */
  message: string;
  /** The field or entry key associated with the error, if known. */
  field?: string;
}

/**
 * Validate the navigation array produced by the config transformer.
 *
 * Returns an empty array when the payload is safe to serve.
 * Returns a non-empty array of errors when the payload must be
 * rejected.
 *
 * Order of checks:
 *   1. Required field presence (key, destination, i18n, icon, group.i18n)
 *   2. Key uniqueness
 *   3. Destination uniqueness (no allowlist needed for current entries;
 *      destinations are expected to be unique)
 */
export function validateNavigation(
  navigation: Config['navigation'],
): NavigationValidationError[] {
  const errors: NavigationValidationError[] = [];

  if (!navigation || navigation.length === 0) {
    errors.push({
      message: 'Config navigation array is empty or missing',
    });
    return errors;
  }

  for (let i = 0; i < navigation.length; i++) {
    const item = navigation[i];
    const prefix = `navigation[${i}]`;

    if (!item.key || item.key.length === 0) {
      errors.push({
        message: `${prefix}.key is empty or missing`,
        field: `${prefix}.key`,
      });
    }

    if (!item.destination || item.destination.length === 0) {
      errors.push({
        message: `${prefix}.destination is empty or missing`,
        field: `${prefix}.destination`,
      });
    }

    if (!item.i18n || item.i18n.length === 0) {
      errors.push({
        message: `${prefix}.i18n is empty or missing`,
        field: `${prefix}.i18n`,
      });
    }

    if (!item.icon || item.icon.length === 0) {
      errors.push({
        message: `${prefix}.icon is empty or missing`,
        field: `${prefix}.icon`,
      });
    }

    if (!item.group?.i18n || item.group.i18n.length === 0) {
      errors.push({
        message: `${prefix}.group.i18n is empty or missing`,
        field: `${prefix}.group.i18n`,
      });
    }
  }

  // Duplicate key check — keys are the stable identity for persistence
  const keySet = new Set<string>();
  for (const item of navigation) {
    if (item.key && keySet.has(item.key)) {
      errors.push({
        message: `Duplicate navigation key: "${item.key}"`,
        field: 'key',
      });
    }
    if (item.key) keySet.add(item.key);
  }

  // Duplicate destination check — destinations should be unique per entry
  const destSet = new Set<string>();
  for (const item of navigation) {
    if (item.destination && destSet.has(item.destination)) {
      errors.push({
        message: `Duplicate navigation destination: "${item.destination}"`,
        field: 'destination',
      });
    }
    if (item.destination) destSet.add(item.destination);
  }

  return errors;
}
