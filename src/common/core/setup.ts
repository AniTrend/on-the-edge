import { shutdown } from './otel.ts';
import { env } from './env.ts';
import { State } from '../types/state.ts';
import { GrowthBook } from '@growthbook';
import { logger } from './logger.ts';
import { between } from '@optic';
import _localSourceFactory from '../mongo/factory.ts';

const onDispose = (tokens: number[]) => {
  setTimeout(() => {
    Deno.removeSignalListener('SIGINT', onTerminationRequest);
    Deno.removeSignalListener('SIGTERM', onTerminationRequest);
    tokens.forEach((token) => clearTimeout(token));
    Deno.exit();
  }, 500);
};

const onTerminationRequest = (): void => {
  logger.debug(
    'common.core.setup:onTerminationRequest: OS dispatched signal',
  );
  const otelToken = setTimeout(async () => {
    await shutdown()
  });
  const mongoToken = setTimeout(async () => await _localSourceFactory.disconnect());
  logger.debug(
    'common.core.setup:onTerminationRequest: Attempting to exit Deno process',
  );

  onDispose([otelToken, mongoToken]);
};

Deno.addSignalListener('SIGINT', onTerminationRequest);
Deno.addSignalListener('SIGTERM', onTerminationRequest);

export const createState = async (): Promise<State> => {
  logger.mark('setup-start');
  const state = {
    credential: {
      supabase: {
        id: env<string>('SUPABASE_ID'),
        key: env<string>('SUPABASE_API_KEY'),
      },
    },
    features: new GrowthBook({
      apiHost: env<string>('GROWTH'),
      clientKey: env<string>('GROWTH_KEY'),
      enableDevMode: env<boolean>('GROWTH_DEV_MODE'),
      log: (msg, ctx) => {
        logger.info(msg, ctx);
      },
      trackingCallback: (experiment, result) => {
        // substitute with segment or something else for exp tracking
        logger.debug('Experiemnt tracked', {
          experimentId: experiment.key,
          variationId: result.key,
        });
      },
      onFeatureUsage: (featureKey, result) => {
        logger.debug('Feature used', { key: featureKey, value: result.value });
      },
    }),
    contextHeader: {
      agent: '',
      accepts: [],
      authorization: null,
      contentType: null,
      acceptEncoding: '',
    },
    local: await _localSourceFactory.connect(),
  };

  logger.mark('setup-end');
  logger.measure(between('setup-start', 'setup-end'));
  return state;
};
