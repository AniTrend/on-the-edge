import { Injectable } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { MongoService } from '@scope/database';
import { MongoCollectionAdapter } from '@scope/database/collection';
import type { Collection } from '@scope/database/collection';
import type { WithId } from 'mongodb';
import { CharacterResolver } from './character.resolver.ts';
import { characterTransform } from '../transformer/index.ts';
import type { CharacterDocument } from '../character.types.ts';

const COLLECTION_NAME = 'characters';

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

@Injectable()
export class CharacterRepository {
  constructor(
    private readonly mongo: MongoService,
    private readonly logger: LoggerService,
    private readonly resolver: CharacterResolver,
  ) {}

  private get collection(): Collection<CharacterDocument> {
    return new MongoCollectionAdapter(
      this.mongo.collection<CharacterDocument>(COLLECTION_NAME),
    );
  }

  async invoke(
    malId?: number,
    nameHint?: string,
  ): Promise<WithId<CharacterDocument> | null> {
    const now = nowSeconds();

    if (malId !== undefined) {
      const cached = await this.collection.findOne({ malId });

      if (cached && cached.expiresAt > now) {
        this.logger.instance.debug('Character cache hit', { malId });
        return cached;
      }
    }

    if (malId === undefined && nameHint) {
      const cached = await this.collection.findOne({ name: nameHint });

      if (cached && cached.expiresAt > now) {
        this.logger.instance.debug('Character cache hit by name', {
          malId: cached.malId,
          nameHint,
        });
        return cached;
      }
    }

    const character = await this.resolver.resolve(malId, nameHint);

    if (!character) {
      this.logger.instance.debug('Character not resolved', { malId, nameHint });
      return null;
    }

    const document = characterTransform(character);

    return await this.collection.findOneAndReplace(
      { malId: document.malId },
      document,
      { upsert: true },
    );
  }
}
