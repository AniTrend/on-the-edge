import { beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals, assertExists } from '@std/assert';
import { createMockLogger } from '@scope/common/testing';
import { type MongoService } from '@scope/database';
import { InMemoryCollection } from '@scope/database/testing';
import type {
  BulkWriteOptions,
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
});
