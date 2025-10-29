import { z } from 'zod';
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { ConfigSchema } from './config.schema.ts';

extendZodWithOpenApi(z);

export const ConfigSchemaSwagger = ConfigSchema.openapi({
  title: 'Config',
  description: 'Client configuration',
});
