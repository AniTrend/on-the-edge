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
  ) {}

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
  constructor(private readonly memoryCollection: MockMongoCollection) {}

  collection<T>(_name: string): MockMongoCollection {
    return this.memoryCollection as unknown as MockMongoCollection & T;
  }
}

const createUpdateRecord = (
  overrides: Partial<UpdateRecord> = {},
): UpdateRecord => {
  return {
    channel: 'STABLE',
    code: 42,
    version: '2.4.0',
    migration: true,
    minSdk: 26,
    releaseNotes: null,
    appId: 'com.anitrend.app',
    updatedAt: Date.now(),
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

  it('inserts a new record on upsert and reads it back', async () => {
    const repository = createRepository();
    const record = createUpdateRecord();

    await repository.upsert(record);
    const result = await repository.findByChannel('STABLE');

    assertEquals(result?.channel, 'STABLE');
    assertEquals(result?.code, 42);
    assertEquals(result?.version, '2.4.0');
    assertEquals(result?.migration, true);
    assertEquals(result?.minSdk, 26);
    assertEquals(result?.releaseNotes, null);
    assertEquals(result?.appId, 'com.anitrend.app');
    assertEquals(result?.updatedAt, record.updatedAt);
    assertEquals(await collection.countDocuments({}), 1);
  });

  it('replaces an existing record for the same channel on upsert', async () => {
    const repository = createRepository();
    await repository.upsert(createUpdateRecord({ code: 42 }));

    await repository.upsert(
      createUpdateRecord({ code: 43, version: '2.4.1' }),
    );
    const result = await repository.findByChannel('STABLE');

    assertEquals(result?.code, 43);
    assertEquals(result?.version, '2.4.1');
    assertEquals(await collection.countDocuments({}), 1);
  });

  it('keeps records of different channels separate', async () => {
    const repository = createRepository();
    await repository.upsert(createUpdateRecord({ channel: 'STABLE' }));
    await repository.upsert(createUpdateRecord({ channel: 'BETA' }));

    const stable = await repository.findByChannel('STABLE');
    const beta = await repository.findByChannel('BETA');
    const experimental = await repository.findByChannel('EXPERIMENTAL');

    assertEquals(stable?.channel, 'STABLE');
    assertEquals(beta?.channel, 'BETA');
    assertEquals(experimental, null);
    assertEquals(await collection.countDocuments({}), 2);
  });

  it('returns null when no record exists for the channel', async () => {
    const repository = createRepository();
    const result = await repository.findByChannel('EXPERIMENTAL');
    assertEquals(result, null);
  });

  it('returns the newest cached record when duplicates exist', async () => {
    const repository = createRepository();
    // Duplicates can only exist before the unique channel index is
    // applied; reads must still be deterministic.
    await collection.insertMany([
      createUpdateRecord({ channel: 'STABLE', code: 41, updatedAt: 1_000 }),
      createUpdateRecord({ channel: 'STABLE', code: 42, updatedAt: 3_000 }),
    ]);

    const result = await repository.findByChannel('STABLE');

    assertEquals(result?.code, 42);
    assertEquals(result?.updatedAt, 3_000);
    assertEquals(await collection.countDocuments({ channel: 'STABLE' }), 2);
  });

  it('breaks updatedAt ties deterministically by _id descending', async () => {
    const repository = createRepository();
    await collection.insertMany([
      createUpdateRecord({ channel: 'STABLE', code: 41, updatedAt: 2_000 }),
      createUpdateRecord({ channel: 'STABLE', code: 42, updatedAt: 2_000 }),
    ]);

    const result = await repository.findByChannel('STABLE');

    // Same updatedAt: the later-inserted record has the higher _id and
    // must win, mirroring the findAll tie-breaker.
    assertEquals(result?.code, 42);
    assertEquals(result?.updatedAt, 2_000);
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
      createUpdateRecord({ channel: 'STABLE', code: 43 }),
      createUpdateRecord({
        channel: 'BETA',
        code: null as unknown as number,
      }),
    ]);

    const result = await repository.findByChannel('BETA');

    assertEquals(result, null);
    assertEquals(await collection.countDocuments({}), 1);
    assertEquals((await collection.find({}, {})).map((doc) => doc.channel), [
      'STABLE',
    ]);
    assertSpyCalls(loggerSpies.warn, 1);
  });

  it('drops legacy records carrying null migration on read', async () => {
    const repository = createRepository();
    await collection.insertMany([
      createUpdateRecord({ channel: 'STABLE', code: 43 }),
      createUpdateRecord({
        channel: 'BETA',
        migration: null as never,
      }),
    ]);

    const result = await repository.findByChannel('BETA');

    assertEquals(result, null);
    assertEquals(await collection.countDocuments({}), 1);
    assertEquals((await collection.find({}, {})).map((doc) => doc.channel), [
      'STABLE',
    ]);
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
