import { Injectable } from '@danet/core';
import { MissingKeyError, NoVariablesFoundError } from './secret.errors.ts';
import { Environment } from './secret.types.ts';

const DEFAULT_REQUEST_TIMEOUT = 5000;
const MAX_REQUEST_TIMEOUT = 30_000;

export interface ISecretService {
  get<T>(key: string): T;
  requestTimeout(): number;
  environment(): Environment;
  isDevelopment(): boolean;
  isCI(): boolean;
}

@Injectable()
export class SecretService implements ISecretService {
  get = <T>(key: string): T => {
    if (!Deno.env.has(key)) {
      const size = Object.keys(Deno.env.toObject());
      if (size.length === 0) {
        throw new NoVariablesFoundError();
      }
      throw new MissingKeyError(key);
    }
    const value = Deno.env.get(key) as T;
    return value;
  };

  /**
   * Upstream request timeout in milliseconds. Invalid or non
   * positive values fall back to 5000; values above 30000 are
   * clamped so deployment misconfiguration cannot turn slow public
   * upstreams into multi-minute request stalls.
   */
  requestTimeout = (): number => {
    const timeout = this.get<string>('CLIENT_REQUEST_TIMEOUT');
    const parsed = Number.parseInt(timeout, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DEFAULT_REQUEST_TIMEOUT;
    }
    return Math.min(parsed, MAX_REQUEST_TIMEOUT);
  };

  environment = (): Environment => this.get('DENO_ENV');

  isDevelopment = (): boolean => this.environment() === 'development';

  isCI = (): boolean => {
    const value = Deno.env.get('CI');
    if (!value) {
      return false;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  };
}
