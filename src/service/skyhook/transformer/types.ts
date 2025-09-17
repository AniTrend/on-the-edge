import { Instant } from '@scope/common/helpers';

export type Show = {
  firstAired: Instant;
  lastUpdated: Instant;
  banner?: string;
  poster?: string;
  fanart?: string;
};
