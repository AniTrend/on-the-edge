import { ThemeType } from './transformer/types.d.ts';

export type AnimeTheme = {
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
