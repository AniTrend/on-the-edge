/**
 * Inferred TypeScript types from Push runtime schemas.
 */

import type {
  PushChallengeConfirmSchema,
  PushDeleteSchema,
  PushInstallationRegistrationSchema,
  PushPreferencesSchema,
  PushProfileSchema,
  PushVapidResponseSchema,
} from './push.schema.ts';
import type { z } from 'zod';

export type PushInstallationRegistration = z.infer<
  typeof PushInstallationRegistrationSchema
>;

export type PushChallengeConfirm = z.infer<
  typeof PushChallengeConfirmSchema
>;

export type PushProfile = z.infer<typeof PushProfileSchema>;

export type PushPreferences = z.infer<typeof PushPreferencesSchema>;

export type PushDelete = z.infer<typeof PushDeleteSchema>;

export type PushVapidResponse = z.infer<typeof PushVapidResponseSchema>;
