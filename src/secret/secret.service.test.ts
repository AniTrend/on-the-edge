import { afterEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { SecretService } from './secret.service.ts';

const KEY = 'CLIENT_REQUEST_TIMEOUT';

describe('SecretService', () => {
  const service = new SecretService();

  afterEach(() => {
    Deno.env.delete(KEY);
  });

  it('returns the configured request timeout in milliseconds', () => {
    Deno.env.set(KEY, '2000');
    assertEquals(service.requestTimeout(), 2000);
  });

  it('falls back to 5000 when the configured timeout is invalid', () => {
    Deno.env.set(KEY, 'not-a-number');
    assertEquals(service.requestTimeout(), 5000);
  });

  it('falls back to 5000 when the configured timeout is not positive', () => {
    Deno.env.set(KEY, '0');
    assertEquals(service.requestTimeout(), 5000);
  });

  it('clamps multi-minute deployment values to 30 seconds', () => {
    Deno.env.set(KEY, '200000');
    assertEquals(service.requestTimeout(), 30000);
  });
});
