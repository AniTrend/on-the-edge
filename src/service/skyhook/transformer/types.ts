import { Instant } from '../../../../common/helpers/date.ts';

export type Show = {
  firstAired: Instant;
  lastUpdated: Instant;
  banner?: string;
  poster?: string;
  fanart?: string;
};
