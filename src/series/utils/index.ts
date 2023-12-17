import { MalType } from '../service/jikan/remote/enums.ts';
import { Format } from '../service/notify/transformer/enums.ts';

export const isMovie = (format?: Format): boolean => format == Format.MOVIE;

export const isManga = (type?: MalType): boolean => type == MalType.Manga;
