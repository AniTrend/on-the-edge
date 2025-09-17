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
