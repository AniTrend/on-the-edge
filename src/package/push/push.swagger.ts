import {
  PushAcknowledgmentContract,
  PushConfirmContract,
  PushInstallationContract,
  PushVapidContract,
} from './push.contract.ts';
import {
  PushChallengeConfirmSchema,
  PushDeleteSchema,
  PushInstallationRegistrationSchema,
  PushPreferencesSchema,
  PushProfileSchema,
} from './push.schema.ts';

export const PushVapidSwagger = PushVapidContract;
export const PushInstallationSwagger = PushInstallationContract;
export const PushConfirmSwagger = PushConfirmContract;
export const PushAcknowledgmentSwagger = PushAcknowledgmentContract;

export const PushRegistrationBodySwagger =
  // deno-lint-ignore no-explicit-any
  (PushInstallationRegistrationSchema as any).openapi({
    title: 'PushRegistrationBody',
    description: 'Installation registration request body',
  });

export const PushConfirmBodySwagger =
  // deno-lint-ignore no-explicit-any
  (PushChallengeConfirmSchema as any).openapi({
    title: 'PushConfirmBody',
    description: 'Challenge confirmation request body',
  });

export const PushProfileBodySwagger =
  // deno-lint-ignore no-explicit-any
  (PushProfileSchema as any).openapi({
    title: 'PushProfileBody',
    description: 'Profile update request body',
  });

export const PushPreferencesBodySwagger =
  // deno-lint-ignore no-explicit-any
  (PushPreferencesSchema as any).openapi({
    title: 'PushPreferencesBody',
    description: 'Topic preferences update request body',
  });

export const PushDeleteBodySwagger =
  // deno-lint-ignore no-explicit-any
  (PushDeleteSchema as any).openapi({
    title: 'PushDeleteBody',
    description: 'Installation deletion request body',
  });
