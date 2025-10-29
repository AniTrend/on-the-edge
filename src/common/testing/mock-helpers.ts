import { spy } from '@std/testing/mock';
import type { Logger } from '@onjara/optic';
import type { LoggerService } from '@scope/logger';
import type { ExperimentService } from '@scope/experiment';
import type { CacheService } from '@scope/cache';

/**
 * Create a mock logger service for testing.
 * Returns a logger with spied methods that can be inspected using assertSpyCalls.
 *
 * @example
 * ```typescript
 * const { logger, spies } = createMockLogger();
 * logger.instance.info('test message');
 * assertSpyCalls(spies.info, 1);
 * ```
 */
export function createMockLogger() {
  const warn = spy((_msg?: unknown, _meta?: unknown) => {});
  const debug = spy((_msg?: unknown, _meta?: unknown) => {});
  const info = spy((_msg?: unknown, _meta?: unknown) => {});
  const error = spy((_msg?: unknown, _meta?: unknown) => {});
  const mark = spy((_name: string, _detail?: unknown) => {});
  const measure = spy((_name: string, _start?: string, _end?: string) => {});
  const shutdown = spy(async () => {});

  // If any bootstrap code calls fluent config, make them no-ops that return self.
  const chainable = {
    withMinLogLevel: (_: unknown) => loggerLike,
    addStream: (_: unknown) => loggerLike,
    profilingConfig: () => loggerLike,
    enabled: (_: boolean) => loggerLike,
    captureMemory: (_: boolean) => loggerLike,
    withLogLevel: (_: unknown) => loggerLike,
  };

  const loggerLike = {
    warn,
    debug,
    info,
    error,
    mark,
    measure,
    shutdown,
    ...chainable,
  } as unknown as Logger;

  const serviceLike = {
    instance: loggerLike,
  };

  return {
    logger: serviceLike as unknown as LoggerService,
    spies: { warn, debug, info, error, mark, measure, shutdown },
  };
}

/**
 * Create a mock experiment service with configurable feature flags.
 *
 * @param flags - Record of feature flags and their values
 *
 * @example
 * ```typescript
 * const experiment = createMockExperiment({
 *   'news-refactor-api': true,
 *   'enable-analytics': false,
 *   'episodes-xem-normalize': 0.8,
 * });
 *
 * experiment.isEnabled('news-refactor-api'); // true
 * experiment.getFeatureValue('episodes-xem-normalize', 0.5); // 0.8
 * ```
 */
export function createMockExperiment(
  flags: Record<string, unknown> = {},
): ExperimentService {
  const isEnabledSpy = spy((key: string) => Boolean(flags[key]));
  const isDisabledSpy = spy((key: string) => !flags[key]);
  const getFeatureValueSpy = spy((key: string, defaultValue: unknown) => {
    return flags[key] !== undefined ? flags[key] : defaultValue;
  });
  const invokeSpy = spy((action: () => unknown) => action());
  const initSpy = spy(async () => ({} as never));
  const destroySpy = spy(() => {});
  const getInstanceSpy = spy(() => ({} as never));
  const onAppCloseSpy = spy(() => {});

  return {
    isEnabled: isEnabledSpy,
    isDisabled: isDisabledSpy,
    getFeatureValue: getFeatureValueSpy,
    invoke: invokeSpy,
    init: initSpy,
    destroy: destroySpy,
    getInstance: getInstanceSpy,
    onAppClose: onAppCloseSpy,
  } as unknown as ExperimentService;
}

/**
 * Create a mock cache service with in-memory storage.
 * Implements basic cache operations with optional TTL support.
 *
 * @example
 * ```typescript
 * const cache = createMockCache();
 * await cache.set('key1', { data: 'value' });
 * const value = await cache.get('key1'); // { data: 'value' }
 * ```
 */
export function createMockCache() {
  const cache = new Map<string, { value: unknown; expiresAt: number }>();

  const getSpy = spy(async <T>(key: string): Promise<T | null> => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.value as T;
  });

  const setSpy = spy(
    async <T>(
      key: string,
      value: T,
      options?: { ttl?: number },
    ): Promise<void> => {
      const ttl = (options?.ttl || 60) * 1000; // Convert to ms
      cache.set(key, {
        value,
        expiresAt: Date.now() + ttl,
      });
    },
  );

  const delSpy = spy(async (key: string): Promise<void> => {
    cache.delete(key);
  });

  const onAppCloseSpy = spy(() => {});

  return {
    service: {
      get: getSpy,
      set: setSpy,
      del: delSpy,
      onAppClose: onAppCloseSpy,
    } as unknown as CacheService,
    spies: {
      get: getSpy,
      set: setSpy,
      del: delSpy,
      onAppClose: onAppCloseSpy,
    },
    cache, // Expose internal cache for inspection if needed
  };
}
