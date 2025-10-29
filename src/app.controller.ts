import { Context, Controller, type ExecutionContext, Get } from '@danet/core';
import { SecretService } from '@scope/secret';

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
}
