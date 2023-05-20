import { logger } from '../../_shared/core/logger.ts';
import { Client } from '../../_shared/types/core.d.ts';
import { NavigationItem, PublicUrl } from './types.d.ts';

export class Local {
  constructor(
    private client: Client,
  ) {}

  getDefaultNavigation = async (): Promise<NavigationItem[]> => {
    const { data, error } = await this.client.from('navigation_item')
      .select(
        `id, criteria, destination, i18n, icon, group (id, authenticated, i18n)`,
      ).order('group', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      logger.error('Failed to query from navigation_item', error);
    }
    return data as NavigationItem[] ?? [];
  };

  getMediaPublicUrl = (
    resource: string,
  ): PublicUrl =>
    this.client.storage.from('app')
      .getPublicUrl(`android/media/${resource}`);

  getContent = async (
    resource: string,
  ): Promise<Map<string, number> | undefined> => {
    const { data, error } = await this.client.storage
      .from('app')
      .download(resource);

    if (error) {
      logger.error('Failed to download content from bucket', error);
    }

    return await data?.text().then(JSON.parse).catch((error) => {
      logger.error('Unable to parse content to JSON', error);
    });
  };
}
