// deno-lint-ignore-file
import { RCF822Date } from '../_shared/types/core.d.ts';

export interface Media {
  mediaId: any;
  banner?: string;
  poster?: string;
  fanart?: string;
  title: any;
  themes: any;
  schedule: any;
  rating: any;
  trailer?: string;
  network: any;
  producation: any;
  seasons: any;
  episodes: any;
  images: any;
  homepage?: string;
  description?: string;
  updated_at: RCF822Date;
}
