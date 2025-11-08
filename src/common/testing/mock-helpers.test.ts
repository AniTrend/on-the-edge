import { describe, it } from '@std/testing/bdd';
import { assert, assertEquals } from '@std/assert';
import { assertSpyCalls } from '@std/testing/mock';
import {
  createMockCache,
  createMockExperiment,
  createMockLogger,
} from './mock-helpers.ts';

describe('Mock Helpers', () => {
  describe('createMockLogger', () => {
    it('should create a logger with spied methods', () => {
      const { logger, spies } = createMockLogger();

      logger.instance.info('test message', { detail: 'test' });
      logger.instance.error('error message');
      logger.instance.debug('debug message');
      logger.instance.warn('warn message');

      assertSpyCalls(spies.info, 1);
      assertSpyCalls(spies.error, 1);
      assertSpyCalls(spies.debug, 1);
      assertSpyCalls(spies.warn, 1);
    });

    it('should track mark and measure calls', () => {
      const { logger, spies } = createMockLogger();

      logger.instance.mark('test-start');
      logger.instance.mark('test-end');
      logger.instance.measure('test-duration');

      assertSpyCalls(spies.mark, 2);
      assertSpyCalls(spies.measure, 1);
    });

    it('should support shutdown', async () => {
      const { logger, spies } = createMockLogger();

      await logger.instance.shutdown();

      assertSpyCalls(spies.shutdown, 1);
    });
  });

  describe('createMockExperiment', () => {
    it('should return flag values', () => {
      const experiment = createMockExperiment({
        'feature-a': true,
        'feature-b': false,
        'threshold': 0.8,
      });

      assertEquals(experiment.isEnabled('feature-a' as never), true);
      assertEquals(experiment.isEnabled('feature-b' as never), false);
      assertEquals(experiment.isDisabled('feature-a' as never), false);
      assertEquals(experiment.isDisabled('feature-b' as never), true);
    });

    it('should return default values for missing flags', () => {
      const experiment = createMockExperiment({
        'existing-flag': 42,
      });

      assertEquals(experiment.getFeatureValue('existing-flag' as never, 0), 42);
      assertEquals(
        experiment.getFeatureValue('missing-flag' as never, 'default'),
        'default',
      );
    });

    it('should execute invoke wrapper', () => {
      const experiment = createMockExperiment();

      const result = experiment.invoke(() => 'test-result');
      assertEquals(result, 'test-result');
    });

    it('should track all method calls', () => {
      const experiment = createMockExperiment({
        'test-flag': true,
      });

      experiment.isEnabled('test-flag' as never);
      experiment.isDisabled('test-flag' as never);
      experiment.getFeatureValue('test-flag' as never, false);
      experiment.invoke(() => 'test');

      assertSpyCalls(experiment.isEnabled as never, 1);
      assertSpyCalls(experiment.isDisabled as never, 1);
      assertSpyCalls(experiment.getFeatureValue as never, 1);
      assertSpyCalls(experiment.invoke as never, 1);
    });
  });

  describe('createMockCache', () => {
    it('should store and retrieve values', async () => {
      const { service } = createMockCache();

      await service.set('edge:mock:key1', { data: 'value' });
      const value = await service.get('edge:mock:key1');

      assertEquals(value, { data: 'value' });
    });

    it('should return null for missing keys', async () => {
      const { service } = createMockCache();

      const value = await service.get('edge:mock:missing');
      assertEquals(value, null);
    });

    it('should respect TTL expiration', async () => {
      const { service } = createMockCache();

      await service.set('edge:mock:key1', 'value', { ttl: 0.001 }); // 1ms TTL

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const value = await service.get('edge:mock:key1');
      assertEquals(value, null);
    });

    it('should delete keys', async () => {
      const { service } = createMockCache();

      await service.set('edge:mock:key1', 'value');
      await service.del('edge:mock:key1');

      const value = await service.get('edge:mock:key1');
      assertEquals(value, null);
    });

    it('should track spy calls', async () => {
      const { service, spies } = createMockCache();

      await service.set('edge:mock:key1', 'value');
      await service.get('edge:mock:key1');
      await service.del('edge:mock:key1');

      assertSpyCalls(spies.set, 1);
      assertSpyCalls(spies.get, 1);
      assertSpyCalls(spies.del, 1);
    });

    it('should expose internal cache for inspection', async () => {
      const { service, cache } = createMockCache();

      await service.set('edge:mock:key1', 'value');

      assert(cache.has('edge:mock:key1'));
      const entry = cache.get('edge:mock:key1');
      assert(entry);
      assertEquals(entry.value, 'value');
      assert(entry.expiresAt > Date.now());
    });

    it('should handle multiple keys independently', async () => {
      const { service } = createMockCache();

      await service.set('edge:mock:key1', 'value1');
      await service.set('edge:mock:key2', 'value2');
      await service.set('edge:mock:key3', 'value3');

      assertEquals(await service.get('edge:mock:key1'), 'value1');
      assertEquals(await service.get('edge:mock:key2'), 'value2');
      assertEquals(await service.get('edge:mock:key3'), 'value3');

      await service.del('edge:mock:key2');

      assertEquals(await service.get('edge:mock:key1'), 'value1');
      assertEquals(await service.get('edge:mock:key2'), null);
      assertEquals(await service.get('edge:mock:key3'), 'value3');
    });
  });
});
