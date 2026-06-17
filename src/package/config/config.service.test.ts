import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { NotFoundException } from '@danet/core';
import { createMockLogger } from '@scope/common/testing';
import { ConfigService } from './config.service.ts';
import { validateNavigation } from './config.validation.ts';
import type { Config } from './config.types.ts';
import type { ConfigRepository } from './config.repository.ts';
import type { ExperimentService } from '@scope/experiment';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function validNavItem(
  overrides?: Partial<Config['navigation'][number]>,
): Config['navigation'][number] {
  return {
    key: 'home',
    criteria: 'test',
    destination: '/home',
    i18n: 'nav.home',
    icon: 'home',
    group: { authenticated: false, i18n: 'nav.group.main' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Unit: validateNavigation
// ---------------------------------------------------------------------------

describe('validateNavigation', () => {
  it('returns empty errors for a valid navigation array', () => {
    const nav = [
      validNavItem({ key: 'home', destination: '/home' }),
      validNavItem({
        key: 'search',
        destination: '/search',
        i18n: 'nav.search',
        icon: 'search',
        group: { authenticated: false, i18n: 'nav.group.main' },
      }),
    ];
    const errors = validateNavigation(nav);
    assertEquals(errors, []);
  });

  it('returns error when navigation array is empty', () => {
    const errors = validateNavigation([]);
    assertEquals(errors.length, 1);
    assertEquals(
      errors[0].message,
      'Config navigation array is empty or missing',
    );
  });

  it('returns error when navigation is null/undefined', () => {
    const errors = validateNavigation(null as unknown as Config['navigation']);
    assertEquals(errors.length, 1);
    assertEquals(
      errors[0].message,
      'Config navigation array is empty or missing',
    );
  });

  it('returns error when entry has no key', () => {
    const nav = [
      validNavItem({ key: undefined as unknown as string }),
    ];
    const errors = validateNavigation(nav);
    assertEquals(errors.length, 1);
    assertEquals(errors[0].message, 'navigation[0].key is empty or missing');
    assertEquals(errors[0].field, 'navigation[0].key');
  });

  it('returns error when entry has empty key', () => {
    const nav = [
      validNavItem({ key: '' }),
    ];
    const errors = validateNavigation(nav);
    assertEquals(errors.length, 1);
    assertEquals(errors[0].message, 'navigation[0].key is empty or missing');
  });

  it('returns error when entry has no destination', () => {
    const nav = [
      validNavItem({ destination: undefined as unknown as string }),
    ];
    const errors = validateNavigation(nav);
    assertEquals(errors.length, 1);
    assertEquals(
      errors[0].message,
      'navigation[0].destination is empty or missing',
    );
    assertEquals(errors[0].field, 'navigation[0].destination');
  });

  it('returns error when entry has no i18n', () => {
    const nav = [
      validNavItem({ i18n: undefined as unknown as string }),
    ];
    const errors = validateNavigation(nav);
    assertEquals(errors.length, 1);
    assertEquals(errors[0].message, 'navigation[0].i18n is empty or missing');
    assertEquals(errors[0].field, 'navigation[0].i18n');
  });

  it('returns error when entry has no icon', () => {
    const nav = [
      validNavItem({ icon: undefined as unknown as string }),
    ];
    const errors = validateNavigation(nav);
    assertEquals(errors.length, 1);
    assertEquals(errors[0].message, 'navigation[0].icon is empty or missing');
    assertEquals(errors[0].field, 'navigation[0].icon');
  });

  it('returns error when entry has no group.i18n', () => {
    const nav = [
      validNavItem({
        group: {
          authenticated: false,
          i18n: undefined as unknown as string,
        },
      }),
    ];
    const errors = validateNavigation(nav);
    assertEquals(errors.length, 1);
    assertEquals(
      errors[0].message,
      'navigation[0].group.i18n is empty or missing',
    );
    assertEquals(errors[0].field, 'navigation[0].group.i18n');
  });

  it('returns duplicate key error when two entries share the same key', () => {
    const nav = [
      validNavItem({ key: 'home', destination: '/home' }),
      validNavItem({
        key: 'home',
        destination: '/home-alt',
        i18n: 'nav.home',
        icon: 'home',
        group: { authenticated: false, i18n: 'nav.group.main' },
      }),
    ];
    const errors = validateNavigation(nav);
    assertEquals(errors.length, 1);
    assertEquals(errors[0].message, 'Duplicate navigation key: "home"');
    assertEquals(errors[0].field, 'key');
  });

  it('returns duplicate destination error when two entries share the same destination', () => {
    const nav = [
      validNavItem({ key: 'home', destination: '/same' }),
      validNavItem({
        key: 'home-alt',
        destination: '/same',
        i18n: 'nav.home',
        icon: 'home',
        group: { authenticated: false, i18n: 'nav.group.main' },
      }),
    ];
    const errors = validateNavigation(nav);
    assertEquals(errors.length, 1);
    assertEquals(
      errors[0].message,
      'Duplicate navigation destination: "/same"',
    );
    assertEquals(errors[0].field, 'destination');
  });

  it('returns multiple errors when an entry is missing several fields', () => {
    const nav = [
      validNavItem({
        key: undefined as unknown as string,
        destination: undefined as unknown as string,
        i18n: undefined as unknown as string,
        icon: undefined as unknown as string,
        group: {
          authenticated: false,
          i18n: undefined as unknown as string,
        },
      }),
    ];
    const errors = validateNavigation(nav);
    // All five required fields should fail on the single entry
    assertEquals(errors.length, 5);
  });
});

// ---------------------------------------------------------------------------
// Stub classes for integration tests
// ---------------------------------------------------------------------------

class ExperimentStub {
  getFeatureValue<T>(_feature: string, defaultValue: T): T {
    return defaultValue;
  }
  isEnabled(_feature: string): boolean {
    return false;
  }
}

type ConfigDocumentStub = {
  _id: { toString(): string };
  image: Record<string, string>;
  genres: Array<{ name: string; mediaId: number }>;
  navigation: Config['navigation'];
};

function makeDocumentStub(
  overrides?: Partial<ConfigDocumentStub>,
): ConfigDocumentStub {
  return {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    image: {
      banner: 'https://example.com/banner.jpg',
      poster: 'https://example.com/poster.jpg',
      loading: 'https://example.com/loading.jpg',
      error: 'https://example.com/error.jpg',
      info: 'https://example.com/info.jpg',
      default: 'https://example.com/default.jpg',
    },
    genres: [{ name: 'Action', mediaId: 1 }],
    navigation: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Integration: ConfigService.getConfig
// ---------------------------------------------------------------------------

describe('ConfigService.getConfig', () => {
  it('returns config when repository has a valid document with navigation items', async () => {
    const repository = {
      getConfig: async () =>
        makeDocumentStub({
          navigation: [
            validNavItem({ key: 'home', destination: '/home' }),
            validNavItem({
              key: 'search',
              destination: '/search',
              i18n: 'nav.search',
              icon: 'search',
              group: { authenticated: false, i18n: 'nav.group.main' },
            }),
          ],
        }),
    };
    const experiment = new ExperimentStub();
    const { logger } = createMockLogger();
    const service = new ConfigService(
      repository as unknown as ConfigRepository,
      experiment as unknown as ExperimentService,
      logger,
    );

    const result = await service.getConfig();
    assertEquals(result.id, '507f1f77bcf86cd799439011');
    assertEquals(result.navigation.length, 2);
    assertEquals(result.navigation[0].key, 'home');
    assertEquals(result.navigation[1].key, 'search');
  });

  it('throws Error when navigation has duplicate keys', async () => {
    const repository = {
      getConfig: async () =>
        makeDocumentStub({
          navigation: [
            validNavItem({ key: 'home', destination: '/home' }),
            validNavItem({
              key: 'home',
              destination: '/home-alt',
              i18n: 'nav.home',
              icon: 'home',
              group: { authenticated: false, i18n: 'nav.group.main' },
            }),
          ],
        }),
    };
    const experiment = new ExperimentStub();
    const { logger } = createMockLogger();
    const service = new ConfigService(
      repository as unknown as ConfigRepository,
      experiment as unknown as ExperimentService,
      logger,
    );

    await assertRejects(
      () => service.getConfig(),
      Error,
      'Config navigation payload is invalid: Duplicate navigation key: "home"',
    );
  });

  it('throws NotFoundException when repository returns null', async () => {
    const repository = {
      getConfig: async () => null,
    };
    const experiment = new ExperimentStub();
    const { logger } = createMockLogger();
    const service = new ConfigService(
      repository as unknown as ConfigRepository,
      experiment as unknown as ExperimentService,
      logger,
    );

    await assertRejects(
      () => service.getConfig(),
      NotFoundException,
    );
  });
});
