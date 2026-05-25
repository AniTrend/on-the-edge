# Series Endpoint Image Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the `v1/series` response payload by returning a locale-focused `images` array without changing the cached canonical `SeriesDocument`.

**Architecture:** Keep `seriesTransform()` and `SeriesRepository` canonical and cache-friendly. Add a pure image-selection helper in the series package, use it in `SeriesService` after repository retrieval, and pass client locale from `SeriesController` via Danet request context.

**Tech Stack:** Deno, Danet, Zod, TypeScript, std testing, Mongo-backed repository cache

---

## File Map

- Create: `src/package/series/transformer/series.image-selection.ts`
- Create: `src/package/series/transformer/series.image-selection.test.ts`
- Create: `src/package/series/series.controller.test.ts`
- Modify: `src/package/series/transformer/index.ts`
- Modify: `src/package/series/series.service.ts`
- Modify: `src/package/series/series.service.test.ts`
- Modify: `src/package/series/series.controller.ts`

### Task 1: Add Pure Focused Image Selection Helper

**Files:**
- Create: `src/package/series/transformer/series.image-selection.ts`
- Create: `src/package/series/transformer/series.image-selection.test.ts`
- Modify: `src/package/series/transformer/index.ts`

- [ ] **Step 1: Write the failing helper tests**

```ts
import { describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { selectSeriesImages } from './series.image-selection.ts';
import type { SeriesImageAttributes } from '../series.types.ts';

const image = (
  type: SeriesImageAttributes['type'],
  locale: string | null,
  width: number,
  height: number,
  url: string,
): SeriesImageAttributes => ({
  type,
  locale,
  width,
  height,
  url,
});

describe('selectSeriesImages', () => {
  it('keeps the best jp and device-language image per type', () => {
    const images: SeriesImageAttributes[] = [
      image('POSTER', 'jp', 1000, 1500, '/poster-jp-large.jpg'),
      image('POSTER', 'jp', 500, 750, '/poster-jp-small.jpg'),
      image('POSTER', 'en', 800, 1200, '/poster-en.jpg'),
      image('POSTER', 'fr', 1200, 1600, '/poster-fr.jpg'),
      image('BACKDROP', 'jp', 1920, 1080, '/backdrop-jp.jpg'),
      image('BACKDROP', 'en', 1280, 720, '/backdrop-en.jpg'),
    ];

    assertEquals(selectSeriesImages(images, 'en-US'), [
      image('POSTER', 'jp', 1000, 1500, '/poster-jp-large.jpg'),
      image('POSTER', 'en', 800, 1200, '/poster-en.jpg'),
      image('BACKDROP', 'jp', 1920, 1080, '/backdrop-jp.jpg'),
      image('BACKDROP', 'en', 1280, 720, '/backdrop-en.jpg'),
    ]);
  });

  it('treats null locale as universal and does not duplicate the same image', () => {
    const universalPoster = image('POSTER', null, 900, 1350, '/poster-null.jpg');

    assertEquals(selectSeriesImages([
      universalPoster,
      image('POSTER', 'fr', 800, 1200, '/poster-fr.jpg'),
    ], 'en-US'), [
      universalPoster,
    ]);
  });

  it('falls back to the best available image when preferred locales are missing', () => {
    assertEquals(selectSeriesImages([
      image('LOGO', 'fr', 300, 120, '/logo-fr-small.png'),
      image('LOGO', 'de', 500, 200, '/logo-de-large.png'),
    ], 'en-US'), [
      image('LOGO', 'de', 500, 200, '/logo-de-large.png'),
    ]);
  });

  it('uses source order as the final tie-breaker', () => {
    assertEquals(selectSeriesImages([
      image('POSTER', 'jp', 1000, 1500, '/poster-first.jpg'),
      image('POSTER', 'jp', 1000, 1500, '/poster-second.jpg'),
    ], 'en-US'), [
      image('POSTER', 'jp', 1000, 1500, '/poster-first.jpg'),
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `deno test src/package/series/transformer/series.image-selection.test.ts`
Expected: FAIL with `Module not found` or `selectSeriesImages is not exported`

- [ ] **Step 3: Write the minimal helper implementation**

```ts
import type { SeriesImageAttributes } from '../series.types.ts';

const IMAGE_TYPES: SeriesImageAttributes['type'][] = [
  'POSTER',
  'BACKDROP',
  'LOGO',
];

const area = ({ width, height }: SeriesImageAttributes) => width * height;

const normalizeLanguage = (locale?: string | null): string | null => {
  if (!locale) return null;

  const normalized = locale.trim().toLowerCase();
  if (!normalized) return null;

  return normalized.split(/[-_]/)[0] ?? null;
};

const rankCandidates = (
  candidates: Array<{ image: SeriesImageAttributes; index: number; score: number }>,
) => {
  return candidates.toSorted((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    const areaDelta = area(right.image) - area(left.image);
    if (areaDelta !== 0) {
      return areaDelta;
    }

    return left.index - right.index;
  });
};

const selectForBucket = (
  images: SeriesImageAttributes[],
  locale: string | null,
  usedUrls: Set<string>,
): SeriesImageAttributes | null => {
  const ranked = rankCandidates(images.flatMap((image, index) => {
    if (usedUrls.has(image.url)) {
      return [];
    }

    const imageLocale = normalizeLanguage(image.locale);
    if (locale && imageLocale === locale) {
      return [{ image, index, score: 3 }];
    }

    if (image.locale === null) {
      return [{ image, index, score: 2 }];
    }

    if (!locale) {
      return [{ image, index, score: 1 }];
    }

    return [];
  }));

  return ranked[0]?.image ?? null;
};

export const selectSeriesImages = (
  images: SeriesImageAttributes[],
  locale?: string | null,
): SeriesImageAttributes[] => {
  const preferredLocales = Array.from(new Set([
    'jp',
    normalizeLanguage(locale),
  ].filter((value): value is string => value !== null)));

  const selected: SeriesImageAttributes[] = [];
  const usedUrls = new Set<string>();

  for (const type of IMAGE_TYPES) {
    const imagesByType = images.filter((image) => image.type === type);
    if (imagesByType.length === 0) {
      continue;
    }

    let matchedBucket = false;
    for (const preferredLocale of preferredLocales) {
      const winner = selectForBucket(imagesByType, preferredLocale, usedUrls);
      if (!winner) {
        continue;
      }

      matchedBucket = true;
      selected.push(winner);
      usedUrls.add(winner.url);
    }

    if (matchedBucket) {
      continue;
    }

    const fallback = selectForBucket(imagesByType, null, usedUrls);
    if (fallback) {
      selected.push(fallback);
      usedUrls.add(fallback.url);
    }
  }

  return selected;
};
```

- [ ] **Step 4: Export the helper from the transformer index**

```ts
export * from './series.transformer.ts';
export * from './series.image-selection.ts';
```

- [ ] **Step 5: Run the helper tests to verify they pass**

Run: `deno test src/package/series/transformer/series.image-selection.test.ts`
Expected: PASS with 4 passing tests

- [ ] **Step 6: Commit the helper work**

```bash
git add src/package/series/transformer/series.image-selection.ts src/package/series/transformer/series.image-selection.test.ts src/package/series/transformer/index.ts
git commit -m "feat(series): add focused image selection"
```

### Task 2: Apply Focused Image Selection In SeriesService

**Files:**
- Modify: `src/package/series/series.service.ts`
- Modify: `src/package/series/series.service.test.ts`

- [ ] **Step 1: Extend the service tests with locale-aware shaping coverage**

```ts
it('filters response images using the provided locale after repository retrieval', async () => {
  const { logger } = createMockLogger();

  const mockDocument = {
    _id: new ObjectId(),
    kind: 'ANIME',
    classification: 'TV',
    seriesKey: 'anilist:789',
    mediaId: {
      anidb: null,
      anilist: 789,
      animePlanet: null,
      anisearch: null,
      imdb: null,
      kitsu: null,
      livechart: null,
      notify: null,
      themoviedb: 9,
      tvdb: 1,
      myanimelist: 456,
      tvMazeId: null,
      tvrage: null,
      slug: 'series',
      shoboi: null,
      trakt: 42,
    },
    cover: {},
    banner: null,
    fanart: null,
    format: null,
    status: null,
    source: null,
    title: {
      english: null,
      canonical: null,
      harigana: null,
      japanese: null,
      romaji: null,
      synonyms: null,
    },
    ageRating: null,
    images: [
      { type: 'POSTER', locale: 'jp', width: 1000, height: 1500, url: '/poster-jp.jpg' },
      { type: 'POSTER', locale: 'en', width: 800, height: 1200, url: '/poster-en.jpg' },
      { type: 'POSTER', locale: 'fr', width: 1200, height: 1600, url: '/poster-fr.jpg' },
    ],
    description: null,
    updatedAt: toInstant(new Date()),
    moreInfo: null,
    duration: null,
    networks: [],
    animethemes: [],
    trailers: [],
    schedule: null,
  };

  const invokeSpy = spy(async () => mockDocument);
  const repository = { invoke: invokeSpy } as unknown as SeriesRepository;

  const service = new SeriesService(repository, logger);
  const response = await service.aggregate({ anilist: 789 }, 'en-US');

  assertEquals(response.images, [
    { type: 'POSTER', locale: 'jp', width: 1000, height: 1500, url: '/poster-jp.jpg' },
    { type: 'POSTER', locale: 'en', width: 800, height: 1200, url: '/poster-en.jpg' },
  ]);
  assertEquals(mockDocument.images.length, 3);
});

it('falls back to jp and universal images when locale is missing', async () => {
  const { logger } = createMockLogger();

  const mockDocument = {
    _id: new ObjectId(),
    kind: 'ANIME',
    classification: 'TV',
    seriesKey: 'anilist:789',
    mediaId: {
      anidb: null,
      anilist: 789,
      animePlanet: null,
      anisearch: null,
      imdb: null,
      kitsu: null,
      livechart: null,
      notify: null,
      themoviedb: 9,
      tvdb: 1,
      myanimelist: 456,
      tvMazeId: null,
      tvrage: null,
      slug: 'series',
      shoboi: null,
      trakt: 42,
    },
    cover: {},
    banner: null,
    fanart: null,
    format: null,
    status: null,
    source: null,
    title: {
      english: null,
      canonical: null,
      harigana: null,
      japanese: null,
      romaji: null,
      synonyms: null,
    },
    ageRating: null,
    images: [
      { type: 'LOGO', locale: null, width: 500, height: 200, url: '/logo-null.png' },
      { type: 'LOGO', locale: 'fr', width: 300, height: 120, url: '/logo-fr.png' },
    ],
    description: null,
    updatedAt: toInstant(new Date()),
    moreInfo: null,
    duration: null,
    networks: [],
    animethemes: [],
    trailers: [],
    schedule: null,
  };

  const repository = {
    invoke: spy(async () => mockDocument),
  } as unknown as SeriesRepository;

  const service = new SeriesService(repository, logger);
  const response = await service.aggregate({ anilist: 789 });

  assertEquals(response.images, [
    { type: 'LOGO', locale: null, width: 500, height: 200, url: '/logo-null.png' },
  ]);
});
```

- [ ] **Step 2: Run the service test file to verify the new cases fail**

Run: `deno test src/package/series/series.service.test.ts`
Expected: FAIL because `SeriesService.aggregate()` does not yet accept locale or reshape `images`

- [ ] **Step 3: Update the service to reshape images at the response boundary**

```ts
import { Injectable, InternalServerErrorException } from '@danet/core';
import { BadRequestException } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { SeriesRepository } from './repository/index.ts';
import { selectSeriesImages } from './transformer/index.ts';
import type { Series } from './series.types.ts';
import type { SeriesQuery } from './series.types.ts';

@Injectable()
export class SeriesService {
  constructor(
    private readonly repository: SeriesRepository,
    private readonly logger: LoggerService,
  ) {}

  async aggregate(query: SeriesQuery, locale?: string): Promise<Series> {
    if (!query || Object.keys(query).length === 0) {
      this.logger.instance.warn('Provided empty query to aggregate series');
      throw new BadRequestException();
    }

    if (!query.anilist) {
      this.logger.instance.warn('AniList ID required for repository lookup', {
        query,
      });
      throw new BadRequestException();
    }

    try {
      const { _id, images, ...entity } = await this.repository.invoke(query);
      return {
        id: _id.toHexString(),
        ...entity,
        images: selectSeriesImages(images, locale),
      } satisfies Series;
    } catch (error) {
      this.logger.instance.error('Failed to aggregate series', {
        query,
        cause: error,
      });
      throw new InternalServerErrorException();
    }
  }
}
```

- [ ] **Step 4: Run the service tests to verify they pass**

Run: `deno test src/package/series/series.service.test.ts`
Expected: PASS with the existing validation tests plus the new locale-shaping cases

- [ ] **Step 5: Commit the service integration**

```bash
git add src/package/series/series.service.ts src/package/series/series.service.test.ts
git commit -m "feat(series): filter response images by locale"
```

### Task 3: Pass Client Locale From SeriesController

**Files:**
- Create: `src/package/series/series.controller.test.ts`
- Modify: `src/package/series/series.controller.ts`

- [ ] **Step 1: Write a controller test for locale extraction and delegation**

```ts
import { describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { spy } from '@std/testing/mock';
import type { ExecutionContext } from '@danet/core';
import { createMockLogger } from '@scope/common/testing';
import { SeriesController } from './series.controller.ts';
import type { SeriesService } from './series.service.ts';

describe('SeriesController', () => {
  it('passes the client locale from request context into the service', async () => {
    const aggregate = spy(async () => ({
      id: '507f1f77bcf86cd799439011',
      kind: 'ANIME',
      classification: null,
      mediaId: {
        anidb: null,
        anilist: 789,
        animePlanet: null,
        anisearch: null,
        imdb: null,
        kitsu: null,
        livechart: null,
        notify: null,
        themoviedb: null,
        tvdb: null,
        myanimelist: null,
        tvMazeId: null,
        tvrage: null,
        slug: null,
        shoboi: null,
        trakt: null,
      },
      cover: {},
      banner: null,
      fanart: null,
      format: null,
      status: null,
      source: null,
      title: {
        english: null,
        canonical: null,
        harigana: null,
        japanese: null,
        romaji: null,
        synonyms: null,
      },
      ageRating: null,
      images: [],
      description: null,
      updatedAt: Date.now(),
      moreInfo: null,
      animethemes: [],
      schedule: null,
      trailers: [],
      networks: [],
      airedEpisodes: null,
      broadcast: null,
      isAdult: null,
      homepage: null,
      duration: null,
      chapters: null,
      volumes: null,
      publishedFrom: null,
      publishedTo: null,
    }));

    const { logger } = createMockLogger();
    const controller = new SeriesController(
      { aggregate } as unknown as SeriesService,
      logger,
    );

    const context = {
      get: (key: string) => {
        if (key === 'client-attributes') {
          return {
            locale: 'en-US',
            version: '1.0.0',
            source: 'android',
            code: 'app',
            label: 'AniTrend',
            build: '1',
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
            },
          };
        }

        return undefined;
      },
    } as unknown as ExecutionContext;

    await controller.series({ anilist: 789 }, context);

    assertEquals(aggregate.calls[0]?.args, [{ anilist: 789 }, 'en-US']);
  });
});
```

- [ ] **Step 2: Run the controller test to verify it fails**

Run: `deno test src/package/series/series.controller.test.ts`
Expected: FAIL because the controller does not yet accept `@Context()` or pass locale to the service

- [ ] **Step 3: Update the controller to read client attributes and pass locale**

```ts
import {
  Context,
  Controller,
  type ExecutionContext,
  Get,
} from '@danet/core';
import { Query } from '@danet/zod';
import { ReturnedSchema } from '@danet/zod';
import { getClientAttributes } from '@scope/common/utils';
import { LoggerService } from '@scope/logger';
import { SeriesService } from './series.service.ts';
import { SeriesQuerySchema } from './series.schema.ts';
import type { MediaUnion, SeriesQuery } from './series.types.ts';
import { SeriesSwagger } from './series.swagger.ts';

@Controller('v1')
export class SeriesController {
  constructor(
    private readonly service: SeriesService,
    private readonly logger: LoggerService,
  ) {}

  @Get('series')
  @ReturnedSchema(SeriesSwagger)
  async series(
    @Query(SeriesQuerySchema) query: SeriesQuery,
    @Context() context: ExecutionContext,
  ): Promise<MediaUnion> {
    const client = getClientAttributes(context as never);
    return await this.service.aggregate(query, client?.locale);
  }
}
```

- [ ] **Step 4: Run the controller and service tests together**

Run: `deno test src/package/series/series.controller.test.ts src/package/series/series.service.test.ts`
Expected: PASS with locale delegation and service shaping verified

- [ ] **Step 5: Commit the controller wiring**

```bash
git add src/package/series/series.controller.ts src/package/series/series.controller.test.ts
git commit -m "feat(series): pass request locale to service"
```

### Task 4: Final Verification And Cleanup

**Files:**
- Modify: `src/package/series/series.service.ts`
- Modify: `src/package/series/series.controller.ts`
- Modify: `src/package/series/transformer/series.image-selection.ts`
- Modify: `src/package/series/transformer/series.image-selection.test.ts`
- Modify: `src/package/series/series.service.test.ts`
- Modify: `src/package/series/series.controller.test.ts`

- [ ] **Step 1: Format the changed files**

Run: `deno fmt src/package/series/series.controller.ts src/package/series/series.controller.test.ts src/package/series/series.service.ts src/package/series/series.service.test.ts src/package/series/transformer/series.image-selection.ts src/package/series/transformer/series.image-selection.test.ts src/package/series/transformer/index.ts`
Expected: PASS with no formatting errors

- [ ] **Step 2: Run the focused series tests**

Run: `deno test src/package/series/series.controller.test.ts src/package/series/series.service.test.ts src/package/series/transformer/series.image-selection.test.ts src/package/series/transformer/series.anime.transformer.test.ts src/package/series/transformer/series.manga.transformer.test.ts`
Expected: PASS with all series-facing response shaping and transformer coverage green

- [ ] **Step 3: Run lint and type checks**

Run: `deno task lint && deno task check`
Expected: PASS with no lint or type errors

- [ ] **Step 4: Inspect the final diff before the last commit**

Run: `git diff --stat && git diff -- src/package/series/series.controller.ts src/package/series/series.service.ts src/package/series/transformer/series.image-selection.ts src/package/series/series.controller.test.ts src/package/series/series.service.test.ts src/package/series/transformer/series.image-selection.test.ts src/package/series/transformer/index.ts`
Expected: Only the locale-aware response-shaping files and tests are changed

- [ ] **Step 5: Commit any verification-driven fixes**

```bash
git add src/package/series/series.controller.ts src/package/series/series.controller.test.ts src/package/series/series.service.ts src/package/series/series.service.test.ts src/package/series/transformer/series.image-selection.ts src/package/series/transformer/series.image-selection.test.ts src/package/series/transformer/index.ts
git commit -m "test(series): verify focused image response shaping"
```

## Self-Review Checklist

- Spec coverage: helper selection, service boundary shaping, controller locale access, and verification are all mapped to tasks.
- Placeholder scan: no `TODO`, `TBD`, or “implement later” language remains.
- Type consistency: `selectSeriesImages(images, locale)` and `SeriesService.aggregate(query, locale)` are used consistently across all tasks.
