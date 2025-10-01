import { MalType } from '@scope/service/jikan';

export const isManga = (type?: MalType): boolean => type === 'Manga';
export const isAnime = (type?: MalType): boolean => type === 'TV';
