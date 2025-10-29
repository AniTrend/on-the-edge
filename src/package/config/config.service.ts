import { Injectable, NotFoundException } from '@danet/core';
import { ExperimentService, PlatformSource } from '@scope/experiment';
import { ConfigRepository } from './config.repository.ts';
import { Config } from './config.types.ts';
import { transform } from './config.transformer.ts';
import { LoggerService } from '@scope/logger';

@Injectable()
export class ConfigService {
  constructor(
    private readonly repository: ConfigRepository,
    private readonly experiment: ExperimentService,
    private readonly logger: LoggerService,
  ) {}

  async getConfig(): Promise<Config> {
    const features = {
      platformSource: this.experiment
        .getFeatureValue<PlatformSource>(
          'platform-source',
          null,
        ),
      isAnalyticsEnabled: this.experiment.isEnabled(
        'enable-analytics',
      ),
    };
    const document = await this.repository.getConfig();
    if (!document) {
      this.logger.instance.error('No config document found in database');
      throw new NotFoundException();
    }
    return transform({ document, ...features });
  }
}
