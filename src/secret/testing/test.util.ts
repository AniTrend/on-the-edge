import type { SecretService } from '../secret.service.ts';
import type { Environment } from '../secret.types.ts';

export const createSecretStub = (
  overrides: Record<string, string>,
): SecretService => {
  return {
    get: (key: string) => {
      if (!(key in overrides)) {
        throw new Error(`Missing key ${key}`);
      }
      return overrides[key] as never;
    },
    requestTimeout: () => {
      const raw = overrides.CLIENT_REQUEST_TIMEOUT ?? '5000';
      return Number.parseInt(raw, 10);
    },
    environment: () => {
      return (overrides.DENO_ENV ?? 'test') as Environment;
    },
    isDevelopment: () => {
      const env = overrides.DENO_ENV ?? 'test';
      return env === 'development';
    },
  } as SecretService;
};
