import {
  UpdateChannelContract,
  UpdateDecisionContract,
  UpdateDecisionStatusContract,
  UpdateProductContract,
  UpdateReleaseAssetContract,
  UpdateReleaseContract,
} from './updates.contract.ts';
import { UpdateQuerySchema } from './updates.schema.ts';

export const UpdateReleaseSwagger = UpdateReleaseContract;
export const UpdateChannelSwagger = UpdateChannelContract;
export const UpdateProductSwagger = UpdateProductContract;
export const UpdateReleaseAssetSwagger = UpdateReleaseAssetContract;
export const UpdateDecisionSwagger = UpdateDecisionContract;
export const UpdateDecisionStatusSwagger = UpdateDecisionStatusContract;

// deno-lint-ignore no-explicit-any
export const UpdateQuerySwagger = (UpdateQuerySchema as any).openapi({
  title: 'UpdateQuery',
  description: 'Query parameters for the cached update lookup',
});
