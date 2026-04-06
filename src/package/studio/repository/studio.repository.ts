import { Injectable } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { MongoService } from '@scope/database';
import { MongoCollectionAdapter } from '@scope/database/collection';
import type { Collection } from '@scope/database/collection';
import type { WithId } from 'mongodb';
import { StudioResolver } from './studio.resolver.ts';
import { studioTransform } from '../transformer/index.ts';
import type { StudioDocument } from '../studio.types.ts';

const COLLECTION_NAME = 'studios';

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

@Injectable()
export class StudioRepository {
  constructor(
    private readonly mongo: MongoService,
    private readonly logger: LoggerService,
    private readonly resolver: StudioResolver,
  ) { }

  private get collection(): Collection<StudioDocument> {
    return new MongoCollectionAdapter(
      this.mongo.collection<StudioDocument>(COLLECTION_NAME),
    );
  }

  async invoke(
    malId: number,
    nameHint?: string,
  ): Promise<WithId<StudioDocument> | null> {
    const now = nowSeconds();

    const cached = await this.collection.findOne({ malId });

    if (cached && cached.expiresAt > now) {
      this.logger.instance.debug('Studio cache hit', { malId });
      return cached;
    }

    const producer = await this.resolver.resolve(malId, nameHint);

    if (!producer) {
      this.logger.instance.debug('Studio not resolved', { malId, nameHint });
      return null;
    }

    const document = studioTransform(producer);

    return await this.collection.findOneAndReplace(
      { malId },
      document,
      { upsert: true },
    );
  }
}
