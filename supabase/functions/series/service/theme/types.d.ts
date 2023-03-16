interface IMirror {
  mirrorURL: string;
  priority: number;
  notes: string;
}

interface IThemeMeta {
  themeType: string;
  themeName: string;
  mirror: IMirror;
}

interface ITheme {
  malID: number;
  name: string;
  year: number;
  season: string | 'winter' | 'summer' | 'spring' | 'fall';
  themes: IThemeMeta[];
}

export type ThemeType = 'OP' | 'ED';

export type Theme = {
  id: string;
  name: string;
  video: string;
  audio?: string;
  meta: {
    type: ThemeType;
    number: number;
    version: number;
  };
};
