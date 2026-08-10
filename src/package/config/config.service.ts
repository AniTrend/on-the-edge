import {
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from '@danet/core';
import { getClientAttributes } from '@scope/common/utils';
import { UpdateProduct } from '@scope/common/types';
import {
  ExperimentService,
  PlatformSource,
  PromotionFeature,
} from '@scope/experiment';
import { LoggerService } from '@scope/logger';
import { ConfigRepository } from './config.repository.ts';
import { Config } from './config.types.ts';
import { transform } from './config.transformer.ts';
import { validateNavigation } from './config.validation.ts';

@Injectable()
export class ConfigService {
  constructor(
    private readonly repository: ConfigRepository,
    private readonly experiment: ExperimentService,
    private readonly logger: LoggerService,
  ) {}

  async getConfig(context?: ExecutionContext): Promise<Config> {
    const features = {
      platformSource: this.experiment
        .getFeatureValue<PlatformSource>(
          'platform-source',
          null,
        ),
      isAnalyticsEnabled: this.experiment.isEnabled(
        'enable-analytics',
      ),
      promotion: this.resolvePromotion(context),
    };
    const document = await this.repository.getConfig();
    if (!document) {
      this.logger.instance.error('No config document found in database');
      throw new NotFoundException();
    }
    const config = transform({ document, ...features });

    const navErrors = validateNavigation(config.navigation);
    if (navErrors.length > 0) {
      this.logger.instance.error(
        'Config navigation payload validation failed',
        { errors: navErrors },
      );
      throw new Error(
        `Config navigation payload is invalid: ${
          navErrors.map((e) => e.message).join('; ')
        }`,
      );
    }

    return config;
  }

  /**
   * Resolve the AniTrend v2 promotion for the requesting client.
   *
   * Coarse server-side rules: the feature must be on with a payload,
   * the client must be an AniTrend App release build, and the client
   * must never be AniTrend v2 (no self-promotion). Finer rollout
   * targeting is GrowthBook's job. This is a promotion and config
   * concept, never an update release for the AniTrend App.
   */
  private resolvePromotion(
    context?: ExecutionContext,
  ): PromotionFeature | null {
    const feature = this.experiment.getFeatureValue<PromotionFeature | null>(
      'anitrend-v2-promotion',
      null,
    );
    if (!feature) {
      return null;
    }
    if (!this.experiment.isEnabled('anitrend-v2-promotion')) {
      return null;
    }
    if (!context) {
      return null;
    }
    const client = getClientAttributes(context);
    if (!client) {
      return null;
    }
    if (client.appId !== UpdateProduct.ANITREND_APP) {
      return null;
    }
    if (client.buildType !== 'release') {
      return null;
    }
    return feature;
  }
}
