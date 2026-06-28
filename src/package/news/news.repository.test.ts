import { beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals, assertExists } from '@std/assert';
import { createMockLogger } from '@scope/common/testing';
import { type MongoService } from '@scope/database';
import { InMemoryCollection } from '@scope/database/testing';
import type {
  BulkWriteOptions,
  DeleteResult,
  Filter,
  FindOneAndReplaceOptions,
  FindOptions,
  OptionalUnlessRequiredId,
  UpdateFilter,
  UpdateOptions,
  WithId,
} from 'mongodb';
import type { OtakumodeFeed, OtakumodeService } from '@scope/service/otakumode';
import type { NewsDocument } from './news.document.ts';
import { NewsRepository } from './news.repository.ts';

class MockMongoCollection {
  constructor(
    private readonly memoryCollection: InMemoryCollection<NewsDocument>,
  ) {}

  find(filter: Filter<NewsDocument>, options?: FindOptions<NewsDocument>) {
    return {
      toArray: () => this.memoryCollection.find(filter, options),
    };
  }

  findOne<T>(
    filter: Filter<NewsDocument>,
    options?: FindOptions<NewsDocument>,
  ): Promise<T | null> {
    return this.memoryCollection.findOne(filter, options) as Promise<T | null>;
  }

  insertMany(
    docs: ReadonlyArray<OptionalUnlessRequiredId<NewsDocument>>,
    options?: BulkWriteOptions,
  ) {
    return this.memoryCollection.insertMany(docs, options);
  }

  updateMany(
    filter: Filter<NewsDocument>,
    update: UpdateFilter<NewsDocument>,
    options?: UpdateOptions,
  ) {
    return this.memoryCollection.updateMany(filter, update, options);
  }

  updateOne(
    filter: Filter<NewsDocument>,
    update: UpdateFilter<NewsDocument>,
    options?: UpdateOptions,
  ) {
    return this.memoryCollection.updateOne(filter, update, options);
  }

  deleteMany(filter: Filter<NewsDocument>): Promise<DeleteResult> {
    return this.memoryCollection.deleteMany(filter);
  }

  findOneAndReplace(
    filter: Filter<NewsDocument>,
    replacement: NewsDocument,
    options: FindOneAndReplaceOptions,
  ): Promise<WithId<NewsDocument> | null> {
    return this.memoryCollection.findOneAndReplace(
      filter,
      replacement,
      options,
    );
  }
}

class MockMongoService {
  constructor(private readonly memoryCollection: MockMongoCollection) {}

  collection<T>(_name: string): MockMongoCollection {
    return this.memoryCollection as unknown as MockMongoCollection & T;
  }
}

class MockOtakumodeService {
  constructor(private readonly payload: OtakumodeFeed = []) {}

  async rss(): Promise<OtakumodeFeed> {
    return this.payload;
  }
}

const createNewsDocument = (
  overrides: Partial<NewsDocument> = {},
): NewsDocument => {
  return {
    id: 'news-1',
    title: 'Test News',
    link: 'https://example.com/news/test',
    description: 'Test description',
    content: 'Test content',
    category: null,
    genre: null,
    area: null,
    lang: null,
    publishedOn: 1_735_700_000,
    image: null,
    updatedAt: Date.now(),
    ...overrides,
  };
};

describe('NewsRepository', () => {
  let collection: InMemoryCollection<NewsDocument>;
  let logger: ReturnType<typeof createMockLogger>['logger'];

  beforeEach(() => {
    collection = new InMemoryCollection<NewsDocument>();
    logger = createMockLogger().logger;
  });

  it('drops cached documents that violate the public news schema', async () => {
    const repository = new NewsRepository(
      new MockMongoService(
        new MockMongoCollection(collection),
      ) as unknown as MongoService,
      new MockOtakumodeService() as unknown as OtakumodeService,
      logger,
    );

    await collection.insertMany([
      createNewsDocument({ id: 'valid-news', publishedOn: 1_735_700_001 }),
      createNewsDocument({
        id: 'invalid-news',
        publishedOn: null as unknown as number,
      }),
    ]);

    const result = await repository.paging({ limit: 10 });

    assertEquals(result.count, 1);
    assertEquals(result.data.map((item) => item.id), ['valid-news']);
    assertEquals(result.data[0].publishedOn, 1_735_700_001);
    assertExists(result.first);
    assertEquals(result.first, result.last);
  });

  it('purges cached documents that violate the public news schema', async () => {
    const repository = new NewsRepository(
      new MockMongoService(
        new MockMongoCollection(collection),
      ) as unknown as MongoService,
      new MockOtakumodeService() as unknown as OtakumodeService,
      logger,
    );

    await collection.insertMany([
      createNewsDocument({ id: 'valid-news', publishedOn: 1_735_700_001 }),
      createNewsDocument({
        id: 'invalid-news',
        publishedOn: null as unknown as number,
      }),
    ]);

    await repository.paging({ limit: 10 });

    assertEquals(await collection.countDocuments({}), 1);
    assertEquals((await collection.find({}, {})).map((item) => item.id), [
      'valid-news',
    ]);
  });

  it('drops remote RSS items with non-finite publishedOn values before insert', async () => {
    const repository = new NewsRepository(
      new MockMongoService(
        new MockMongoCollection(collection),
      ) as unknown as MongoService,
      new MockOtakumodeService([
        {
          title: 'Valid News',
          link: 'https://example.com/news/valid',
          description: 'Valid description',
          'content:encoded': 'Valid content',
          pubDate: 1_735_700_100,
          guid: 'valid-news',
          mainId: 'valid-news',
          category: null,
          genre: null,
          area: null,
          lang: null,
        },
        {
          title: 'Invalid News',
          link: 'https://example.com/news/invalid',
          description: 'Invalid description',
          'content:encoded': 'Invalid content',
          pubDate: Number.NaN,
          guid: 'invalid-news',
          mainId: 'invalid-news',
          category: null,
          genre: null,
          area: null,
          lang: null,
        },
      ]) as unknown as OtakumodeService,
      logger,
    );

    const result = await repository.feed({ locale: 'en-US' });

    assertEquals(result.length, 1);
    assertEquals(result[0].id, 'valid-news');
    assertEquals(await collection.countDocuments({}), 1);
  });

  it('bypasses cache and fetches RSS when last updatedAt is older than 12 hours', async () => {
    const thirteenHoursAgo = Date.now() - 13 * 60 * 60 * 1000;

    const repository = new NewsRepository(
      new MockMongoService(
        new MockMongoCollection(collection),
      ) as unknown as MongoService,
      new MockOtakumodeService([
        {
          title: 'Fresh RSS News',
          link: 'https://example.com/news/fresh',
          description: 'Fresh RSS description',
          'content:encoded': 'Fresh RSS content',
          pubDate: 1_740_000_000,
          guid: 'fresh-rss',
          mainId: 'fresh-rss',
          category: null,
          genre: null,
          area: null,
          lang: null,
        },
      ]) as unknown as OtakumodeService,
      logger,
    );

    // Insert a stale cached document from 13 hours ago to
    // ensure the 12-hour cache threshold is exceeded.
    await collection.insertMany([
      createNewsDocument({
        id: 'stale-cached',
        title: 'Stale Cached News',
        link: 'https://example.com/news/stale',
        description: 'Stale cached description',
        content: 'Stale cached content',
        publishedOn: 1_730_000_000,
        updatedAt: thirteenHoursAgo,
      }),
    ]);

    const result = await repository.feed({ locale: 'en-US' });

    // Should return the fresh RSS item, not the stale cached one.
    assertEquals(result.length, 1);
    assertEquals(result[0].id, 'fresh-rss');
    assertEquals(result[0].title, 'Fresh RSS News');
  });
});
