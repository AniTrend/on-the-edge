import { z } from 'zod';
import { GithubVersionJsonSchema } from './github.schema.ts';

export type GithubVersionJson = z.infer<typeof GithubVersionJsonSchema>;
