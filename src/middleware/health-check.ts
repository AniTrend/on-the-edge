import type { HttpContext } from '@danet/core';

export const HEALTH_PATH = '/v1/health';

/**
 * Narrow bypass predicate shared by the global middleware chain: only
 * GET requests to the exact health path are exempted. Header
 * validation and experiment attribute handling for all other routes
 * remain unchanged.
 */
export const isHealthCheck = (context: HttpContext): boolean => {
  return context.req.raw.method === 'GET' &&
    context.req.path === HEALTH_PATH;
};
