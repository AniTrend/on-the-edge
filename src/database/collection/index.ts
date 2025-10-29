/**
 * Collection abstraction module.
 *
 * Provides a minimal interface for MongoDB-like operations with support for
 * both production (MongoDB) and testing (in-memory) implementations.
 *
 * @module @scope/database/collection
 *
 * @example Production usage:
 * ```typescript
 * import { MongoClient } from 'mongodb';
 * import { MongoCollectionAdapter, type Collection } from '@scope/database/collection';
 *
 * const client = new MongoClient(mongoUrl);
 * await client.connect();
 * const mongoCollection = db.collection<EpisodeDocument>('episodes');
 * const collection: Collection<EpisodeDocument> = new MongoCollectionAdapter(mongoCollection);
 * ```
 *
 * @example Testing usage:
 * ```typescript
 * import { InMemoryCollection } from '@scope/testing';
 * import { type Collection } from '@scope/collection';
 *
 * const collection: Collection<EpisodeDocument> = new InMemoryCollection();
 * ```
 */

export * from './mongo.collection.interface.ts';
export * from './mongo.collection.adapter.ts';
