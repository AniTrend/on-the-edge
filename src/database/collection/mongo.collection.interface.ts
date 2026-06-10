import type {
  BulkWriteOptions,
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

export interface Collection<T extends Document> {
  updateMany(
    filter: Filter<T>,
    update: UpdateFilter<T> | T[],
    options?: UpdateOptions,
  ): Promise<UpdateResult<T>>;

  insertMany(
    docs: ReadonlyArray<OptionalUnlessRequiredId<T>>,
    options?: BulkWriteOptions,
  ): Promise<InsertManyResult<T>>;

  find(
    filter: Filter<T>,
    options?: FindOptions<T>,
  ): Promise<WithId<T>[]>;

  findOne(
    filter: Filter<T>,
    options?: FindOptions<T>,
  ): Promise<WithId<T> | null>;

  findOneAndReplace(
    filter: Filter<T>,
    replacement: T,
    options: FindOneAndReplaceOptions,
  ): Promise<WithId<T> | null>;

  updateOne(
    filter: Filter<T>,
    update: UpdateFilter<T>,
    options?: UpdateOptions,
  ): Promise<UpdateResult>;

  deleteMany(filter: Filter<T>): Promise<DeleteResult>;
}
