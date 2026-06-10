import type {
  BulkWriteOptions,
  Collection as MongoCollection,
  DeleteResult,
  Document,
  Filter,
  FindOneAndReplaceOptions,
  FindOptions,
  InsertManyResult,
  OptionalUnlessRequiredId,
  UpdateFilter,
  UpdateOptions,
  UpdateResult,
  WithId,
} from 'mongodb';
import type { Collection } from './mongo.collection.interface.ts';

export class MongoCollectionAdapter<T extends Document>
  implements Collection<T> {
  constructor(
    private readonly collection: MongoCollection<T>,
  ) {}

  async updateMany(
    filter: Filter<T>,
    update: UpdateFilter<T> | T[],
    options?: UpdateOptions,
  ): Promise<UpdateResult<T>> {
    return await this.collection.updateMany(filter, update, options);
  }

  async insertMany(
    docs: ReadonlyArray<OptionalUnlessRequiredId<T>>,
    options?: BulkWriteOptions,
  ): Promise<InsertManyResult<T>> {
    return await this.collection.insertMany(docs, options);
  }

  async find(
    filter: Filter<T>,
    options?: FindOptions<T> | undefined,
  ): Promise<WithId<T>[]> {
    const cursor = this.collection.find(filter, options);
    const result = await cursor.toArray();
    return result;
  }

  async findOne(
    filter: Filter<T>,
    options?: FindOptions,
  ): Promise<WithId<T> | null> {
    const result = await this.collection.findOne<WithId<T>>(
      filter,
      options,
    );
    return result;
  }

  async findOneAndReplace(
    filter: Filter<T>,
    replacement: T,
    options: FindOneAndReplaceOptions,
  ): Promise<WithId<T> | null> {
    const result = await this.collection.findOneAndReplace(
      filter,
      replacement,
      {
        upsert: options.upsert,
        returnDocument: options.returnDocument ?? 'after',
      },
    );
    return result;
  }

  async updateOne(
    filter: Filter<T>,
    update: UpdateFilter<T>,
    options?: UpdateOptions,
  ): Promise<UpdateResult> {
    const result = await this.collection.updateOne(filter, update, {
      upsert: options?.upsert,
    });

    return result;
  }

  async deleteMany(filter: Filter<T>): Promise<DeleteResult> {
    return await this.collection.deleteMany(filter);
  }
}
