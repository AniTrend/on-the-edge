import '@std/dotenv/load';
import { DanetApplication, Logger } from '@danet/core';
import { installShutdownHandler } from './src/common/shutdown.ts';
import { setup } from './src/setup.ts';

const logger = new Logger('Bootstrap');
const application = new DanetApplication();

const onTerminationRequest = installShutdownHandler({
  close: () => application.close(),
  log: (message) => logger.log(message),
  warn: (message) => logger.warn(message),
  exit: () => Deno.exit(),
});

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
