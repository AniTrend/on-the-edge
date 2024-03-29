import { Features } from '../../common/types/core.d.ts';
import {
  getPlatformSource,
  isAnalyticsEnabled,
} from '../../common/experiment/index.ts';
import { ClientConfiguration } from '../transformer/types.d.ts';
import { LocalSource } from '../local/index.ts';
import { transform } from '../transformer/index.ts';

export class Repository {
  constructor(
    private growth: Features,
    private local: LocalSource,
  ) {}

  // get settings from our database or something based on an app version?
  getConfiguration = async (): Promise<ClientConfiguration> => {
    const config = await this.local.getConfig();

    return {
      ...transform(config),
      settings: {
        analyticsEnabled: isAnalyticsEnabled(this.growth),
        platformSource: getPlatformSource(this.growth),
      },
    };
  };
}
