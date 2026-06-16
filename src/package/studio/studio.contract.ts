/**
 * Public OpenAPI contract schemas for the Studio domain.
 *
 * These schemas define the stable, named OpenAPI components that
 * GraphQL Mesh consumes. They are separate from runtime/domain
 * validation schemas because public contracts must be explicit,
 * named, and serializable.
 */

import { z } from '@scope/common/openapi';

export const StudioTitleContract = z.object({
  type: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
}).openapi({
  title: 'StudioTitle',
  description: 'Studio alternate title',
});

export const StudioContract = z.object({
  malId: z.number().int().positive(),
  titles: z.array(StudioTitleContract).default([]),
  name: z.string(),
  about: z.string().nullable().optional(),
  established: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  favorites: z.number().default(0),
  animeCount: z.number().default(0),
  fetchedAt: z.number(),
  expiresAt: z.number(),
}).openapi({
  title: 'Studio',
  description: 'Animation studio metadata resolved from Jikan (MAL)',
});
