import { MalType } from '@scope/service/jikan';

export const isManga = (type?: MalType): boolean => type == MalType.Manga;
