import { spy } from '@std/testing/mock';
import type { LoggerService } from '../logger.service.ts';
import { Logger } from '@onjara/optic';

// Minimal service-like logger you can pass into ArmService
export function createLoggerStub() {
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

  // Service-shaped wrapper exactly for: this.logger.instance.warn(...)
  const serviceLike = {
    instance: loggerLike,
  };

  return {
    logger: serviceLike as unknown as LoggerService, // cast to your LoggerService type if you want
    spies: { warn, debug, info, error, mark, measure, shutdown },
  };
}
