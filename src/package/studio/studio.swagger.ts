import { StudioContract } from './studio.contract.ts';
import { StudioQuerySchema } from './studio.schema.ts';

export const StudioSwagger = StudioContract;

// deno-lint-ignore no-explicit-any
export const StudioQuerySwagger = (StudioQuerySchema as any).openapi({
  title: 'StudioQuery',
  description: 'Query parameters for studio lookup',
});
