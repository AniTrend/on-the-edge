import { Jikan } from '@scope/service/jikan';
import { MediaKind } from '../../series.types.ts';

export const isManga = (type?: Jikan['type']): boolean =>
  ['Manga', 'Novel', 'Light Novel', 'One-shot', 'Doujinshi', 'Manhwa', 'Manhua']
    .some((classification) => classification === type);

export const isAnime = (type?: Jikan['type']): boolean =>
  ['TV', 'Movie', 'OVA', 'Special', 'ONA', 'Music', 'CM', 'PV', 'TV Special']
    .some((classification) => classification === type);

export const inferMediaKind = (type?: Jikan['type']): MediaKind | null => {
  if (isAnime(type)) return 'ANIME';
  if (isManga(type)) return 'MANGA';
  return null;
};
