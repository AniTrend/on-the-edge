import { Document, OptionalId, SortDirection } from '@mongodb';

export type Optional<T extends Document> = T | undefined | null;

export type ProjectionOption<T extends Document> = {
  [K in keyof OptionalId<T>]?: 0 | 1;
};

export type SortOption<T extends Document> = {
  [K in keyof OptionalId<T>]?: SortDirection;
};

export type EntityCursor = string | null;
