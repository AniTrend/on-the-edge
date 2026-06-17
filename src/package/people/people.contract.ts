/**
 * Public OpenAPI contract schemas for the People domain.
 *
 * These schemas define the stable, named OpenAPI components that
 * GraphQL Mesh consumes. They are separate from runtime/domain
 * validation schemas because public contracts must be explicit,
 * named, and serializable.
 */

import { z } from '@scope/common/openapi';

export const PersonContract = z.object({
  malId: z.number().int().positive(),
  name: z.string(),
  givenName: z.string().nullable().optional(),
  familyName: z.string().nullable().optional(),
  alternateNames: z.array(z.string()).default([]),
  birthday: z.number().nullable().optional(),
  favorites: z.number().default(0),
  about: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  fetchedAt: z.number(),
  expiresAt: z.number(),
}).openapi({
  title: 'Person',
  description: 'Anime staff or voice actor metadata resolved from Jikan (MAL)',
});
