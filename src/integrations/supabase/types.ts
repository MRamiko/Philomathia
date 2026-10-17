export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      items: {
        Row: {
          created_at: string
          creator: string
          description_en: string
          description_ka: string | null
          genres: string[]
          id: string
          is_georgian: boolean
          isbn: string | null
          keywords: string[]
          media_type: string
          mood_tags: string[]
          openlibrary_key: string | null
          original_title: string | null
          page_count: number | null
          poster_url: string | null
          runtime_minutes: number | null
          source: string
          title_en: string
          title_ka: string | null
          tmdb_id: number | null
          trailer_key: string | null
          wikidata_id: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          creator?: string
          description_en?: string
          description_ka?: string | null
          genres?: string[]
          id?: string
          is_georgian?: boolean
          isbn?: string | null
          keywords?: string[]
          media_type: string
          mood_tags?: string[]
          openlibrary_key?: string | null
          original_title?: string | null
          page_count?: number | null
          poster_url?: string | null
          runtime_minutes?: number | null
          source?: string
          title_en: string
          title_ka?: string | null
          tmdb_id?: number | null
          trailer_key?: string | null
          wikidata_id?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          creator?: string
          description_en?: string
          description_ka?: string | null
          genres?: string[]
          id?: string
          is_georgian?: boolean
          isbn?: string | null
          keywords?: string[]
          media_type?: string
          mood_tags?: string[]
          openlibrary_key?: string | null
          original_title?: string | null
          page_count?: number | null
          poster_url?: string | null
          runtime_minutes?: number | null
          source?: string
          title_en?: string
          title_ka?: string | null
          tmdb_id?: number | null
          trailer_key?: string | null
          wikidata_id?: string | null
          year?: number | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          id: string
          item_id: string
          logged_at: string
          rating: number | null
          review: string | null
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          logged_at?: string
          rating?: number | null
          review?: string | null
          status: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          logged_at?: string
          rating?: number | null
          review?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avoided_genres: string[]
          created_at: string
          display_name: string | null
          id: string
          onboarded: boolean
          preferred_language: string
          taste_baseline: Json | null
        }
        Insert: {
          avoided_genres?: string[]
          created_at?: string
          display_name?: string | null
          id: string
          onboarded?: boolean
          preferred_language?: string
          taste_baseline?: Json | null
        }
        Update: {
          avoided_genres?: string[]
          created_at?: string
          display_name?: string | null
          id?: string
          onboarded?: boolean
          preferred_language?: string
          taste_baseline?: Json | null
        }
        Relationships: []
      }
      shop_stock: {
        Row: {
          id: string
          item_id: string
          price_gel: number
          quantity: number
          shop_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          price_gel: number
          quantity?: number
          shop_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          price_gel?: number
          quantity?: number
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_stock_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string
          city: string
          id: string
          lat: number | null
          lng: number | null
          name: string
        }
        Insert: {
          address: string
          city: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
        }
        Update: {
          address?: string
          city?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
        }
        Relationships: []
      }
      swipes: {
        Row: {
          action: string
          created_at: string
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_weights: {
        Row: {
          id: string
          tag: string
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          id?: string
          tag: string
          updated_at?: string
          user_id: string
          weight?: number
        }
        Update: {
          id?: string
          tag?: string
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      taste_events: {
        Row: {
          active: boolean
          created_at: string
          decay: number
          delta: number
          id: string
          item_id: string | null
          kind: string
          tags: string[]
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          decay?: number
          delta?: number
          id?: string
          item_id?: string | null
          kind: string
          tags?: string[]
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          decay?: number
          delta?: number
          id?: string
          item_id?: string | null
          kind?: string
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taste_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          shop_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          shop_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_tags: {
        Args: { _delta: number; _tags: string[] }
        Returns: undefined
      }
      clean_display_name: { Args: { value: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      replay_taste: { Args: never; Returns: undefined }
      taste_action: {
        Args: { _item: string; _kind: string; _rules: Json; _value: Json }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "shop" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "shop", "admin"],
    },
  },
} as const
