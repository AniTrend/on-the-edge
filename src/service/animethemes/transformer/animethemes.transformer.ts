import type {
  AnimeThemesAnimeModel,
  AnimeThemesEntryModel,
  AnimeThemesThemeModel,
  AnimeThemesVideoModel,
} from '../animethemes.types.ts';
import type { Theme, ThemeType } from '../../theme/transformer/types.ts';

const themeId = (type: ThemeType, number: number, version: number) =>
  version > 1 ? `${type}${number} V${version}` : `${type}${number}`;

const selectPreferredVideo = (
  videos: AnimeThemesVideoModel[],
): AnimeThemesVideoModel | null => {
  const [preferred] = [...videos].sort((left, right) => {
    if (left.nc !== right.nc) {
      return Number(right.nc) - Number(left.nc);
    }

    const leftResolution = left.resolution ?? 0;
    const rightResolution = right.resolution ?? 0;
    if (leftResolution !== rightResolution) {
      return rightResolution - leftResolution;
    }

    return left.id - right.id;
  });

  return preferred ?? null;
};

const flattenThemeEntries = (animetheme: AnimeThemesThemeModel): Theme[] => {
  return [...(animetheme.animethemeentries ?? [])]
    .sort((left, right) => {
      const leftVersion = left.version ?? 1;
      const rightVersion = right.version ?? 1;
      if (leftVersion !== rightVersion) {
        return leftVersion - rightVersion;
      }

      return left.id - right.id;
    })
    .flatMap((entry) => {
      const selectedVideo = selectPreferredVideo(entry.videos ?? []);
      if (!selectedVideo) {
        return [];
      }

      return [toTheme(animetheme, entry, selectedVideo)];
    });
};

const toTheme = (
  animetheme: AnimeThemesThemeModel,
  entry: AnimeThemesEntryModel,
  video: AnimeThemesVideoModel,
): Theme => {
  const type = animetheme.type as ThemeType;
  const number = animetheme.sequence ?? 1;
  const version = entry.version ?? 1;
  const id = themeId(type, number, version);

  return {
    id,
    name: animetheme.song?.title ?? id,
    video: video.link,
    audio: video.audio?.link ?? null,
    meta: {
      type,
      number,
      version,
    },
  };
};

export const transformAnimeThemes = (anime: AnimeThemesAnimeModel): Theme[] => {
  return [...(anime.animethemes ?? [])]
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'OP' ? -1 : 1;
      }

      const leftSequence = left.sequence ?? 1;
      const rightSequence = right.sequence ?? 1;
      if (leftSequence !== rightSequence) {
        return leftSequence - rightSequence;
      }

      return left.id - right.id;
    })
    .flatMap((animetheme) => flattenThemeEntries(animetheme));
};
