import type { Optional } from '../../_core/types.ts';

export type OpenGraphInfo = {
    title: string;
    description: string;
    url: string;
    site: Optional<string>;
    image: Optional<string>;
    locale: Optional<string>;
}
