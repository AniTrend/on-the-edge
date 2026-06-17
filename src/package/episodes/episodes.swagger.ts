import {
  EpisodeContract,
  EpisodeKindContract,
  EpisodesContract,
  EpisodeThemesContract,
  EpisodeTitleContract,
} from './episodes.contract.ts';
import { EpisodeQuerySchema } from './episodes.schema.ts';

/**
 * OpenAPI schema for episode kind enum
 */
export const EpisodeKindSwagger = EpisodeKindContract;

/**
 * OpenAPI schema for episode title
 */
export const EpisodeTitleSwagger = EpisodeTitleContract;

/**
 * OpenAPI schema for episode themes
 */
export const EpisodeThemesSwagger = EpisodeThemesContract;

/**
 * OpenAPI schema for canonical episode
 */
export const EpisodeCanonicalSwagger = EpisodeContract;

/**
 * OpenAPI schema for episode query parameters.
 *
 * EpisodeQuerySchema is a runtime schema defined with raw zod. The centralized
 * extendZodWithOpenApi(z) call globally extends the z singleton, so .openapi()
 * is available at runtime. We use the centralized z type for the cast.
 */
// deno-lint-ignore no-explicit-any
export const EpisodeQuerySwagger = (EpisodeQuerySchema as any).openapi({
  title: 'EpisodeQuery',
  description: 'Query parameters for episode listing',
});

/**
 * OpenAPI schema for paginated episodes response
 */
export const EpisodesContainerSwagger = EpisodesContract;

// Maintain backward compatibility
export const EpisodeSwagger = EpisodesContainerSwagger;
