import { beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals, assertExists } from '@std/assert';
import { createMockLogger } from '@scope/common/testing';
import { type MongoService } from '@scope/database';
import { InMemoryCollection } from '@scope/database/testing';
import type {
  BulkWriteOptions,
  Filter,
  FindOptions,
  InsertManyResult,
  OptionalUnlessRequiredId,
} from 'mongodb';
import {
  type PushDeliveryAttemptDocument,
  PushDeliveryAttemptRepository,
} from './push-delivery-attempt.repository.ts';

// --- Mock wrappers ---

class MockMongoCollection {
  constructor(
    private readonly memoryCollection: InMemoryCollection<
      PushDeliveryAttemptDocument
    >,
  ) {}

  find(
    filter: Filter<PushDeliveryAttemptDocument>,
    options?: FindOptions<PushDeliveryAttemptDocument>,
  ) {
    return {
      toArray: () => this.memoryCollection.find(filter, options),
    };
  }

  insertMany(
    docs: ReadonlyArray<OptionalUnlessRequiredId<PushDeliveryAttemptDocument>>,
    options?: BulkWriteOptions,
  ): Promise<InsertManyResult<PushDeliveryAttemptDocument>> {
    return this.memoryCollection.insertMany(docs, options);
  }
}

class MockMongoService {
  constructor(private readonly memoryCollection: MockMongoCollection) {}

  collection<T>(_name: string): MockMongoCollection {
    return this.memoryCollection as unknown as MockMongoCollection & T;
  }
}

// --- Test helper ---

const createDeliveryDoc = (
  overrides: Partial<PushDeliveryAttemptDocument> = {},
): PushDeliveryAttemptDocument => ({
  installationId: 'test-install-1',
  instance: 'default',
  endpointHash: 'sha256hash',
  type: 'push.test',
  id: 'msg-1',
  success: true,
  gone: false,
  latencyMs: 100,
  attemptedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

// --- Tests ---

describe('PushDeliveryAttemptRepository', () => {
  let collection: InMemoryCollection<PushDeliveryAttemptDocument>;
  let logger: ReturnType<typeof createMockLogger>['logger'];

  beforeEach(() => {
    collection = new InMemoryCollection<PushDeliveryAttemptDocument>();
    logger = createMockLogger().logger;
  });

  const createRepo = () =>
    new PushDeliveryAttemptRepository(
      new MockMongoService(
        new MockMongoCollection(collection),
      ) as unknown as MongoService,
      logger,
    );

  describe('insert', () => {
    it('persists a document that can be found by findByInstallation', async () => {
      const repo = createRepo();
      const doc = createDeliveryDoc({
        installationId: 'inst-1',
        id: 'msg-abc',
      });

      await repo.insert(doc);

      const results = await repo.findByInstallation('inst-1');
      assertEquals(results.length, 1);
      assertExists(results[0]);
      assertEquals(results[0].installationId, 'inst-1');
      assertEquals(results[0].id, 'msg-abc');
      assertEquals(results[0].success, true);
      assertEquals(results[0].latencyMs, 100);
      assertEquals(
        results[0].attemptedAt.getTime(),
        new Date('2026-01-01T00:00:00Z').getTime(),
      );
    });
  });

  describe('findByInstallation', () => {
    it('returns documents sorted by attemptedAt descending', async () => {
      const repo = createRepo();

      await repo.insert(
        createDeliveryDoc({
          installationId: 'inst-2',
          id: 'oldest',
          attemptedAt: new Date('2026-01-01T00:00:00Z'),
        }),
      );
      await repo.insert(
        createDeliveryDoc({
          installationId: 'inst-2',
          id: 'middle',
          attemptedAt: new Date('2026-01-02T00:00:00Z'),
        }),
      );
      await repo.insert(
        createDeliveryDoc({
          installationId: 'inst-2',
          id: 'newest',
          attemptedAt: new Date('2026-01-03T00:00:00Z'),
        }),
      );

      const results = await repo.findByInstallation('inst-2');

      assertEquals(results.length, 3);
      assertEquals(results[0].id, 'newest');
      assertEquals(results[1].id, 'middle');
      assertEquals(results[2].id, 'oldest');
    });

    it('respects the limit parameter', async () => {
      const repo = createRepo();

      for (let i = 0; i < 5; i++) {
        await repo.insert(
          createDeliveryDoc({
            installationId: 'inst-3',
            id: `msg-${i}`,
            attemptedAt: new Date(`2026-01-0${i + 1}T00:00:00Z`),
          }),
        );
      }

      const results = await repo.findByInstallation('inst-3', 2);

      assertEquals(results.length, 2);
      // Most recent first (msg-4 has date 2026-01-05, msg-3 has 2026-01-04)
      assertEquals(results[0].id, 'msg-4');
      assertEquals(results[1].id, 'msg-3');
    });

    it('returns empty array for unknown installation', async () => {
      const repo = createRepo();

      await repo.insert(
        createDeliveryDoc({
          installationId: 'inst-known',
          id: 'some-msg',
        }),
      );

      const results = await repo.findByInstallation('nobody');
      assertEquals(results, []);
    });
  });
});
