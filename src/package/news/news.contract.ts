/**
 * Public OpenAPI contract schemas for the News domain.
 *
 * These schemas define the stable, named OpenAPI components that
 * GraphQL Mesh consumes. They are separate from runtime/domain
 * validation schemas because public contracts must be explicit,
 * named, and serializable.
 */

import { createPagingContract, z } from '@scope/common/openapi';

export const NewsContract = z.object({
  id: z.string(),
  title: z.string(),
  link: z.string().url(),
  description: z.string(),
  content: z.string(),
  category: z.string().nullable().optional(),
  genre: z.string().nullable().optional(),
  area: z.string().nullable().optional(),
  lang: z.string().nullable().optional(),
  publishedOn: z.number().finite(),
  image: z.string().url().nullable().optional(),
}).openapi({
  title: 'News',
  description: 'Schema representing a news document.',
});

export const NewsConnectionContract = createPagingContract(
  'News',
  NewsContract,
);
