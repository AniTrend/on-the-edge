import { Context, Controller, type ExecutionContext, Get } from '@danet/core';
import { ReturnedSchema } from '@danet/zod';
import { ConfigService } from './config.service.ts';
import { ConfigSchemaSwagger } from './config.swagger.ts';
import { Config } from './config.types.ts';

@Controller('v1/config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) { }

  @Get()
  @ReturnedSchema(ConfigSchemaSwagger)
  async config(@Context() context: ExecutionContext): Promise<Config> {
    return this.configService.getConfig(context);
  }
}
