export type ThemeType = 'OP' | 'ED';

export type Theme = {
  id: string;
  name: string;
  video: string;
  audio: string | null;
  meta: {
    type: ThemeType;
    number: number;
    version: number;
  };
};
