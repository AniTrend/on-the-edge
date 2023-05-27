export type OpenGraphImage = {
  height?: number;
  type: string;
  url: string;
  width?: number;
};

export type OpenGraphInfo = {
  title: string | null;
  summary: string | null;
  url: string | null;
  site: string | null;
  images: OpenGraphImage[];
  locale: string | null;
};
