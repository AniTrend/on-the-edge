import { Body, Controller, Get, Post } from '@danet/core';
import { ReturnedSchema } from '@danet/zod';
import { LoggerService } from '@scope/logger';
import { PushService } from './push.service.ts';
import { PushInstallationSwagger, PushVapidSwagger } from './push.swagger.ts';
import type {
  PushInstallationRegistration,
  PushVapidResponse,
} from './push.types.ts';

/**
 * Controller for Push notification endpoints.
 * All routes are prefixed with `v1/push`.
 *
 * Currently ships with VAPID key retrieval and installation registration.
 * Remaining endpoints (confirm, profile, preferences, delete) are deferred
 * due to Danet Swagger Module crash on controllers with >2 POST methods.
 * See: https://github.com/Savory/Danet/issues/...
 */
@Controller('v1/push')
export class PushController {
  constructor(
    private readonly pushService: PushService,
    private readonly logger: LoggerService,
  ) {}

  @Get('vapid')
  @ReturnedSchema(PushVapidSwagger)
  async vapid(): Promise<PushVapidResponse> {
    this.logger.instance.debug('VAPID public key requested');
    // TODO(#378): return real VAPID key from PushSenderService
    return { applicationServerKey: '' };
  }

  @Post('installations')
  @ReturnedSchema(PushInstallationSwagger)
  async registerInstallation(
    @Body() registration: PushInstallationRegistration,
  ): Promise<{
    installationId: string;
    instance: string;
    status: string;
  }> {
    return this.pushService.registerInstallation(registration);
  }
}
