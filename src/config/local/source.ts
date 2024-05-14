import { Collection } from 'x/mongo';
import { logger } from '../../common/core/logger.ts';
import { ConfigDocument } from './types.d.ts';

export class LocalSource {
  constructor(
    private readonly collection?: Collection<ConfigDocument>,
  ) {}

  getConfig = async (): Promise<ConfigDocument | undefined> => {
    const config = await this.collection?.findOne()
      ?.catch((e) => {
        logger.error(`config.local.source.LocalSource:getConfig: Unable to find config in collection`, e);
        return undefined;
      });

    return config;
  };
}
