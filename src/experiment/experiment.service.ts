import { Injectable, SCOPE } from '@danet/core';
import { AppFeatures } from './experiment.types.ts';
import {
  GrowthBook,
  InitOptions,
  InitResponse,
  WidenPrimitives,
} from '@growthbook/growthbook';
import { between } from '@onjara/optic';
import { SecretService } from '@scope/secret';
import { OnAppClose } from '@danet/core/hook';
import { LoggerService } from '@scope/logger';

@Injectable({ scope: SCOPE.GLOBAL })
export class ExperimentService implements OnAppClose {
  private readonly growthBook: GrowthBook<AppFeatures>;

  constructor(
    secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.growthBook = this.initializeClient(secret);
  }

  invoke = <T>(action: () => T): T => {
    this.logger.instance.mark('experiment-check-start');
    const result = action();
    this.logger.instance.mark('experiment-check-end');
    this.logger.instance.measure(
      between('experiment-check-start', 'experiment-check-end'),
    );
    return result;
  };

  isEnabled(
    feature: keyof Pick<
      AppFeatures,
      | 'news-refactor-api'
      | 'enable-analytics'
      | 'enable-animethemes-api'
      | 'episode-align-title-sim'
      | 'episodes-diagnostics'
      | 'enable-skyhook-source'
      | 'enable-tmdb-source'
      | 'enable-trakt-source'
      | 'enable-notify-source'
    >,
  ): boolean {
    return this.invoke(() => this.growthBook.isOn(feature));
  }

  isDisabled(
    feature: keyof Omit<
      AppFeatures,
      'episode-align-title-sim'
    >,
  ): boolean {
    return this.invoke(() => this.growthBook.isOff(feature));
  }

  getFeatureValue<T>(
    feature: keyof Pick<
      AppFeatures,
      'episode-align-title-sim' | 'platform-source'
    >,
    defaultValue: T,
  ): WidenPrimitives<T> {
    return this.invoke(() =>
      this.growthBook.getFeatureValue<T>(feature, defaultValue)
    );
  }

  private initializeClient(secret: SecretService): GrowthBook<AppFeatures> {
    return new GrowthBook({
      apiHost: secret.get<string>('GROWTH'),
      clientKey: secret.get<string>('GROWTH_KEY'),
      enableDevMode: secret.get<boolean>('GROWTH_DEV_MODE'),
      log: (msg, ctx) => {
        this.logger.instance.info(msg, ctx);
      },
      trackingCallback: (experiment, result) => {
        // substitute with segment or something else for exp tracking
        this.logger.instance.debug('Experiment tracked', {
          experimentId: experiment.key,
          variationId: result.key,
        });
      },
      onFeatureUsage: (featureKey, result) => {
        this.logger.instance.debug('Feature used', {
          key: featureKey,
          value: result.value,
        });
      },
    });
  }

  init = (options?: InitOptions): Promise<InitResponse> =>
    this.growthBook.init(options);

  destroy = (): void => {
    this.growthBook.destroy();
  };

  getInstance = (): GrowthBook<AppFeatures> => this.growthBook;

  onAppClose(): void {
    this.logger.instance.mark('experiment-client-destroy-start');
    this.destroy();
    this.logger.instance.mark('experiment-client-destroy-end');
    this.logger.instance.measure(
      between(
        'experiment-client-destroy-start',
        'experiment-client-destroy-end',
      ),
    );
  }
}
