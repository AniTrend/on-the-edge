import { Format } from '../../../service/notify/transformer/enums.ts';

export const isMovie = (format?: Format): boolean => format == Format.MOVIE;
