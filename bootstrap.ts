import '@std/dotenv/load';
import { DanetApplication, Logger } from '@danet/core';
import { setup } from './src/setup.ts';

const logger = new Logger('Bootstrap');
const application = new DanetApplication();

const onDispose = (tokens: number[]) => {
  logger.log('Deno resource cleanup initiated');
  Deno.removeSignalListener('SIGINT', onTerminationRequest);
  Deno.removeSignalListener('SIGTERM', onTerminationRequest);
  setTimeout(() => {
    tokens.forEach((token) => clearTimeout(token));
    logger.log('Deno resource cleanup completed, exiting process now!');
    Deno.exit();
  }, 2000);
};

const onTerminationRequest = (): void => {
  logger.log('Deno recieved shutdown request from user or system');
  const shutDown = setTimeout(async () => {
    try {
      await application.close();
    } catch (error: Error | unknown) {
      error instanceof Error
        ? logger.warn(error.stack ?? error.message)
        : logger.warn(`Unable to gracefully shutdown application: ${error}`);
    }
  });
  onDispose([shutDown]);
};

Deno.addSignalListener('SIGINT', onTerminationRequest);
Deno.addSignalListener('SIGTERM', onTerminationRequest);

const swaggerGen = Deno.args.includes('--swagger');

try {
  const port = Number(Deno.env.get('PORT')!);
  await setup(application, swaggerGen);
  await application.listen(port);
} catch (error: Error | unknown) {
  onTerminationRequest();
  if (error instanceof Error) {
    logger.error(error?.stack ?? error.message);
    if (error?.cause) {
      logger.error(`Cause: ${error?.cause}`);
    }
  } else {
    logger.error(`Fatal error during bootstrap: ${error}`);
  }
}
