import { Context, Controller, type ExecutionContext, Get } from '@danet/core';
import { ReturnedSchema } from '@danet/zod';
import { SecretService } from '@scope/secret';
import { HealthSwagger } from './app.swagger.ts';

const START_TIME = Date.now();

@Controller('/v1')
export class AppController {
  constructor(
    private readonly secret: SecretService,
  ) {}

  @Get()
  index(
    @Context() { req }: ExecutionContext,
  ) {
    const userAgent = req.raw.headers.get('user-agent');
    const host = req.raw.headers.get('host');
    return {
      agent: userAgent,
      host,
      environment: this.secret.environment(),
    };
  }

  @Get('health')
  @ReturnedSchema(HealthSwagger)
  health() {
    return {
      status: 'healthy',
      uptime: Date.now() - START_TIME,
      timestamp: new Date().toISOString(),
    };
  }
}
