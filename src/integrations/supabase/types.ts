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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ludo_match_players: {
        Row: {
          bot_avatar_url: string | null
          bot_name: string | null
          id: string
          is_bot: boolean
          is_winner: boolean
          joined_at: string
          match_id: string
          player_color: string
          token_positions: Json
          tokens_home: number
          user_id: string | null
        }
        Insert: {
          bot_avatar_url?: string | null
          bot_name?: string | null
          id?: string
          is_bot?: boolean
          is_winner?: boolean
          joined_at?: string
          match_id: string
          player_color: string
          token_positions?: Json
          tokens_home?: number
          user_id?: string | null
        }
        Update: {
          bot_avatar_url?: string | null
          bot_name?: string | null
          id?: string
          is_bot?: boolean
          is_winner?: boolean
          joined_at?: string
          match_id?: string
          player_color?: string
          token_positions?: Json
          tokens_home?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ludo_match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "ludo_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      ludo_matches: {
        Row: {
          created_at: string
          created_by: string
          current_turn: number | null
          difficulty: Database["public"]["Enums"]["ludo_difficulty"]
          ended_at: string | null
          entry_amount: number
          game_state: Json | null
          id: string
          player_count: number
          reward_amount: number
          started_at: string | null
          status: Database["public"]["Enums"]["ludo_match_status"]
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          current_turn?: number | null
          difficulty?: Database["public"]["Enums"]["ludo_difficulty"]
          ended_at?: string | null
          entry_amount?: number
          game_state?: Json | null
          id?: string
          player_count?: number
          reward_amount?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["ludo_match_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          current_turn?: number | null
          difficulty?: Database["public"]["Enums"]["ludo_difficulty"]
          ended_at?: string | null
          entry_amount?: number
          game_state?: Json | null
          id?: string
          player_count?: number
          reward_amount?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["ludo_match_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ludo_matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ludo_settings: {
        Row: {
          created_at: string
          dice_randomness_weight: number
          difficulty: Database["public"]["Enums"]["ludo_difficulty"]
          high_amount_competitive: boolean
          id: string
          is_enabled: boolean
          min_entry_amount: number
          new_user_boost: boolean
          reward_multiplier: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dice_randomness_weight?: number
          difficulty?: Database["public"]["Enums"]["ludo_difficulty"]
          high_amount_competitive?: boolean
          id?: string
          is_enabled?: boolean
          min_entry_amount?: number
          new_user_boost?: boolean
          reward_multiplier?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dice_randomness_weight?: number
          difficulty?: Database["public"]["Enums"]["ludo_difficulty"]
          high_amount_competitive?: boolean
          id?: string
          is_enabled?: boolean
          min_entry_amount?: number
          new_user_boost?: boolean
          reward_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      ludo_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          match_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          match_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          match_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ludo_transactions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "ludo_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_registrations: {
        Row: {
          bgmi_ingame_name: string | null
          bgmi_player_id: string | null
          bgmi_player_level: number | null
          id: string
          is_approved: boolean | null
          match_id: string
          payment_screenshot_url: string | null
          payment_status: string
          registered_at: string | null
          team_name: string | null
          user_id: string
        }
        Insert: {
          bgmi_ingame_name?: string | null
          bgmi_player_id?: string | null
          bgmi_player_level?: number | null
          id?: string
          is_approved?: boolean | null
          match_id: string
          payment_screenshot_url?: string | null
          payment_status?: string
          registered_at?: string | null
          team_name?: string | null
          user_id: string
        }
        Update: {
          bgmi_ingame_name?: string | null
          bgmi_player_id?: string | null
          bgmi_player_level?: number | null
          id?: string
          is_approved?: boolean | null
          match_id?: string
          payment_screenshot_url?: string | null
          payment_status?: string
          registered_at?: string | null
          team_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_registrations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_results: {
        Row: {
          created_at: string
          id: string
          is_winner: boolean | null
          kills: number | null
          match_id: string
          position: number | null
          prize_amount: number | null
          registration_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_winner?: boolean | null
          kills?: number | null
          match_id: string
          position?: number | null
          prize_amount?: number | null
          registration_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_winner?: boolean | null
          kills?: number | null
          match_id?: string
          position?: number | null
          prize_amount?: number | null
          registration_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "match_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          banner_url: string | null
          created_at: string | null
          created_by: string | null
          entry_fee: number
          filled_slots: number
          first_place_prize: number | null
          game: Database["public"]["Enums"]["game_type"]
          id: string
          is_free: boolean
          map_name: string | null
          match_time: string
          match_type: Database["public"]["Enums"]["match_type"]
          max_slots: number
          prize_per_kill: number | null
          prize_pool: number
          room_id: string | null
          room_password: string | null
          rules: string | null
          second_place_prize: number | null
          status: Database["public"]["Enums"]["match_status"]
          third_place_prize: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          created_by?: string | null
          entry_fee?: number
          filled_slots?: number
          first_place_prize?: number | null
          game?: Database["public"]["Enums"]["game_type"]
          id?: string
          is_free?: boolean
          map_name?: string | null
          match_time: string
          match_type: Database["public"]["Enums"]["match_type"]
          max_slots?: number
          prize_per_kill?: number | null
          prize_pool?: number
          room_id?: string | null
          room_password?: string | null
          rules?: string | null
          second_place_prize?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          third_place_prize?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          created_by?: string | null
          entry_fee?: number
          filled_slots?: number
          first_place_prize?: number | null
          game?: Database["public"]["Enums"]["game_type"]
          id?: string
          is_free?: boolean
          map_name?: string | null
          match_time?: string
          match_type?: Database["public"]["Enums"]["match_type"]
          max_slots?: number
          prize_per_kill?: number | null
          prize_pool?: number
          room_id?: string | null
          room_password?: string | null
          rules?: string | null
          second_place_prize?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          third_place_prize?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          created_at: string | null
          email: string | null
          id: string
          is_banned: boolean | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string | null
          user_code: string | null
          username: string | null
          wager_requirement: number | null
          wallet_balance: number | null
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          is_banned?: boolean | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string | null
          user_code?: string | null
          username?: string | null
          wager_requirement?: number | null
          wallet_balance?: number | null
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_banned?: boolean | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string | null
          user_code?: string | null
          username?: string | null
          wager_requirement?: number | null
          wallet_balance?: number | null
        }
        Relationships: []
      }
      redeem_code_uses: {
        Row: {
          amount: number
          code_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          amount: number
          code_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          code_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redeem_code_uses_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "redeem_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      redeem_codes: {
        Row: {
          amount: number
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          is_rewarded: boolean
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_rewarded?: boolean
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_rewarded?: boolean
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_amount?: number
        }
        Relationships: []
      }
      thimble_games: {
        Row: {
          ball_position: number
          completed_at: string | null
          created_at: string
          difficulty: Database["public"]["Enums"]["thimble_difficulty"]
          entry_amount: number
          id: string
          is_win: boolean | null
          reward_amount: number
          selected_position: number | null
          status: string
          user_id: string
        }
        Insert: {
          ball_position: number
          completed_at?: string | null
          created_at?: string
          difficulty: Database["public"]["Enums"]["thimble_difficulty"]
          entry_amount: number
          id?: string
          is_win?: boolean | null
          reward_amount: number
          selected_position?: number | null
          status?: string
          user_id: string
        }
        Update: {
          ball_position?: number
          completed_at?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["thimble_difficulty"]
          entry_amount?: number
          id?: string
          is_win?: boolean | null
          reward_amount?: number
          selected_position?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      thimble_settings: {
        Row: {
          created_at: string
          difficulty: Database["public"]["Enums"]["thimble_difficulty"]
          id: string
          is_enabled: boolean
          min_entry_amount: number
          platform_commission: number
          reward_multiplier: number
          selection_time_easy: number
          selection_time_hard: number
          selection_time_impossible: number
          shuffle_duration_easy: number
          shuffle_duration_hard: number
          shuffle_duration_impossible: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["thimble_difficulty"]
          id?: string
          is_enabled?: boolean
          min_entry_amount?: number
          platform_commission?: number
          reward_multiplier?: number
          selection_time_easy?: number
          selection_time_hard?: number
          selection_time_impossible?: number
          shuffle_duration_easy?: number
          shuffle_duration_hard?: number
          shuffle_duration_impossible?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["thimble_difficulty"]
          id?: string
          is_enabled?: boolean
          min_entry_amount?: number
          platform_commission?: number
          reward_multiplier?: number
          selection_time_easy?: number
          selection_time_hard?: number
          selection_time_impossible?: number
          shuffle_duration_easy?: number
          shuffle_duration_hard?: number
          shuffle_duration_impossible?: number
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string | null
          description: string | null
          id: string
          screenshot_url: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          upi_id: string | null
          user_id: string
          utr_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          upi_id?: string | null
          user_id: string
          utr_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          upi_id?: string | null
          user_id?: string
          utr_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_match_room_credentials: {
        Args: { _match_id: string }
        Returns: {
          room_id: string
          room_password: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_registered_for_match: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
      ludo_is_user_in_match: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      game_type: "bgmi" | "freefire" | "clash_royale" | "ludo"
      ludo_difficulty: "easy" | "normal" | "competitive"
      ludo_match_status: "waiting" | "in_progress" | "completed" | "cancelled"
      match_status: "upcoming" | "pending" | "live" | "completed" | "cancelled"
      match_type: "tdm_1v1" | "tdm_2v2" | "tdm_4v4" | "classic"
      thimble_difficulty: "easy" | "hard" | "impossible"
      transaction_status: "processing" | "pending" | "completed" | "cancelled"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "prize"
        | "entry_fee"
        | "refund"
        | "admin_credit"
        | "admin_debit"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      game_type: ["bgmi", "freefire", "clash_royale", "ludo"],
      ludo_difficulty: ["easy", "normal", "competitive"],
      ludo_match_status: ["waiting", "in_progress", "completed", "cancelled"],
      match_status: ["upcoming", "pending", "live", "completed", "cancelled"],
      match_type: ["tdm_1v1", "tdm_2v2", "tdm_4v4", "classic"],
      thimble_difficulty: ["easy", "hard", "impossible"],
      transaction_status: ["processing", "pending", "completed", "cancelled"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "prize",
        "entry_fee",
        "refund",
        "admin_credit",
        "admin_debit",
      ],
    },
  },
} as const
