import { Injectable } from '@danet/core';
import { MongoService, type Sorting } from '@scope/database';
import { LoggerService } from '@scope/logger';
import { Collection, MongoCollectionAdapter } from '@scope/database/collection';
import { UpdateRecordSchema } from './updates.schema.ts';
import type { UpdateRecordWithId } from './updates.document.ts';
import type { UpdateChannel, UpdateRecord } from './updates.types.ts';

const COLLECTION_NAME = 'updates';

/**
 * A cached record older than this is considered stale. This is also the
 * upper bound for the configured refresh interval (see UpdatesService),
 * so refreshed records never outlive the stale threshold.
 */
export const STALE_AFTER_HOURS = 12;
const STALE_AFTER_MS = STALE_AFTER_HOURS * 60 * 60 * 1000;

/**
 * Mongo-backed cache of the latest update release per channel. The
 * unique index on `channel` (created by DatabaseIndexService) enforces
 * one record per channel; reads sort by updatedAt descending so they
 * stay deterministic even if duplicates exist. Persisted documents are
 * re-validated against the runtime schema on read; invalid records are
 * dropped, mirroring the news repository.
 */
@Injectable()
export class UpdatesRepository {
  private readonly collection: Collection<UpdateRecord>;

  constructor(
    private readonly mongo: MongoService,
    private readonly logger: LoggerService,
  ) {
    this.collection = new MongoCollectionAdapter(
      this.mongo.collection<UpdateRecord>(COLLECTION_NAME),
    );
  }

  /** Insert or replace the cached record for the record's channel. */
  async upsert(record: UpdateRecord): Promise<void> {
    await this.collection.updateOne(
      { channel: record.channel },
      { $set: record },
      { upsert: true },
    );
  }

  async findByChannel(channel: UpdateChannel): Promise<UpdateRecord | null> {
    const sort: Sorting<UpdateRecordWithId> = {
      updatedAt: 'desc',
      _id: 'desc',
    };
    const document = await this.collection.findOne({ channel }, { sort });
    if (!document) return null;
    return this.toValidatedRecord(document);
  }

  async findAll(): Promise<UpdateRecord[]> {
    const sort: Sorting<UpdateRecordWithId> = {
      updatedAt: 'desc',
      _id: 'desc',
    };
    const documents = await this.collection.find({}, { sort });
    const records: UpdateRecord[] = [];
    for (const document of documents) {
      const record = await this.toValidatedRecord(document);
      if (record) records.push(record);
    }
    return records;
  }

  isStale(
    record: Pick<UpdateRecord, 'updatedAt'>,
    now: number = Date.now(),
  ): boolean {
    return now - record.updatedAt >= STALE_AFTER_MS;
  }

  private async toValidatedRecord(
    document: UpdateRecordWithId,
  ): Promise<UpdateRecord | null> {
    const parsed = UpdateRecordSchema.safeParse(document);
    if (parsed.success) return parsed.data;

    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.join('.') || 'root';
      return `${path}: ${issue.message}`;
    }).join('; ');
    this.logger.instance.warn(
      `Dropping invalid cached update record ${document._id.toHexString()}: ${issues}`,
    );
    await this.collection.deleteMany({ _id: { $in: [document._id] } });
    return null;
  }
}
