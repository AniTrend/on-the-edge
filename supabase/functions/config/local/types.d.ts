import { Database, Json } from '../../_shared/types/supabase.d.ts';

export type PublicUrl = {
  data: {
    publicUrl: string;
  };
};

export type NavigationGroup = Pick<
  Database['public']['Tables']['navigation_group']['Row'],
  'id' | 'authenticated' | 'i18n'
>;

export type NavigationItem = {
  criteria: Json;
  destination: string;
  group: NavigationGroup;
  i18n: string;
  icon: string;
  id: number;
};
