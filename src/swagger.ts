import '@std/dotenv/load';
import { DanetApplication, Logger } from '@danet/core';
import { setup } from './setup.ts';

const logger = new Logger('SwaggerGen');
const application = new DanetApplication();

let exitCode = 0;

try {
  await setup(application, true);
  logger.log('Swagger spec generated at .github/swagger-spec.json');
} catch (error: Error | unknown) {
  exitCode = 1;
  if (error instanceof Error) {
    logger.error(error.stack ?? error.message);
    if (error.cause) {
      logger.error(`Cause: ${error.cause}`);
    }
  } else {
    logger.error(`Failed to generate swagger spec: ${error}`);
  }
}

try {
  await application.close();
} catch (error: Error | unknown) {
  if (error instanceof Error) {
    logger.warn(error.stack ?? error.message);
  } else {
    logger.warn(`Failed to close application: ${error}`);
  }
}

Deno.exit(exitCode);
