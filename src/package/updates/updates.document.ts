import type { WithId } from 'mongodb';
import type { UpdateRecord } from './updates.types.ts';

export type UpdateRecordWithId = WithId<UpdateRecord>;
