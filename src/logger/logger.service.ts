import { Injectable, SCOPE } from '@danet/core';
import { OnAppClose } from '@danet/core/hook';
import { ConsoleStream, Level, Logger } from '@onjara/optic';
import { TokenReplacer } from '@onjara/optic/formatters';
import { SecretService } from '@scope/secret';
import { OtelStream } from './stream/otel.stream.ts';
import { MinLogLevel } from './types.ts';

@Injectable({ scope: SCOPE.GLOBAL })
export class LoggerService implements OnAppClose {
  private readonly logger: Logger;

  constructor(secret: SecretService, otelStream: OtelStream) {
    this.logger = new Logger(LoggerService.name);
    this.initializeLogger(secret, otelStream);
  }

  private mapLogLevel = (level: MinLogLevel): Level => {
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

  get instance(): Logger {
    return this.logger;
  }

  private initializeLogger(
    secret: SecretService,
    otelStream: OtelStream,
  ): void {
    this.logger
      .withMinLogLevel(
        this.mapLogLevel(secret.get('MIN_LOG_LEVEL')),
      )
      .addStream(new ConsoleStream()
        .withFormat(
          new TokenReplacer()
            .withDateTimeFormat('ddd, DD MMM YYYY hh:mm:ss LOC')
            .withFormat('{dateTime} [{logger}]  {msg} {metadata}')
            .withColor(true),
        ))
      .addStream(otelStream)
      .profilingConfig()
      .enabled(secret.get('OPTIC_TRACING'))
      .captureMemory(true)
      .withLogLevel(Level.Info);
  }

  onAppClose(): void | Promise<void> {
    return this.logger.shutdown();
  }
}
