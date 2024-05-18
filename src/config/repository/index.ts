import { Features } from '../../common/types/core.d.ts';
import { ClientConfiguration } from '../transformer/types.d.ts';
import { LocalSource } from '../local/index.ts';
import { transform } from '../transformer/index.ts';
import { logger } from '../../common/core/index.ts';

export class Repository {
  constructor(
    private growth: Features,
    private local: LocalSource,
  ) {}

  getConfiguration = async (): Promise<ClientConfiguration | undefined> => {
    const config = await this.local.getConfig();

    if (config) {
      try {
        const result = transform({ document: config, features: this.growth });
        return result;
      } catch (e) {
        logger.error(
          `config.repository.index:getConfiguration: Error while transforming document`,
          e,
        );
      }
    }

    return undefined;
  };
}
