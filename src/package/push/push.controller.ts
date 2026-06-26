import {
  Body as CoreBody,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuard,
} from '@danet/core';
import { Body } from '@danet/zod';
import { ReturnedSchema } from '@danet/zod';
import { LoggerService } from '@scope/logger';
import { RateLimitGuard } from '@scope/guard/rate-limit';
import { PushService } from './push.service.ts';
import {
  PushAcknowledgmentSwagger,
  PushConfirmBodySwagger,
  PushConfirmSwagger,
  PushDeleteBodySwagger,
  PushInstallationSwagger,
  PushPreferencesBodySwagger,
  PushProfileBodySwagger,
  PushRegistrationBodySwagger,
  PushVapidSwagger,
} from './push.swagger.ts';
import type {
  PushChallengeConfirm,
  PushDelete,
  PushInstallationRegistration,
  PushPreferences,
  PushProfile,
  PushVapidResponse,
} from './push.types.ts';

/**
 * Controller for Push notification endpoints.
 * All routes are prefixed with `v1/push`.
 */
@Controller('v1/push')
@UseGuard(RateLimitGuard)
export class PushController {
  constructor(
    private readonly pushService: PushService,
    private readonly logger: LoggerService,
  ) {}

  @Get('vapid')
  @ReturnedSchema(PushVapidSwagger)
  async vapid(): Promise<PushVapidResponse> {
    try {
      return {
        applicationServerKey: await this.pushService.getApplicationServerKey(),
      };
    } catch (error) {
      this.logger.instance.warn('VAPID key unavailable', { cause: error });
      return { applicationServerKey: '' };
    }
  }

  @Post('installations')
  @ReturnedSchema(PushInstallationSwagger)
  async registerInstallation(
    @Body(PushRegistrationBodySwagger) registration:
      PushInstallationRegistration,
  ): Promise<{
    installationId: string;
    instance: string;
    status: string;
  }> {
    return this.pushService.registerInstallation(registration);
  }

  @Post('installations/:installationId/confirm')
  @ReturnedSchema(PushConfirmSwagger)
  async confirmInstallation(
    @Param('installationId') installationId: string,
    @Body(PushConfirmBodySwagger) confirmation: PushChallengeConfirm,
  ): Promise<{
    installationId: string;
    instance: string;
    status: string;
  }> {
    return this.pushService.confirmInstallation(
      installationId,
      confirmation,
    );
  }

  @Put('installations/:installationId/profile')
  @ReturnedSchema(PushAcknowledgmentSwagger)
  async updateProfile(
    @Param('installationId') installationId: string,
    @Body(PushProfileBodySwagger) profile: PushProfile,
  ): Promise<{ installationId: string; instance: string }> {
    await this.pushService.updateProfile(installationId, profile);
    return {
      installationId,
      instance: profile.instance,
    };
  }

  @Patch('installations/:installationId/preferences')
  @ReturnedSchema(PushAcknowledgmentSwagger)
  async updatePreferences(
    @Param('installationId') installationId: string,
    @Body(PushPreferencesBodySwagger) preferences: PushPreferences,
  ): Promise<{ installationId: string; instance: string }> {
    await this.pushService.updatePreferences(installationId, preferences);
    return {
      installationId,
      instance: preferences.instance,
    };
  }

  @Delete('installations/:installationId')
  @ReturnedSchema(PushAcknowledgmentSwagger)
  async deleteInstallation(
    @Param('installationId') installationId: string,
    @Body(PushDeleteBodySwagger) deletion: PushDelete,
  ): Promise<{ installationId: string; instance: string }> {
    await this.pushService.deleteInstallation(installationId, deletion);
    return {
      installationId,
      instance: deletion.instance,
    };
  }

  @Post('installations/:installationId/test')
  @ReturnedSchema(PushAcknowledgmentSwagger)
  async sendTestPush(
    @Param('installationId') installationId: string,
    @CoreBody('instance') instance: string = 'default',
  ): Promise<{ installationId: string; instance: string }> {
    await this.pushService.sendTestPush(installationId, instance);
    return { installationId, instance };
  }
}
