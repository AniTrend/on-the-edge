import {
  PushAcknowledgmentContract,
  PushConfirmBodyContract,
  PushConfirmContract,
  PushDeleteBodyContract,
  PushInstallationContract,
  PushPreferencesBodyContract,
  PushProfileBodyContract,
  PushRegistrationBodyContract,
  PushVapidContract,
} from './push.contract.ts';

export const PushVapidSwagger = PushVapidContract;
export const PushInstallationSwagger = PushInstallationContract;
export const PushConfirmSwagger = PushConfirmContract;
export const PushAcknowledgmentSwagger = PushAcknowledgmentContract;

/**
 * Request body schemas are re-exported as `any` so the `@Body()`
 * decorator generic does not instantiate the full nested schema
 * type (TS2589: excessively deep type instantiation).
 */
export const PushRegistrationBodySwagger =
  // deno-lint-ignore no-explicit-any
  PushRegistrationBodyContract as any;
export const PushConfirmBodySwagger =
  // deno-lint-ignore no-explicit-any
  PushConfirmBodyContract as any;
export const PushProfileBodySwagger =
  // deno-lint-ignore no-explicit-any
  PushProfileBodyContract as any;
export const PushPreferencesBodySwagger =
  // deno-lint-ignore no-explicit-any
  PushPreferencesBodyContract as any;
export const PushDeleteBodySwagger =
  // deno-lint-ignore no-explicit-any
  PushDeleteBodyContract as any;
