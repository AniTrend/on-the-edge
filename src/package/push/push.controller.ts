import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuard,
} from '@danet/core';
import { ReturnedSchema } from '@danet/zod';
import { PushSenderService } from '@scope/service/push-sender';
import { LoggerService } from '@scope/logger';
import { RateLimitGuard } from '@scope/guard/rate-limit';
import { PushService } from './push.service.ts';
import {
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
 *
 * All routes are prefixed with `v1/push`.
 * Mutation endpoints are protected by Redis-backed rate limiting.
 */
@Controller('v1/push')
export class PushController {
  constructor(
    private readonly pushSender: PushSenderService,
    private readonly pushService: PushService,
    private readonly logger: LoggerService,
  ) {}

  // --- VAPID ---

  /**
   * Returns the VAPID application server public key.
   * Not rate-limited — this is a lightweight, frequently-called endpoint.
   */
  @Get('vapid')
  @ReturnedSchema(PushVapidSwagger)
  async vapid(): Promise<PushVapidResponse> {
    this.logger.instance.debug('VAPID public key requested');
    const applicationServerKey = await this.pushSender
      .getApplicationServerKey();
    return { applicationServerKey };
  }

  // --- Registration ---

  /**
   * Register or update a push installation.
   */
  @Post('installations')
  @UseGuard(RateLimitGuard)
  @ReturnedSchema(PushInstallationSwagger)
  async registerInstallation(
    @Body(PushRegistrationBodySwagger) registration:
      PushInstallationRegistration,
  ): Promise<{
    installationId: string;
    instance: string;
    status: string;
  }> {
    this.logger.instance.debug(
      `Push installation registration: ${registration.installationId}`,
    );
    return this.pushService.registerInstallation(registration);
  }

  // --- Challenge Confirmation ---

  /**
   * Confirm a challenge token received via push notification.
   */
  @Post('installations/:installationId/confirm')
  @UseGuard(RateLimitGuard)
  @ReturnedSchema(PushConfirmSwagger)
  async confirmInstallation(
    @Param('installationId') installationId: string,
    @Body(PushConfirmBodySwagger) confirmation: PushChallengeConfirm,
  ): Promise<{
    installationId: string;
    instance: string;
    status: string;
  }> {
    this.logger.instance.debug(
      `Push challenge confirmation: ${installationId}`,
    );
    return this.pushService.confirmInstallation(installationId, confirmation);
  }

  // --- Profile ---

  /**
   * Update client profile metadata snapshot.
   */
  @Put('installations/:installationId/profile')
  @UseGuard(RateLimitGuard)
  async updateProfile(
    @Param('installationId') installationId: string,
    @Body(PushProfileBodySwagger) profile: PushProfile,
  ): Promise<void> {
    this.logger.instance.debug(
      `Push profile update: ${installationId}`,
    );
    await this.pushService.updateProfile(installationId, profile);
  }

  // --- Preferences ---

  /**
   * Update topic preferences.
   */
  @Patch('installations/:installationId/preferences')
  @UseGuard(RateLimitGuard)
  async updatePreferences(
    @Param('installationId') installationId: string,
    @Body(PushPreferencesBodySwagger) preferences: PushPreferences,
  ): Promise<void> {
    this.logger.instance.debug(
      `Push preferences update: ${installationId}`,
    );
    await this.pushService.updatePreferences(installationId, preferences);
  }

  // --- Deletion ---

  /**
   * Disable an installation.
   */
  @Delete('installations/:installationId')
  @UseGuard(RateLimitGuard)
  async deleteInstallation(
    @Param('installationId') installationId: string,
    @Body(PushDeleteBodySwagger) deletion: PushDelete,
  ): Promise<void> {
    this.logger.instance.debug(
      `Push installation deletion: ${installationId}`,
    );
    await this.pushService.deleteInstallation(installationId, deletion);
  }
}
