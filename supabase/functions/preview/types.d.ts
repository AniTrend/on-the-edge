export type Payload = {
  url: string;
};

export type OpenGraphData = {
  ogTitle: string;
  ogType?: string;
  ogUrl?: string;
  ogDescription: string;
  ogImage?: {
    url: string;
    width?: string;
    height?: string;
    type?: string;
  };
  ogSiteName?: string;
  ogLocale?: string;
  success: boolean;
};
