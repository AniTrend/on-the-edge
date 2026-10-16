import { z } from 'zod';

/**
 * JSON Web Key members of the exported VAPID key format. Parsing
 * keeps only these members: foreign members such as key_ops, alg and
 * ext are dropped because WebCrypto import rejects JWKs whose
 * key_ops conflicts with the requested key usages.
 */
export const JsonWebKeySchema = z.object({
  kty: z.string().min(1),
  crv: z.string().min(1),
  x: z.string().min(1),
  y: z.string().min(1),
  d: z.string().min(1).optional(),
});

/** Decoded PUSH_VAPID_KEYS payload: an exported VAPID key pair. */
export const ExportedVapidKeysSchema = z.object({
  publicKey: JsonWebKeySchema,
  privateKey: JsonWebKeySchema,
});

export type JsonWebKey = z.infer<typeof JsonWebKeySchema>;
export type ExportedVapidKeys = z.infer<typeof ExportedVapidKeysSchema>;
