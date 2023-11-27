import { Document } from 'x/mongo';
import { Local } from '../types/core.d.ts';

export const getCollection = <T extends Document>(
  collection: string,
  database: Local,
) => database?.collection<T>(collection);
