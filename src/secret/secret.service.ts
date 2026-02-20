import { Injectable } from '@danet/core';
import { MissingKeyError, NoVariablesFoundError } from './secret.errors.ts';
import { Environment } from './secret.types.ts';

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

  requestTimeout = (): number => {
    const timeout = this.get<string>('CLIENT_REQUEST_TIMEOUT');
    return Number.parseInt(timeout, 10);
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
