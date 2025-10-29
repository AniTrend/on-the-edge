import z from 'zod';
import { ConfigSchema } from './config.schema.ts';

export type Config = z.infer<typeof ConfigSchema>;
