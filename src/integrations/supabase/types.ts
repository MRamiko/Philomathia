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
      import_jobs: {
        Row: {
          cursor: Json
          id: string
          imported_count: number
          last_error: string | null
          params: Json
          pass_name: string
          provider: string
          skipped_count: number
          skipped_reasons: Json
          status: string
          updated_at: string
        }
        Insert: {
          cursor?: Json
          id?: string
          imported_count?: number
          last_error?: string | null
          params?: Json
          pass_name: string
          provider: string
          skipped_count?: number
          skipped_reasons?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          cursor?: Json
          id?: string
          imported_count?: number
          last_error?: string | null
          params?: Json
          pass_name?: string
          provider?: string
          skipped_count?: number
          skipped_reasons?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      item_facets: {
        Row: {
          confidence: number
          facet: string
          item_id: string
          source: string
          value: string
        }
        Insert: {
          confidence?: number
          facet: string
          item_id: string
          source: string
          value: string
        }
        Update: {
          confidence?: number
          facet?: string
          item_id?: string
          source?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_facets_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          created_at: string
          creator: string
          description_en: string
          description_ka: string | null
          facets_status: string
          genres: string[]
          id: string
          image_ref: string | null
          image_source: string | null
          is_georgian: boolean
          isbn: string | null
          keywords: string[]
          media_type: string
          mood_tags: string[]
          openlibrary_key: string | null
          original_title: string | null
          page_count: number | null
          popularity: number | null
          poster_url: string | null
          runtime_minutes: number | null
          search_document: unknown
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
          facets_status?: string
          genres?: string[]
          id?: string
          image_ref?: string | null
          image_source?: string | null
          is_georgian?: boolean
          isbn?: string | null
          keywords?: string[]
          media_type: string
          mood_tags?: string[]
          openlibrary_key?: string | null
          original_title?: string | null
          page_count?: number | null
          popularity?: number | null
          poster_url?: string | null
          runtime_minutes?: number | null
          search_document?: unknown
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
          facets_status?: string
          genres?: string[]
          id?: string
          image_ref?: string | null
          image_source?: string | null
          is_georgian?: boolean
          isbn?: string | null
          keywords?: string[]
          media_type?: string
          mood_tags?: string[]
          openlibrary_key?: string | null
          original_title?: string | null
          page_count?: number | null
          popularity?: number | null
          poster_url?: string | null
          runtime_minutes?: number | null
          search_document?: unknown
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
          georgian_preference: string
          id: string
          onboarded: boolean
          preferred_language: string
          swipe_no: number
          taste_baseline: Json | null
        }
        Insert: {
          avoided_genres?: string[]
          created_at?: string
          display_name?: string | null
          georgian_preference?: string
          id: string
          onboarded?: boolean
          preferred_language?: string
          swipe_no?: number
          taste_baseline?: Json | null
        }
        Update: {
          avoided_genres?: string[]
          created_at?: string
          display_name?: string | null
          georgian_preference?: string
          id?: string
          onboarded?: boolean
          preferred_language?: string
          swipe_no?: number
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
          address_ka: string | null
          city: string
          city_ka: string | null
          id: string
          is_sample: boolean
          lat: number | null
          lng: number | null
          name: string
          name_ka: string | null
        }
        Insert: {
          address: string
          address_ka?: string | null
          city: string
          city_ka?: string | null
          id?: string
          is_sample?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          name_ka?: string | null
        }
        Update: {
          address?: string
          address_ka?: string | null
          city?: string
          city_ka?: string | null
          id?: string
          is_sample?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          name_ka?: string | null
        }
        Relationships: []
      }
      swipe_receipts: {
        Row: {
          before_stats: Json
          before_tags: Json
          dwell_ms: number
          item_id: string
          opened_details: boolean
          previous_no: number
          swipe_no: number
          user_id: string
        }
        Insert: {
          before_stats: Json
          before_tags: Json
          dwell_ms?: number
          item_id: string
          opened_details?: boolean
          previous_no: number
          swipe_no: number
          user_id: string
        }
        Update: {
          before_stats?: Json
          before_tags?: Json
          dwell_ms?: number
          item_id?: string
          opened_details?: boolean
          previous_no?: number
          swipe_no?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipe_receipts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
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
      user_facet_stats: {
        Row: {
          exposures_ew: number
          facet: string
          last_swipe_no: number
          likes_ew: number
          media_type: string
          passes_ew: number
          strong_ew: number
          user_id: string
          value: string
        }
        Insert: {
          exposures_ew?: number
          facet: string
          last_swipe_no?: number
          likes_ew?: number
          media_type: string
          passes_ew?: number
          strong_ew?: number
          user_id: string
          value: string
        }
        Update: {
          exposures_ew?: number
          facet?: string
          last_swipe_no?: number
          likes_ew?: number
          media_type?: string
          passes_ew?: number
          strong_ew?: number
          user_id?: string
          value?: string
        }
        Relationships: []
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
      user_taste: {
        Row: {
          confidence_level: string
          defining: boolean
          facet: string
          importance: number
          media_type: string
          stance: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          confidence_level: string
          defining?: boolean
          facet: string
          importance?: number
          media_type: string
          stance: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          confidence_level?: string
          defining?: boolean
          facet?: string
          importance?: number
          media_type?: string
          stance?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      user_taste_overrides: {
        Row: {
          facet: string
          stance: string
          user_id: string
          value: string
        }
        Insert: {
          facet: string
          stance: string
          user_id: string
          value: string
        }
        Update: {
          facet?: string
          stance?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      user_taste_portrait: {
        Row: {
          archetype: string
          source: string
          summary: string
          swipe_no: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archetype: string
          source?: string
          summary: string
          swipe_no?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          archetype?: string
          source?: string
          summary?: string
          swipe_no?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watch_availability: {
        Row: {
          fetched_at: string
          item_id: string
          link: string | null
          providers: Json
          region: string
        }
        Insert: {
          fetched_at?: string
          item_id: string
          link?: string | null
          providers?: Json
          region?: string
        }
        Update: {
          fetched_at?: string
          item_id?: string
          link?: string | null
          providers?: Json
          region?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_availability_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ask_rank: { Args: { intent: Json }; Returns: Json }
      bump_tags: {
        Args: { _delta: number; _tags: string[] }
        Returns: undefined
      }
      catalog_candidates: {
        Args: {
          _avoid?: string[]
          _cold?: boolean
          _geo?: boolean
          _max_minutes?: number
          _max_pages?: number
          _media?: string
          _min_minutes?: number
          _min_pages?: number
        }
        Returns: {
          created_at: string
          creator: string
          description_en: string
          description_ka: string | null
          facets_status: string
          genres: string[]
          id: string
          image_ref: string | null
          image_source: string | null
          is_georgian: boolean
          isbn: string | null
          keywords: string[]
          media_type: string
          mood_tags: string[]
          openlibrary_key: string | null
          original_title: string | null
          page_count: number | null
          popularity: number | null
          poster_url: string | null
          runtime_minutes: number | null
          search_document: unknown
          source: string
          title_en: string
          title_ka: string | null
          tmdb_id: number | null
          trailer_key: string | null
          wikidata_id: string | null
          year: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      catalog_search: {
        Args: {
          _geo?: boolean
          _media?: string
          _page?: number
          _query?: string
        }
        Returns: Json
      }
      clean_display_name: { Args: { value: string }; Returns: string }
      get_discover_queue: {
        Args: {
          exclude_ids?: string[]
          filters?: Json
          limit?: number
          media_type?: string
          seed?: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_swipe: {
        Args: {
          action: string
          dwell_ms?: number
          item_id: string
          opened_details?: boolean
        }
        Returns: boolean
      }
      refresh_taste: { Args: { user_id?: string }; Returns: undefined }
      replay_taste: { Args: never; Returns: undefined }
      reset_facet_taste: { Args: never; Returns: undefined }
      reset_taste: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      starting_taste: { Args: { answers: Json }; Returns: undefined }
      taste_action: {
        Args: { _item: string; _kind: string; _rules: Json; _value: Json }
        Returns: boolean
      }
      trait_coverage: { Args: never; Returns: number }
      undo_record_swipe: { Args: { item_id: string }; Returns: boolean }
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
