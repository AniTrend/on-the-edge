import { Document, ObjectId, Sort } from 'npm/mongodb';
import { ProjectionOption, SortOption } from './types.d.ts';

export const projectionOf = <T extends Document>(
  projection: ProjectionOption<T>,
) => projection;

export const sortOf = <T extends Document>(option: SortOption<T>): Sort =>
  option as Sort;

export const idOf = (id: ObjectId): string => id.toHexString();
