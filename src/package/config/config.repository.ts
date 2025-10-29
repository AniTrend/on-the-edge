import { Injectable } from '@danet/core';
import { MongoService } from '@scope/database';
import { ConfigDocument } from './config.document.ts';
import { Collection } from 'mongodb';
import { CacheService } from '@scope/cache';
import { LoggerService } from '@scope/logger';

@Injectable()
export class ConfigRepository {
  private readonly COLLECTION_NAME = 'config';
  constructor(
    private readonly mongo: MongoService,
    private readonly cache: CacheService,
    private readonly logger: LoggerService,
  ) {}

  get collection(): Collection<ConfigDocument> {
    return this.mongo.collection<ConfigDocument>(this.COLLECTION_NAME);
  }

  async getConfig(): Promise<ConfigDocument | null> {
    const cached = await this.cache.get<ConfigDocument>(this.COLLECTION_NAME);
    if (cached) return cached;
    const config = await this.collection.findOne()
      .then((doc) => {
        if (doc) {
          this.cache.set(this.COLLECTION_NAME, doc, { ttl: 60 * 60 * 4 });
        }
        return doc;
      })
      .catch((err) => {
        this.logger.instance.error('Failed to fetch config', err);
        return null;
      });
    return config;
  }
}
