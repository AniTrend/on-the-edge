import { ConsoleStream, Level, Logger } from '@optic';
import { TokenReplacer } from '@optic/formatters';
import { env } from './env.ts';
import { MinLogLevel } from '../logger/types.ts';
import { OTelStream } from '../logger/otel-logger.ts';

const consoleLogger = new ConsoleStream()
  .withFormat(
    new TokenReplacer()
      .withFormat('{msg} {metadata}')
      .withColor(),
  );

const otelStream = new OTelStream();

const logLevel = (level: MinLogLevel): Level => {
  switch (level) {
    case 'DEBUG':
      return Level.Debug;
    case 'INFO':
      return Level.Info;
    case 'WARN':
      return Level.Warn;
    case 'ERROR':
      return Level.Error;
    default:
      throw new Error('Unkown log level', { cause: level });
  }
};

const logger = new Logger()
  .withMinLogLevel(
    logLevel(env<MinLogLevel>('MIN_LOG_LEVEL')),
  )
  .addStream(consoleLogger)
  .addStream(otelStream);

logger.profilingConfig()
  .enabled(env<boolean>('OPTIC_TRACING'))
  .captureMemory(true)
  .withLogLevel(Level.Info);

export { logger };
