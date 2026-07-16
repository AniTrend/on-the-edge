import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertExists } from '@std/assert';
import { AppController } from './app.controller.ts';
import { createMockSecret } from '@scope/common/testing';

describe('AppController', () => {
  it('health returns status, uptime, and timestamp', () => {
    const { service: secret } = createMockSecret();
    const controller = new AppController(secret);

    const result = controller.health();

    assertEquals(result.status, 'healthy');
    assertEquals(typeof result.uptime, 'number');
    assertEquals(result.uptime >= 0, true);
    assertExists(result.timestamp);
  });
});
