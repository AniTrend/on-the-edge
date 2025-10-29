import { z } from 'zod';
import { ItemSchema } from './otakumode.schema.ts';

export type OtakumodeFeed = z.infer<typeof ItemSchema>[] | undefined;
