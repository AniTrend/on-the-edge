export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      anime_news: {
        Row: {
          author: string;
          content: string;
          created_at: string;
          description: string;
          id: string;
          image: string;
          link: string;
          published_on: number;
          title: string;
        };
        Insert: {
          author: string;
          content: string;
          created_at?: string;
          description: string;
          id: string;
          image: string;
          link: string;
          published_on: number;
          title: string;
        };
        Update: {
          author?: string;
          content?: string;
          created_at?: string;
          description?: string;
          id?: string;
          image?: string;
          link?: string;
          published_on?: number;
          title?: string;
        };
      };
      anime_relation: {
        Row: {
          anidb: number | null;
          anilist: number | null;
          anime_planet: string | null;
          anisearch: number | null;
          id: string;
          imdb: string | null;
          livechart: number | null;
          mal: number | null;
          notify_moe: string | null;
          shoboi: number | null;
          tmdb: number | null;
          trakt: number | null;
          tvdb: number | null;
          updated_at: string;
        };
        Insert: {
          anidb?: number | null;
          anilist?: number | null;
          anime_planet?: string | null;
          anisearch?: number | null;
          id?: string;
          imdb?: string | null;
          livechart?: number | null;
          mal?: number | null;
          notify_moe?: string | null;
          shoboi?: number | null;
          tmdb?: number | null;
          trakt?: number | null;
          tvdb?: number | null;
          updated_at?: string;
        };
        Update: {
          anidb?: number | null;
          anilist?: number | null;
          anime_planet?: string | null;
          anisearch?: number | null;
          id?: string;
          imdb?: string | null;
          livechart?: number | null;
          mal?: number | null;
          notify_moe?: string | null;
          shoboi?: number | null;
          tmdb?: number | null;
          trakt?: number | null;
          tvdb?: number | null;
          updated_at?: string;
        };
      };
      navigation_group: {
        Row: {
          authenticated: boolean;
          created_at: string;
          i18n: string;
          id: number;
        };
        Insert: {
          authenticated?: boolean;
          created_at?: string;
          i18n: string;
          id?: number;
        };
        Update: {
          authenticated?: boolean;
          created_at?: string;
          i18n?: string;
          id?: number;
        };
      };
      navigation_item: {
        Row: {
          created_at: string;
          criteria: Json;
          destination: string;
          group: number | null;
          i18n: string;
          icon: string;
          id: number;
        };
        Insert: {
          created_at?: string;
          criteria: Json;
          destination: string;
          group?: number | null;
          i18n: string;
          icon: string;
          id?: number;
        };
        Update: {
          created_at?: string;
          criteria?: Json;
          destination?: string;
          group?: number | null;
          i18n?: string;
          icon?: string;
          id?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
