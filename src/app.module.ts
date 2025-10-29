import { GLOBAL_GUARD, Module } from '@danet/core';
import { LoggerModule } from '@scope/logger';
import { TelemetryModule } from '@scope/telemetry';
import { ExperimentModule } from '@scope/experiment';
import { SecretModule } from '@scope/secret';
import { DatabaseModule } from '@scope/database';
import { HeaderGuard } from '@scope/guard';
import { ServiceModule } from '@scope/service';
import { PackageModule } from '@scope/package';
import { CacheModule } from '@scope/cache';
import { CommonModule } from '@scope/common';
import { AppController } from './app.controller.ts';

@Module({
  controllers: [AppController],
  imports: [
    SecretModule,
    TelemetryModule,
    LoggerModule,
    CacheModule,
    CommonModule,
    ExperimentModule,
    DatabaseModule,
    ServiceModule,
    PackageModule,
  ],
  injectables: [
    { token: GLOBAL_GUARD, useClass: HeaderGuard },
  ],
})
export class AppModule {}
