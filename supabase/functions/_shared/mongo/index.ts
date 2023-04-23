import { Document, MongoClient } from 'x/mongo';
import { env } from '../core/env.ts';
import { logger } from '../core/logger.ts';
import { between } from 'x/optic';

logger.mark('mongo_connection_start');
const client = new MongoClient();
const database = await client.connect(
  env<string>('MONGO_URL'),
).catch((e) => {
  logger.error(e);
  return undefined;
});
logger.mark('mongo_connection_end');
logger.measure(
  between('mongo_connection_start', 'mongo_connection_end'),
);

export const getCollection = <T extends Document>(
  collection: string,
) => database?.collection<T>(collection);

export const disconnect = () => {
  try {
    logger.mark('mongo_close_start');
    client.close();
  } catch (e) {
    logger.error(e);
  } finally {
    logger.mark('mongo_close_end');
    logger.measure(between('mongo_close_start', 'mongo_close_end'));
  }
};
