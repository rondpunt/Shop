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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cars: {
        Row: {
          color_hex: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          plate: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color_hex?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          plate?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color_hex?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          plate?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discovered_spots: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          lat: number
          lng: number
          spot_id: string
          updated_at: string
          visit_count: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          lat: number
          lng: number
          spot_id: string
          updated_at?: string
          visit_count?: number
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          lat?: number
          lng?: number
          spot_id?: string
          updated_at?: string
          visit_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          provider: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          provider?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          provider?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          address: string | null
          car_id: string | null
          created_at: string
          ended_at: string | null
          ends_at: string
          id: string
          is_discovered: boolean
          lat: number | null
          lng: number | null
          note: string | null
          photo_url: string | null
          spot_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          car_id?: string | null
          created_at?: string
          ended_at?: string | null
          ends_at: string
          id?: string
          is_discovered?: boolean
          lat?: number | null
          lng?: number | null
          note?: string | null
          photo_url?: string | null
          spot_id?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          car_id?: string | null
          created_at?: string
          ended_at?: string | null
          ends_at?: string
          id?: string
          is_discovered?: boolean
          lat?: number | null
          lng?: number | null
          note?: string | null
          photo_url?: string | null
          spot_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      spot_reports: {
        Row: {
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          note: string | null
          spot_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          spot_id: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          spot_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          environment: string
          id: string
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      spot_activity_stats: {
        Row: {
          active_now: number | null
          avg_duration_sec: number | null
          last_started_at: string | null
          spot_id: string | null
          total_sessions: number | null
        }
        Relationships: []
      }
      spot_reports_public: {
        Row: {
          created_at: string | null
          id: string | null
          spot_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          spot_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          spot_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      increment_discovered_spot_visit: {
        Args: { _spot_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
