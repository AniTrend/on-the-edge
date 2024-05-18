import { Collection, WithId } from 'npm/mongodb';
import { logger } from '../../common/core/logger.ts';
import { ConfigDocument } from './types.d.ts';
import { Optional } from '../../common/mongo/types.d.ts';

export class LocalSource {
  constructor(
    private readonly collection?: Collection<ConfigDocument>,
  ) {}

  getConfig = async (): Promise<Optional<WithId<ConfigDocument>>> => {
    const config = await this.collection?.findOne()
      ?.catch((e) => {
        logger.error(
          `config.local.source:getConfig: Unable to find config in collection`,
          e,
        );
        return undefined;
      });

    return config;
  };
}
