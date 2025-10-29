import { z } from 'zod';
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import {
  EpisodeCanonicalSchema,
  EpisodeKindSchema,
  EpisodeQuerySchema,
  EpisodesContainerSchema,
  EpisodeThemesSchema,
  EpisodeTitleSchema,
} from './episodes.schema.ts';

extendZodWithOpenApi(z);

/**
 * OpenAPI schema for episode kind enum
 */
export const EpisodeKindSwagger = EpisodeKindSchema.openapi({
  title: 'Episode Kind',
  description: 'Episode type classification',
  example: 'main',
});

/**
 * OpenAPI schema for episode title
 */
export const EpisodeTitleSwagger = EpisodeTitleSchema.openapi({
  title: 'Episode Title',
  description: 'Multi-language episode title',
});

/**
 * OpenAPI schema for episode themes
 */
export const EpisodeThemesSwagger = EpisodeThemesSchema.openapi({
  title: 'Episode Themes',
  description: 'Opening and ending theme songs',
});

/**
 * OpenAPI schema for canonical episode
 */
export const EpisodeCanonicalSwagger = EpisodeCanonicalSchema.openapi({
  title: 'Episode',
  description: 'Canonical episode data from multiple sources',
});

/**
 * OpenAPI schema for episode query parameters
 */
export const EpisodeQuerySwagger = EpisodeQuerySchema.openapi({
  title: 'Episode Query',
  description: 'Query parameters for episode listing',
});

/**
 * OpenAPI schema for paginated episodes response
 */
export const EpisodesContainerSwagger = EpisodesContainerSchema.openapi({
  title: 'Episodes',
  description: 'Paginated episode listing with cursor navigation',
});

// Maintain backward compatibility
export const EpisodeSwagger = EpisodesContainerSwagger;
