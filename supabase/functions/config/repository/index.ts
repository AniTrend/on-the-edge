import { Growth } from '../../_shared/types/core.d.ts';
import {
  getPlatformSource,
  isAnalyticsEnabled,
} from '../../_shared/experiment/index.ts';
import { ClientConfiguration } from '../transform/types.d.ts';
import { Local } from '../local/index.ts';
import { transform } from '../transform/index.ts';
import { env } from '../../_shared/core/env.ts';

export class Repository {
  constructor(
    private growth: Growth,
    private local: Local,
  ) {}

  // get settings from our database or something based on an app version?
  getConfiguration = async (): Promise<ClientConfiguration> => {
    const defaultNavigation = await this.local.getDefaultNavigation();
    const genreMappings = await this.local.getContent(
      'android/content/anime_genre_relation.json',
    );

    return {
      token: env('SUPABASE_API_KEY'),
      settings: {
        analyticsEnabled: isAnalyticsEnabled(this.growth),
        platformSource: getPlatformSource(this.growth),
      },
      image: {
        banner: this.local.getMediaPublicUrl(
          'banner/156cc9127eb16c7fd645a9ba0fb3a4e21678353995_main.jpg',
        ).data.publicUrl,
        poster: '',
        loading: '',
        error: '',
        info: '',
        default: '',
      },
      navigation: defaultNavigation.map(transform),
      genres: genreMappings,
    };
  };
}
