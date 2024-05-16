import { MongoClient } from 'npm/mongodb';
import { logger } from '../core/logger.ts';
import { between } from 'x/optic';
import { env } from '../core/env.ts';
import { Local } from '../types/core.d.ts';

class LocalSourceFactory {
  constructor(private readonly client: MongoClient) {
    logger.mark('mongo_connection_start');
    client.on('timeout', () => {
      logger.warn(
        'common.mongo.factory:LocalSourceFactory: Connection timed out',
      );
    });
  }

  connect = async (): Promise<Local> => {
    return await this.client.connect()
      .then((client) => {
        logger.mark('mongo_connection_end');
        logger.measure(
          between('mongo_connection_start', 'mongo_connection_end'),
        );
        return client.db();
      })
      .catch((e) => {
        logger.error('common.mongo.factory:connect:', e);
        return undefined;
      });
  };

  disconnect = async () => {
    logger.mark('mongo_close_start');
    await this.client.close(true)
      .then(() => {
      }).catch((e) => {
        logger.error('common.mongo.factory:disconnect:', e);
      }).finally(() => {
        logger.mark('mongo_close_end');
        logger.measure(between('mongo_close_start', 'mongo_close_end'));
      });
  };
}

const _localSourceFactory = new LocalSourceFactory(
  new MongoClient(env<string>('MONGO_URL'), {
    connectTimeoutMS: 1000,
    monitorCommands: true,
  }),
);

export default _localSourceFactory;
