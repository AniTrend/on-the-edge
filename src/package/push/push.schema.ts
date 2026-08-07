import { z } from 'zod';
import {
  PushConfirmBodyContract,
  PushDeleteBodyContract,
  PushPreferencesBodyContract,
  PushProfileBodyContract,
  PushRegistrationBodyContract,
} from './push.contract.ts';

/**
 * Runtime Zod schemas for the Push domain.
 *
 * The request input schemas are canonical aliases of the public
 * OpenAPI contracts in push.contract.ts, which is the single source
 * of truth for validation semantics (defaults, requiredness,
 * nullability, constraints, enum members). These exported names are
 * preserved so push.types.ts and runtime consumers keep compiling.
 *
 * PushVapidResponseSchema remains a runtime-only schema defined with
 * plain zod here; it carries no public OpenAPI metadata.
 */

// --- Installation Registration (canonical: PushRegistrationBodyContract) ---

export const PushInstallationRegistrationSchema = PushRegistrationBodyContract;

// --- Challenge Confirmation (canonical: PushConfirmBodyContract) ---

export const PushChallengeConfirmSchema = PushConfirmBodyContract;

// --- Profile Update (canonical: PushProfileBodyContract) ---

export const PushProfileSchema = PushProfileBodyContract;

// --- Topic Preferences (canonical: PushPreferencesBodyContract) ---

export const PushPreferencesSchema = PushPreferencesBodyContract;

// --- Installation Deletion (canonical: PushDeleteBodyContract) ---

export const PushDeleteSchema = PushDeleteBodyContract;

// --- VAPID Response (runtime-only) ---

export const PushVapidResponseSchema = z.object({
  applicationServerKey: z.string(),
});
