export interface MirrorModel {
  mirrorURL: string;
  priority: number;
  notes: string;
}

export interface ThemeMetaModel {
  themeType: string;
  themeName: string;
  mirror: MirrorModel;
}

export interface ThemeModel {
  malID: number;
  name: string;
  year: number;
  season: string | 'winter' | 'summer' | 'spring' | 'fall';
  themes: ThemeMetaModel[];
}
