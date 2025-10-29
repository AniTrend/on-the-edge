import type { ThemeMetaModel, ThemeModel } from '../theme.types.ts';
import type { Theme, ThemeType } from './types.ts';

const themeMetaData = (theme: ThemeMetaModel) => {
  const parts = theme.themeType.match(/(OP|ED)(\d+)?( V(\d+))?/);
  const number = parts?.at(2);
  const version = parts?.at(4);
  return {
    type: (parts?.at(1) as ThemeType) ?? 'OP',
    number: number ? parseInt(number, 10) : 1,
    version: version ? parseInt(version, 10) : 1,
  };
};

export const transformThemes = (
  sourceData: ThemeModel[],
  baseUrl: string,
): Theme[] => {
  const malId = sourceData.at(0)?.malID;
  const audioBase = malId ? `${baseUrl}/themes/${malId}` : null;

  return sourceData
    .flatMap((item) => item.themes)
    .sort((prev, next) => prev.mirror.priority - next.mirror.priority)
    .map((item) => ({
      id: item.themeType,
      name: item.themeName,
      video: item.mirror.mirrorURL,
      audio: audioBase ? `${audioBase}/${item.themeType}/audio` : null,
      meta: themeMetaData(item),
    }));
};
