import { Document, Sort, SortDirection, WithoutId } from 'mongodb';

export type Optional<T extends Document> = T | undefined | null;

/**
 * MongoDB collection projection type, enforcing no `_id` field, and key names from T only.
 */
export type Project<T extends Document> = {
  [K in keyof WithoutId<T>]?: 0 | 1;
};

/**
 * MongoDB collection sort type, enforcing no `_id` field, and key names from T only.
 */
export type Sorting<T extends Document> =
  & {
    [K in keyof WithoutId<T>]?: SortDirection;
  }
  & Sort;

/**
 * Opaque cursor for pagination.
 * Base64-encoded JSON containing position and filter hash.
 */
export type EntityCursor = string;
