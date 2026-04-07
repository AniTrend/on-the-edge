import { Injectable } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { MongoService } from '@scope/database';
import { MongoCollectionAdapter } from '@scope/database/collection';
import type { Collection } from '@scope/database/collection';
import type { WithId } from 'mongodb';
import { PeopleResolver } from './people.resolver.ts';
import { peopleTransform } from '../transformer/index.ts';
import type { PeopleDocument } from '../people.types.ts';

const COLLECTION_NAME = 'people';

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

@Injectable()
export class PeopleRepository {
  constructor(
    private readonly mongo: MongoService,
    private readonly logger: LoggerService,
    private readonly resolver: PeopleResolver,
  ) {}

  private get collection(): Collection<PeopleDocument> {
    return new MongoCollectionAdapter(
      this.mongo.collection<PeopleDocument>(COLLECTION_NAME),
    );
  }

  async invoke(
    malId?: number,
    nameHint?: string,
  ): Promise<WithId<PeopleDocument> | null> {
    const now = nowSeconds();

    if (malId !== undefined) {
      const cached = await this.collection.findOne({ malId });

      if (cached && cached.expiresAt > now) {
        this.logger.instance.debug('People cache hit', { malId });
        return cached;
      }
    }

    if (malId === undefined && nameHint) {
      const cached = await this.collection.findOne({ name: nameHint });

      if (cached && cached.expiresAt > now) {
        this.logger.instance.debug('People cache hit by name', {
          malId: cached.malId,
          nameHint,
        });
        return cached;
      }
    }

    const person = await this.resolver.resolve(malId, nameHint);

    if (!person) {
      this.logger.instance.debug('Person not resolved', { malId, nameHint });
      return null;
    }

    const document = peopleTransform(person);

    return await this.collection.findOneAndReplace(
      { malId: document.malId },
      document,
      { upsert: true },
    );
  }
}
