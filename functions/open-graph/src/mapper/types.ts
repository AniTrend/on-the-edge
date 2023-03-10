import type { Optional } from "../../../_core/types.ts";

export type OpenGraphInfo = {
  title: Optional<string>;
  summary: Optional<string>;
  url: Optional<string>;
  site: Optional<string>;
  image: Optional<string>;
  locale: Optional<string>;
};
