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
      anime_episode: {
        Row: {
          created_at: string | null;
          id: number;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
        };
        Update: {
          created_at?: string | null;
          id?: number;
        };
      };
      anime_news: {
        Row: {
          author: string;
          content: string;
          created_at: string | null;
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
          created_at?: string | null;
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
          created_at?: string | null;
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
          created_at: string | null;
          id: string;
        };
        Insert: {
          created_at?: string | null;
          id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
        };
      };
      navigation_group: {
        Row: {
          authenticated: boolean;
          created_at: string;
          i18n: string | null;
          id: number;
          name: string;
        };
        Insert: {
          authenticated?: boolean;
          created_at?: string;
          i18n?: string | null;
          id?: number;
          name: string;
        };
        Update: {
          authenticated?: boolean;
          created_at?: string;
          i18n?: string | null;
          id?: number;
          name?: string;
        };
      };
      navigation_item: {
        Row: {
          created_at: string;
          criteria: Json | null;
          destination: string;
          group: number | null;
          icon: string | null;
          id: number;
        };
        Insert: {
          created_at?: string;
          criteria?: Json | null;
          destination: string;
          group?: number | null;
          icon?: string | null;
          id?: number;
        };
        Update: {
          created_at?: string;
          criteria?: Json | null;
          destination?: string;
          group?: number | null;
          icon?: string | null;
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
