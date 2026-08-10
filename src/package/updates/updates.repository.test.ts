import { beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { assertSpyCalls } from '@std/testing/mock';
import { createMockLogger } from '@scope/common/testing';
import type { MongoService } from '@scope/database';
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
import type { UpdateRecord } from './updates.types.ts';
import { UpdatesRepository } from './updates.repository.ts';

class MockMongoCollection {
  constructor(
    private readonly memoryCollection: InMemoryCollection<UpdateRecord>,
  ) { }

  find(filter: Filter<UpdateRecord>, options?: FindOptions<UpdateRecord>) {
    return {
      toArray: () => this.memoryCollection.find(filter, options),
    };
  }

  findOne<T>(
    filter: Filter<UpdateRecord>,
    options?: FindOptions<UpdateRecord>,
  ): Promise<T | null> {
    return this.memoryCollection.findOne(filter, options) as Promise<T | null>;
  }

  insertMany(
    docs: ReadonlyArray<OptionalUnlessRequiredId<UpdateRecord>>,
    options?: BulkWriteOptions,
  ) {
    return this.memoryCollection.insertMany(docs, options);
  }

  updateMany(
    filter: Filter<UpdateRecord>,
    update: UpdateFilter<UpdateRecord>,
    options?: UpdateOptions,
  ) {
    return this.memoryCollection.updateMany(filter, update, options);
  }

  updateOne(
    filter: Filter<UpdateRecord>,
    update: UpdateFilter<UpdateRecord>,
    options?: UpdateOptions,
  ) {
    return this.memoryCollection.updateOne(filter, update, options);
  }

  deleteMany(filter: Filter<UpdateRecord>): Promise<DeleteResult> {
    return this.memoryCollection.deleteMany(filter);
  }

  findOneAndReplace(
    filter: Filter<UpdateRecord>,
    replacement: UpdateRecord,
    options: FindOneAndReplaceOptions,
  ): Promise<WithId<UpdateRecord> | null> {
    return this.memoryCollection.findOneAndReplace(
      filter,
      replacement,
      options,
    );
  }
}

class MockMongoService {
  constructor(private readonly memoryCollection: MockMongoCollection) { }

  collection<T>(_name: string): MockMongoCollection {
    return this.memoryCollection as unknown as MockMongoCollection & T;
  }
}

const createUpdateRecord = (
  overrides: Partial<UpdateRecord> = {},
): UpdateRecord => {
  return {
    product: 'ANITREND_APP',
    channel: 'STABLE',
    tag: 'v2.4.0',
    name: 'Release 2.4.0',
    releaseNotes: null,
    publishedAt: 1_752_000_000_000,
    prerelease: false,
    htmlUrl: 'https://github.com/AniTrend/anitrend-app/releases/tag/v2.4.0',
    assets: [],
    code: 20400,
    version: '2.4.0',
    updatedAt: Date.now(),
    etag: null,
    policyFingerprint: 'fixture-fingerprint',
    ...overrides,
  };
};

describe('UpdatesRepository', () => {
  let collection: InMemoryCollection<UpdateRecord>;
  let logger: ReturnType<typeof createMockLogger>['logger'];
  let loggerSpies: ReturnType<typeof createMockLogger>['spies'];

  beforeEach(() => {
    collection = new InMemoryCollection<UpdateRecord>();
    const loggerStub = createMockLogger();
    logger = loggerStub.logger;
    loggerSpies = loggerStub.spies;
  });

  const createRepository = (): UpdatesRepository => {
    return new UpdatesRepository(
      new MockMongoService(
        new MockMongoCollection(collection),
      ) as unknown as MongoService,
      logger,
    );
  };

  it('inserts a new record on upsert and reads it back by product/channel', async () => {
    const repository = createRepository();
    const record = createUpdateRecord();

    await repository.upsert(record);
    const result = await repository.findByKey('ANITREND_APP', 'STABLE');

    assertEquals(result?.product, 'ANITREND_APP');
    assertEquals(result?.channel, 'STABLE');
    assertEquals(result?.tag, 'v2.4.0');
    assertEquals(result?.code, 20400);
    assertEquals(result?.version, '2.4.0');
    assertEquals(result?.etag, null);
    assertEquals(await collection.countDocuments({}), 1);
  });

  it('replaces an existing record for the same product/channel on upsert', async () => {
    const repository = createRepository();
    await repository.upsert(createUpdateRecord({ code: 20400 }));

    await repository.upsert(
      createUpdateRecord({ tag: 'v2.4.1', code: 20401, version: '2.4.1' }),
    );
    const result = await repository.findByKey('ANITREND_APP', 'STABLE');

    assertEquals(result?.tag, 'v2.4.1');
    assertEquals(result?.code, 20401);
    assertEquals(await collection.countDocuments({}), 1);
  });

  it('keeps records of different product/channel identities separate', async () => {
    const repository = createRepository();
    await repository.upsert(
      createUpdateRecord({ product: 'ANITREND_APP', channel: 'STABLE' }),
    );
    await repository.upsert(
      createUpdateRecord({ product: 'ANITREND_APP', channel: 'BETA' }),
    );
    await repository.upsert(
      createUpdateRecord({ product: 'ANITREND_V2', channel: 'STABLE' }),
    );

    const appStable = await repository.findByKey('ANITREND_APP', 'STABLE');
    const appBeta = await repository.findByKey('ANITREND_APP', 'BETA');
    const v2Stable = await repository.findByKey('ANITREND_V2', 'STABLE');
    const v2Beta = await repository.findByKey('ANITREND_V2', 'BETA');

    assertEquals(appStable?.channel, 'STABLE');
    assertEquals(appBeta?.channel, 'BETA');
    assertEquals(v2Stable?.product, 'ANITREND_V2');
    assertEquals(v2Beta, null);
    assertEquals(await collection.countDocuments({}), 3);
  });

  it('touches freshness without replacing the release data', async () => {
    const repository = createRepository();
    await repository.upsert(
      createUpdateRecord({ tag: 'v2.4.0', updatedAt: 1_000 }),
    );

    await repository.touchFreshness(
      'ANITREND_APP',
      'STABLE',
      9_000,
      '"etag-2"',
      'new-fingerprint',
    );
    const result = await repository.findByKey('ANITREND_APP', 'STABLE');

    assertEquals(result?.updatedAt, 9_000);
    assertEquals(result?.etag, '"etag-2"');
    assertEquals(result?.policyFingerprint, 'new-fingerprint');
    assertEquals(result?.tag, 'v2.4.0');
    assertEquals(await collection.countDocuments({}), 1);
  });

  it('returns null when no record exists for the product/channel', async () => {
    const repository = createRepository();
    const result = await repository.findByKey('ANITREND_V2', 'EXPERIMENTAL');
    assertEquals(result, null);
  });

  it('returns the newest cached record when duplicates exist', async () => {
    const repository = createRepository();
    // Duplicates can only exist before the unique composite index is
    // applied; reads must still be deterministic.
    await collection.insertMany([
      createUpdateRecord({ code: 20399, updatedAt: 1_000 }),
      createUpdateRecord({ code: 20400, updatedAt: 3_000 }),
    ]);

    const result = await repository.findByKey('ANITREND_APP', 'STABLE');

    assertEquals(result?.code, 20400);
    assertEquals(result?.updatedAt, 3_000);
    assertEquals(
      await collection.countDocuments({ channel: 'STABLE' }),
      2,
    );
  });

  it('returns all records ordered by updatedAt descending', async () => {
    const repository = createRepository();
    await collection.insertMany([
      createUpdateRecord({ channel: 'STABLE', updatedAt: 1_000 }),
      createUpdateRecord({ channel: 'BETA', updatedAt: 3_000 }),
      createUpdateRecord({ channel: 'EXPERIMENTAL', updatedAt: 2_000 }),
    ]);

    const results = await repository.findAll();

    assertEquals(results.map((record) => record.channel), [
      'BETA',
      'EXPERIMENTAL',
      'STABLE',
    ]);
  });

  it('drops cached records that violate the runtime schema on read', async () => {
    const repository = createRepository();
    await collection.insertMany([
      createUpdateRecord({ channel: 'STABLE', code: 20401 }),
      createUpdateRecord({
        channel: 'BETA',
        code: null as unknown as number,
      }),
    ]);

    const result = await repository.findByKey('ANITREND_APP', 'BETA');

    assertEquals(result, null);
    assertEquals(await collection.countDocuments({}), 1);
    assertEquals((await collection.find({}, {})).map((doc) => doc.channel), [
      'STABLE',
    ]);
    assertSpyCalls(loggerSpies.warn, 1);
  });

  it('drops legacy version.json-shaped records on read', async () => {
    const repository = createRepository();
    await collection.insertMany([
      createUpdateRecord({ channel: 'STABLE' }),
      // Legacy record matching the key but missing all release fields
      {
        product: 'ANITREND_APP',
        channel: 'BETA',
        code: 42,
        version: '2.4.0',
        migration: null,
        minSdk: 26,
        releaseNotes: null,
        appId: 'com.anitrend.app',
        updatedAt: 1_000,
      } as unknown as UpdateRecord,
    ]);

    const result = await repository.findByKey('ANITREND_APP', 'BETA');

    assertEquals(result, null);
    assertEquals(await collection.countDocuments({}), 1);
    assertSpyCalls(loggerSpies.warn, 1);
  });

  it('evaluates staleness against the cached updatedAt', async () => {
    const repository = createRepository();
    const now = 1_752_000_000_000;

    assertEquals(repository.isStale({ updatedAt: now - 60_000 }, now), false);
    assertEquals(
      repository.isStale({ updatedAt: now - 13 * 60 * 60 * 1000 }, now),
      true,
    );
  });
});
