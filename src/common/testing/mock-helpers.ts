import { spy } from '@std/testing/mock';
import type { Logger } from '@onjara/optic';
import type { LoggerService } from '@scope/logger';
import type { ExperimentService } from '@scope/experiment';
import type { CacheService } from '@scope/cache';
import type { Environment, SecretService } from '@scope/secret';
import type { Mocked } from './types.ts';

// Logger ------------------------------------------------------------------
export function createMockLogger() {
  const warn = spy((_msg?: unknown, _meta?: unknown) => {});
  const debug = spy((_msg?: unknown, _meta?: unknown) => {});
  const info = spy((_msg?: unknown, _meta?: unknown) => {});
  const error = spy((_msg?: unknown, _meta?: unknown) => {});
  const mark = spy((_name: string, _detail?: unknown) => {});
  const measure = spy((_name: string, _start?: string, _end?: string) => {});
  const shutdown = spy(async () => {});

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
  const serviceLike = { instance: loggerLike };

  return {
    logger: serviceLike as unknown as LoggerService, // backward compat
    service: serviceLike as unknown as LoggerService,
    spies: { warn, debug, info, error, mark, measure, shutdown },
  } as unknown as
    & Mocked<LoggerService, {
      warn: typeof warn;
      debug: typeof debug;
      info: typeof info;
      error: typeof error;
      mark: typeof mark;
      measure: typeof measure;
      shutdown: typeof shutdown;
    }>
    & { logger: LoggerService };
}

// Experiment ---------------------------------------------------------------
export function createMockExperiment(
  flags: Record<string, unknown> = {},
): ExperimentService {
  const isEnabledSpy = spy((key: string) => Boolean(flags[key]));
  const isDisabledSpy = spy((key: string) => !flags[key]);
  const getFeatureValueSpy = spy((key: string, defaultValue: unknown) =>
    flags[key] !== undefined ? flags[key] : defaultValue
  );
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

export function createMockExperimentMocked(
  flags: Record<string, unknown> = {},
) {
  const service = createMockExperiment(flags) as ExperimentService;
  const spies = {
    isEnabled: service.isEnabled,
    isDisabled: service.isDisabled,
    getFeatureValue: service.getFeatureValue,
    invoke: service.invoke,
    init: service.init,
    destroy: service.destroy,
    getInstance: service.getInstance,
    onAppClose: service.onAppClose,
  } as const;
  return { service, spies } as Mocked<ExperimentService, typeof spies>;
}

// Cache -------------------------------------------------------------------
export function createMockCache() {
  const now = () => Date.now();
  const store = new Map<string, { value: unknown; expiresAt: number }>();
  const prune = (k: string) => {
    const e = store.get(k);
    if (!e) return;
    if (now() >= e.expiresAt) store.delete(k);
  };
  const _get = async <T>(key: string): Promise<T | null> => {
    prune(key);
    const e = store.get(key);
    return e ? (e.value as T) : null;
  };
  const _set = async <T>(key: string, value: T, opts?: { ttl?: number }) => {
    const ttl = opts?.ttl;
    const expiresAt = ttl !== undefined
      ? now() + ttl * 1000
      : Number.POSITIVE_INFINITY;
    store.set(key, { value, expiresAt });
  };
  const _del = async (key: string) => {
    store.delete(key);
  };
  const _has = async (key: string) => {
    prune(key);
    return store.has(key);
  };
  const get = spy(_get);
  const set = spy(_set);
  const del = spy(_del);
  const has = spy(_has);
  const service = {
    get: get as typeof _get,
    set: set as typeof _set,
    del: del as typeof _del,
    has: has as typeof _has,
  } as unknown as CacheService;
  const reset = () => store.clear();
  return {
    service,
    spies: { get, set, del, has },
    state: { cache: store },
    cache: store,
    reset,
  } as
    & Mocked<
      CacheService,
      { get: typeof get; set: typeof set; del: typeof del; has: typeof has },
      { cache: Map<string, { value: unknown; expiresAt: number }> }
    >
    & { cache: Map<string, { value: unknown; expiresAt: number }> };
}

// Secret -------------------------------------------------------------------
/**
 * Create a mock secret service with configurable key-value overrides.
 * @param overrides - Record of environment variable keys and their values
 */
export function createMockSecret(overrides: Record<string, string> = {}) {
  const _get = <T>(key: string): T => {
    if (!(key in overrides)) {
      throw new Error(`Missing key ${key}`);
    }
    return overrides[key] as T;
  };
  const _requestTimeout = () => {
    const raw = overrides.CLIENT_REQUEST_TIMEOUT ?? '5000';
    return Number.parseInt(raw, 10);
  };
  const _environment = () => {
    return (overrides.DENO_ENV ?? 'test') as Environment;
  };
  const _isDevelopment = () => {
    const env = overrides.DENO_ENV ?? 'test';
    return env === 'development';
  };
  const _isCI = () => {
    const env = overrides.DENO_ENV ?? 'false';
    return env === 'true';
  };

  const getSpy = spy(_get);
  const requestTimeoutSpy = spy(_requestTimeout);
  const environmentSpy = spy(_environment);
  const isDevelopmentSpy = spy(_isDevelopment);
  const isCiSpy = spy(_isCI);

  const service: SecretService = {
    get: getSpy as typeof _get,
    requestTimeout: requestTimeoutSpy,
    environment: environmentSpy,
    isDevelopment: isDevelopmentSpy,
    isCI: isCiSpy,
  } as SecretService;

  return {
    service,
    spies: {
      get: getSpy,
      requestTimeout: requestTimeoutSpy,
      environment: environmentSpy,
      isDevelopment: isDevelopmentSpy,
    },
  } as Mocked<SecretService, {
    get: typeof getSpy;
    requestTimeout: typeof requestTimeoutSpy;
    environment: typeof environmentSpy;
    isDevelopment: typeof isDevelopmentSpy;
  }>;
}
