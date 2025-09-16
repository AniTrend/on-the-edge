import { MalType } from '../../../service/jikan/remote/index.ts';

export const isManga = (type?: MalType): boolean => type == MalType.Manga;
