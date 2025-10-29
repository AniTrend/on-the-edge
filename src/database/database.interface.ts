import { Collection, Document } from 'mongodb';

export interface IDatabaseService {
  collection<T extends Document>(name: string): Collection<T>;
}
