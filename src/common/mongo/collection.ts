import { Document } from 'npm/mongodb';
import { Local } from '../types/core.d.ts';

export const collection = <T extends Document>(
  name: string,
  database: Local,
) => database?.collection<T>(name);
