import { State } from '../types/state.d.ts';
import { env } from './env.ts';
import { GrowthBook } from 'esm/growthbook';
import { logger } from './logger.ts';
import { between } from 'x/optic';
import _localSourceFactory from '../mongo/factory.ts';

logger.mark('setup-start');

const applicationState: State = {
  credential: {
    supabase: {
      id: env<string>('SUPABASE_ID'),
      key: env<string>('SUPABASE_API_KEY'),
    },
  },
  features: new GrowthBook({
    apiHost: env<string>('GROWTH'),
    clientKey: env<string>('GROWTH_KEY'),
    enableDevMode: true,
    log: (msg, ctx) => {
      logger.info(msg, ctx);
    },
    trackingCallback: (experiment, result) => {
      // substitute with segment or something else for exp tracking
      logger.info('Experiemnt tracked', {
        experimentId: experiment.key,
        variationId: result.key,
      });
    },
  }),
  contextHeader: {
    agent: '',
    accepts: [],
    authorization: null,
    contentType: null,
    acceptEncoding: '',
    language: '',
  },
  local: await _localSourceFactory.connect(),
};

logger.mark('setup-end');
logger.measure(between('setup-start', 'setup-end'));

export default applicationState;
