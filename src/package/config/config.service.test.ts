import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { type ExecutionContext, NotFoundException } from '@danet/core';
import { createMockLogger } from '@scope/common/testing';
import { ConfigService } from './config.service.ts';
import { validateNavigation } from './config.validation.ts';
import { sortNavigation } from './config.transformer.ts';
import type { Config } from './config.types.ts';
import type { NavigationItemInput } from './config.document.ts';
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
// Unit: sortNavigation
// ---------------------------------------------------------------------------

function makeDocNavItem(
  overrides?: Partial<NavigationItemInput>,
): NavigationItemInput {
  return {
    criteria: 'test',
    destination: '/test',
    i18n: 'nav.test',
    icon: 'test',
    group: { authenticated: false, i18n: 'nav.group.main' },
    ...overrides,
  };
}

describe('sortNavigation', () => {
  it('sorts by group.rank ascending, then rank ascending', () => {
    const nav: NavigationItemInput[] = [
      makeDocNavItem({
        key: 'catalogs-1',
        group: { authenticated: false, i18n: 'nav.group.catalogs', rank: 2 },
        rank: 1,
      }),
      makeDocNavItem({
        key: 'general-1',
        group: { authenticated: false, i18n: 'nav.group.general', rank: 0 },
        rank: 0,
      }),
      makeDocNavItem({
        key: 'general-2',
        group: { authenticated: false, i18n: 'nav.group.general', rank: 0 },
        rank: 1,
      }),
      makeDocNavItem({
        key: 'manage-1',
        group: { authenticated: true, i18n: 'nav.group.manage', rank: 1 },
        rank: 0,
      }),
      makeDocNavItem({
        key: 'support-1',
        group: { authenticated: false, i18n: 'nav.group.support', rank: 3 },
        rank: 0,
      }),
    ];
    const sorted = sortNavigation(nav);
    assertEquals(sorted.map((i) => i.key), [
      'general-1',
      'general-2',
      'manage-1',
      'catalogs-1',
      'support-1',
    ]);
  });

  it('sorts items with undefined rank after ranked items', () => {
    const nav: NavigationItemInput[] = [
      makeDocNavItem({
        key: 'has-rank',
        group: { authenticated: false, i18n: 'group', rank: 0 },
        rank: 0,
      }),
      makeDocNavItem({
        key: 'no-rank',
        group: { authenticated: false, i18n: 'group' },
      }),
    ];
    const sorted = sortNavigation(nav);
    assertEquals(sorted.map((i) => i.key), ['has-rank', 'no-rank']);
  });

  it('does not mutate the input array', () => {
    const nav: NavigationItemInput[] = [
      makeDocNavItem({
        key: 'b',
        group: { authenticated: false, i18n: 'group', rank: 0 },
        rank: 1,
      }),
      makeDocNavItem({
        key: 'a',
        group: { authenticated: false, i18n: 'group', rank: 0 },
        rank: 0,
      }),
    ];
    const copy = [...nav];
    sortNavigation(nav);
    assertEquals(nav, copy);
  });

  it('uses key as tiebreaker for deterministic ordering', () => {
    const nav: NavigationItemInput[] = [
      makeDocNavItem({
        key: 'z',
        group: { authenticated: false, i18n: 'group', rank: 0 },
        rank: 0,
      }),
      makeDocNavItem({
        key: 'a',
        group: { authenticated: false, i18n: 'group', rank: 0 },
        rank: 0,
      }),
      makeDocNavItem({
        key: 'm',
        group: { authenticated: false, i18n: 'group', rank: 0 },
        rank: 0,
      }),
    ];
    const sorted = sortNavigation(nav);
    assertEquals(sorted.map((i) => i.key), ['a', 'm', 'z']);
  });
});

// ---------------------------------------------------------------------------
// Stub classes for integration tests
// ---------------------------------------------------------------------------

class ExperimentStub {
  featureValue: unknown = null;
  enabled = false;
  lastFeatureKey: string | null = null;

  getFeatureValue<T>(feature: string, _defaultValue: T): T {
    this.lastFeatureKey = feature;
    return this.featureValue as T;
  }
  isEnabled(_feature: string): boolean {
    return this.enabled;
  }
}

type ConfigDocumentStub = {
  _id: { toString(): string };
  image: Record<string, string>;
  genres: Array<{ name: string; mediaId: number }>;
  navigation: NavigationItemInput[];
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

  it('returns navigation sorted by group.rank then rank, without rank fields in output', async () => {
    const repository = {
      getConfig: async () =>
        makeDocumentStub({
          navigation: [
            makeDocNavItem({
              key: 'support',
              destination: '/support',
              group: { authenticated: false, i18n: 'support', rank: 3 },
              rank: 0,
            }),
            makeDocNavItem({
              key: 'general',
              destination: '/home',
              group: { authenticated: false, i18n: 'general', rank: 0 },
              rank: 0,
            }),
            makeDocNavItem({
              key: 'catalogs',
              destination: '/discover',
              group: { authenticated: false, i18n: 'catalogs', rank: 2 },
              rank: 0,
            }),
            makeDocNavItem({
              key: 'manage',
              destination: '/animelist',
              group: { authenticated: true, i18n: 'manage', rank: 1 },
              rank: 0,
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
    assertEquals(result.navigation.length, 4);
    // Expected order: General(0) → Manage(1) → Catalogs(2) → Support(3)
    assertEquals(result.navigation.map((i) => i.key), [
      'general',
      'manage',
      'catalogs',
      'support',
    ]);
    // Verify rank is not in the output
    for (const item of result.navigation) {
      assertEquals((item as Record<string, unknown>).rank, undefined);
      assertEquals(
        ((item.group as unknown) as Record<string, unknown>).rank,
        undefined,
      );
    }
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

// ---------------------------------------------------------------------------
// Unit: ConfigService promotion (14.2-14.6, 15.10)
// ---------------------------------------------------------------------------

const promotionPayload = {
  id: 'promo-anitrend-v2',
  targetProduct: 'ANITREND_V2',
  title: 'Try AniTrend v2',
  message: 'A new home for your anime list',
  action: { type: 'OPEN_URL', url: 'https://v2.anitrend.co' },
};

const clientContext = (
  overrides?: Partial<Record<string, unknown>>,
): Record<string, unknown> => ({
  appId: 'ANITREND_APP',
  packageName: 'com.anitrend.app',
  version: '2.0.0',
  versionCode: 100,
  buildType: 'release',
  source: 'google-play',
  locale: 'en-US',
  platform: {
    browserName: null,
    browserVersion: null,
    cpuArchitecture: null,
    deviceModel: null,
    deviceVendor: null,
    deviceType: null,
    engineName: null,
    engineVersion: null,
    osName: null,
    osVersion: null,
    deviceBuildId: null,
  },
  ...overrides,
});

const promotionContext = (
  attributes?: unknown,
): ExecutionContext =>
  ({
    get: (key: string) => key === 'client-attributes' ? attributes : undefined,
  }) as unknown as ExecutionContext;

const buildPromotionService = (experiment: ExperimentStub) => {
  const repository = {
    getConfig: async () =>
      makeDocumentStub({
        navigation: [validNavItem({ key: 'home', destination: '/home' })],
      }),
  };
  const { logger } = createMockLogger();
  return new ConfigService(
    repository as unknown as ConfigRepository,
    experiment as unknown as ExperimentService,
    logger,
  );
};

describe('ConfigService promotion', () => {
  it('returns no promotion when the feature value is absent', async () => {
    const experiment = new ExperimentStub();
    experiment.enabled = true;
    const service = buildPromotionService(experiment);

    const result = await service.getConfig(promotionContext(clientContext()));
    assertEquals(result.promotion, undefined);
  });

  it('returns no promotion when the feature is off', async () => {
    const experiment = new ExperimentStub();
    experiment.featureValue = promotionPayload;
    const service = buildPromotionService(experiment);

    const result = await service.getConfig(promotionContext(clientContext()));
    assertEquals(result.promotion, undefined);
  });

  it('returns the promotion payload for an AniTrend App release client', async () => {
    const experiment = new ExperimentStub();
    experiment.featureValue = promotionPayload;
    experiment.enabled = true;
    const service = buildPromotionService(experiment);

    const result = await service.getConfig(promotionContext(clientContext()));
    assertEquals(result.promotion?.id, 'promo-anitrend-v2');
    assertEquals(result.promotion?.targetProduct, 'ANITREND_V2');
    assertEquals(result.promotion?.title, 'Try AniTrend v2');
    assertEquals(
      result.promotion?.message,
      'A new home for your anime list',
    );
    assertEquals(result.promotion?.action?.type, 'OPEN_URL');
    assertEquals(result.promotion?.action?.url, 'https://v2.anitrend.co');
  });

  it('never returns a self-promotion for AniTrend v2 clients', async () => {
    const experiment = new ExperimentStub();
    experiment.featureValue = promotionPayload;
    experiment.enabled = true;
    const service = buildPromotionService(experiment);

    const result = await service.getConfig(
      promotionContext(clientContext({ appId: 'ANITREND_V2' })),
    );
    assertEquals(result.promotion, undefined);
  });

  it('returns no promotion for a non-release build type', async () => {
    const experiment = new ExperimentStub();
    experiment.featureValue = promotionPayload;
    experiment.enabled = true;
    const service = buildPromotionService(experiment);

    const result = await service.getConfig(
      promotionContext(clientContext({ buildType: 'debug' })),
    );
    assertEquals(result.promotion, undefined);
  });

  it('returns no promotion when the client context is missing', async () => {
    const experiment = new ExperimentStub();
    experiment.featureValue = promotionPayload;
    experiment.enabled = true;
    const service = buildPromotionService(experiment);

    const withoutContext = await service.getConfig();
    const emptyContext = await service.getConfig(promotionContext());
    assertEquals(withoutContext.promotion, undefined);
    assertEquals(emptyContext.promotion, undefined);
  });

  it('looks up the anitrend-v2-promotion feature key', async () => {
    const experiment = new ExperimentStub();
    experiment.featureValue = promotionPayload;
    experiment.enabled = true;
    const service = buildPromotionService(experiment);

    await service.getConfig(promotionContext(clientContext()));
    assertEquals(experiment.lastFeatureKey, 'anitrend-v2-promotion');
  });
});
