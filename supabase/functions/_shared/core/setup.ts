import { createClient } from 'esm/supabase';
import { Database } from '../types/supabase.d.ts';
import { State } from '../types/state.d.ts';
import { env } from './env.ts';
import { GrowthBook } from 'esm/growthbook';
import { logger } from './logger.ts';
import { between } from 'x/optic';

logger.mark('setup-start');
const applicationState: State = {
  credential: {
    supabase: {
      id: env<string>('SUPABASE_ID'),
      key: env<string>('SUPABASE_API_KEY'),
    },
  },
  supabase: createClient<Database>(
    `https://${env<string>('SUPABASE_ID')}.supabase.co`,
    env<string>('SUPABASE_API_KEY'),
  ),
  envrionment: {
    namespace: env<string>('NAMESPACE'),
  },
  growth: new GrowthBook({
    apiHost: env<string>('GROWTH'),
    clientKey: env<string>('GROWTH_KEY'),
    enableDevMode: true,
    trackingCallback: (experiment, result) => {
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
    forwarded: '',
    language: '',
  },
};

logger.mark('setup-end');
logger.measure(between('setup-start', 'setup-end'));

export default applicationState;
