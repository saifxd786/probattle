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
      admin_audit_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          performed_by: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          performed_by?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          performed_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      agent_permissions: {
        Row: {
          agent_user_id: string
          can_approve_registrations: boolean
          can_manage_bgmi_results: boolean
          can_publish_room_details: boolean
          can_reply_support: boolean
          can_view_support: boolean
          can_view_transactions: boolean
          can_view_user_details: boolean
          can_view_users: boolean
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          agent_user_id: string
          can_approve_registrations?: boolean
          can_manage_bgmi_results?: boolean
          can_publish_room_details?: boolean
          can_reply_support?: boolean
          can_view_support?: boolean
          can_view_transactions?: boolean
          can_view_user_details?: boolean
          can_view_users?: boolean
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          agent_user_id?: string
          can_approve_registrations?: boolean
          can_manage_bgmi_results?: boolean
          can_publish_room_details?: boolean
          can_reply_support?: boolean
          can_view_support?: boolean
          can_view_transactions?: boolean
          can_view_user_details?: boolean
          can_view_users?: boolean
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      bgmi_profiles: {
        Row: {
          created_at: string
          id: string
          ingame_name: string
          player_id: string
          player_level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingame_name: string
          player_id: string
          player_level: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ingame_name?: string
          player_id?: string
          player_level?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      classic_schedule_settings: {
        Row: {
          auto_cancel_seconds: number
          created_at: string
          entry_fee: number
          first_place_prize: number | null
          id: string
          is_enabled: boolean
          map_name: string | null
          max_slots: number
          prize_per_kill: number | null
          prize_pool: number
          schedule_times: string[]
          second_place_prize: number | null
          third_place_prize: number | null
          updated_at: string
        }
        Insert: {
          auto_cancel_seconds?: number
          created_at?: string
          entry_fee?: number
          first_place_prize?: number | null
          id?: string
          is_enabled?: boolean
          map_name?: string | null
          max_slots?: number
          prize_per_kill?: number | null
          prize_pool?: number
          schedule_times?: string[]
          second_place_prize?: number | null
          third_place_prize?: number | null
          updated_at?: string
        }
        Update: {
          auto_cancel_seconds?: number
          created_at?: string
          entry_fee?: number
          first_place_prize?: number | null
          id?: string
          is_enabled?: boolean
          map_name?: string | null
          max_slots?: number
          prize_per_kill?: number | null
          prize_pool?: number
          schedule_times?: string[]
          second_place_prize?: number | null
          third_place_prize?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_login_bonus: {
        Row: {
          coins: number
          created_at: string
          id: string
          last_claim_date: string | null
          streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coins?: number
          created_at?: string
          id?: string
          last_claim_date?: string | null
          streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coins?: number
          created_at?: string
          id?: string
          last_claim_date?: string | null
          streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_login_settings: {
        Row: {
          coins_to_rupees_ratio: number
          created_at: string
          daily_coins: number
          id: string
          is_enabled: boolean
          min_coins_to_convert: number
          streak_bonus_coins: number
          updated_at: string
        }
        Insert: {
          coins_to_rupees_ratio?: number
          created_at?: string
          daily_coins?: number
          id?: string
          is_enabled?: boolean
          min_coins_to_convert?: number
          streak_bonus_coins?: number
          updated_at?: string
        }
        Update: {
          coins_to_rupees_ratio?: number
          created_at?: string
          daily_coins?: number
          id?: string
          is_enabled?: boolean
          min_coins_to_convert?: number
          streak_bonus_coins?: number
          updated_at?: string
        }
        Relationships: []
      }
      deposit_cleanup_logs: {
        Row: {
          error_message: string | null
          id: string
          rejected_count: number
          run_at: string
          success: boolean
        }
        Insert: {
          error_message?: string | null
          id?: string
          rejected_count?: number
          run_at?: string
          success?: boolean
        }
        Update: {
          error_message?: string | null
          id?: string
          rejected_count?: number
          run_at?: string
          success?: boolean
        }
        Relationships: []
      }
      device_bans: {
        Row: {
          banned_at: string
          banned_by: string | null
          created_at: string
          device_fingerprint: string
          expires_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          device_fingerprint: string
          expires_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          device_fingerprint?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      devices: {
        Row: {
          account_count: number
          app_version: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          created_at: string
          device_id: string
          device_model: string | null
          first_seen_at: string
          flag_reason: string | null
          id: string
          is_banned: boolean
          is_emulator: boolean | null
          is_flagged: boolean | null
          is_rooted: boolean | null
          last_seen_at: string
          os_version: string | null
          platform: string
          updated_at: string
        }
        Insert: {
          account_count?: number
          app_version?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string
          device_id: string
          device_model?: string | null
          first_seen_at?: string
          flag_reason?: string | null
          id?: string
          is_banned?: boolean
          is_emulator?: boolean | null
          is_flagged?: boolean | null
          is_rooted?: boolean | null
          last_seen_at?: string
          os_version?: string | null
          platform: string
          updated_at?: string
        }
        Update: {
          account_count?: number
          app_version?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string
          device_id?: string
          device_model?: string | null
          first_seen_at?: string
          flag_reason?: string | null
          id?: string
          is_banned?: boolean
          is_emulator?: boolean | null
          is_flagged?: boolean | null
          is_rooted?: boolean | null
          last_seen_at?: string
          os_version?: string | null
          platform?: string
          updated_at?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          correlation_id: string
          created_at: string
          device_fingerprint: string | null
          error_details: Json | null
          error_message: string
          error_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          correlation_id: string
          created_at?: string
          device_fingerprint?: string | null
          error_details?: Json | null
          error_message: string
          error_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          correlation_id?: string
          created_at?: string
          device_fingerprint?: string | null
          error_details?: Json | null
          error_message?: string
          error_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_challenges: {
        Row: {
          challenged_id: string
          challenger_id: string
          created_at: string
          entry_amount: number
          expires_at: string
          game_type: string
          id: string
          room_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          challenged_id: string
          challenger_id: string
          created_at?: string
          entry_amount?: number
          expires_at?: string
          game_type: string
          id?: string
          room_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          challenged_id?: string
          challenger_id?: string
          created_at?: string
          entry_amount?: number
          expires_at?: string
          game_type?: string
          id?: string
          room_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_challenges_challenged_id_fkey"
            columns: ["challenged_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ludo_rooms: {
        Row: {
          created_at: string
          current_turn: number | null
          ended_at: string | null
          entry_amount: number
          game_state: Json | null
          guest_color: string | null
          guest_id: string | null
          host_color: string | null
          host_id: string
          id: string
          reward_amount: number
          room_code: string
          started_at: string | null
          status: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          current_turn?: number | null
          ended_at?: string | null
          entry_amount?: number
          game_state?: Json | null
          guest_color?: string | null
          guest_id?: string | null
          host_color?: string | null
          host_id: string
          id?: string
          reward_amount?: number
          room_code: string
          started_at?: string | null
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          current_turn?: number | null
          ended_at?: string | null
          entry_amount?: number
          game_state?: Json | null
          guest_color?: string | null
          guest_id?: string | null
          host_color?: string | null
          host_id?: string
          id?: string
          reward_amount?: number
          room_code?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "match_registrations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "todays_scheduled_matches"
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
            foreignKeyName: "match_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "todays_scheduled_matches"
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
          auto_cancel_at: string | null
          banner_url: string | null
          created_at: string | null
          created_by: string | null
          entry_fee: number
          filled_slots: number
          first_place_prize: number | null
          game: Database["public"]["Enums"]["game_type"]
          gun_category: string | null
          id: string
          is_auto_scheduled: boolean | null
          is_free: boolean
          map_name: string | null
          match_code: string | null
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
          auto_cancel_at?: string | null
          banner_url?: string | null
          created_at?: string | null
          created_by?: string | null
          entry_fee?: number
          filled_slots?: number
          first_place_prize?: number | null
          game?: Database["public"]["Enums"]["game_type"]
          gun_category?: string | null
          id?: string
          is_auto_scheduled?: boolean | null
          is_free?: boolean
          map_name?: string | null
          match_code?: string | null
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
          auto_cancel_at?: string | null
          banner_url?: string | null
          created_at?: string | null
          created_by?: string | null
          entry_fee?: number
          filled_slots?: number
          first_place_prize?: number | null
          game?: Database["public"]["Enums"]["game_type"]
          gun_category?: string | null
          id?: string
          is_auto_scheduled?: boolean | null
          is_free?: boolean
          map_name?: string | null
          match_code?: string | null
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
      mines_games: {
        Row: {
          completed_at: string | null
          created_at: string
          current_multiplier: number
          entry_amount: number
          final_amount: number | null
          id: string
          is_cashed_out: boolean | null
          is_mine_hit: boolean | null
          mine_positions: number[]
          mines_count: number
          potential_win: number
          revealed_positions: number[]
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_multiplier?: number
          entry_amount: number
          final_amount?: number | null
          id?: string
          is_cashed_out?: boolean | null
          is_mine_hit?: boolean | null
          mine_positions: number[]
          mines_count: number
          potential_win?: number
          revealed_positions?: number[]
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_multiplier?: number
          entry_amount?: number
          final_amount?: number | null
          id?: string
          is_cashed_out?: boolean | null
          is_mine_hit?: boolean | null
          mine_positions?: number[]
          mines_count?: number
          potential_win?: number
          revealed_positions?: number[]
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      mines_settings: {
        Row: {
          base_multiplier: number
          created_at: string
          difficulty: string
          grid_size: number
          id: string
          is_enabled: boolean
          max_mines: number
          min_entry_amount: number
          min_mines: number
          platform_commission: number
          updated_at: string
        }
        Insert: {
          base_multiplier?: number
          created_at?: string
          difficulty?: string
          grid_size?: number
          id?: string
          is_enabled?: boolean
          max_mines?: number
          min_entry_amount?: number
          min_mines?: number
          platform_commission?: number
          updated_at?: string
        }
        Update: {
          base_multiplier?: number
          created_at?: string
          difficulty?: string
          grid_size?: number
          id?: string
          is_enabled?: boolean
          max_mines?: number
          min_entry_amount?: number
          min_mines?: number
          platform_commission?: number
          updated_at?: string
        }
        Relationships: []
      }
      multi_account_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          identifier_value: string
          is_resolved: boolean | null
          notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          updated_at: string
          user_count: number
          user_ids: string[]
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          identifier_value: string
          is_resolved?: boolean | null
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          updated_at?: string
          user_count?: number
          user_ids: string[]
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          identifier_value?: string
          is_resolved?: boolean | null
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          updated_at?: string
          user_count?: number
          user_ids?: string[]
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
          active_session_id: string | null
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_games: string[] | null
          created_at: string | null
          date_of_birth: string | null
          device_fingerprint: string | null
          email: string | null
          id: string
          is_banned: boolean | null
          last_login_at: string | null
          notification_permission_granted: boolean | null
          phone: string | null
          push_token: string | null
          referral_code: string | null
          referred_by: string | null
          security_answer: string | null
          security_question: string | null
          updated_at: string | null
          user_code: string | null
          username: string | null
          wager_requirement: number | null
          wallet_balance: number | null
        }
        Insert: {
          active_session_id?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_games?: string[] | null
          created_at?: string | null
          date_of_birth?: string | null
          device_fingerprint?: string | null
          email?: string | null
          id: string
          is_banned?: boolean | null
          last_login_at?: string | null
          notification_permission_granted?: boolean | null
          phone?: string | null
          push_token?: string | null
          referral_code?: string | null
          referred_by?: string | null
          security_answer?: string | null
          security_question?: string | null
          updated_at?: string | null
          user_code?: string | null
          username?: string | null
          wager_requirement?: number | null
          wallet_balance?: number | null
        }
        Update: {
          active_session_id?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_games?: string[] | null
          created_at?: string | null
          date_of_birth?: string | null
          device_fingerprint?: string | null
          email?: string | null
          id?: string
          is_banned?: boolean | null
          last_login_at?: string | null
          notification_permission_granted?: boolean | null
          phone?: string | null
          push_token?: string | null
          referral_code?: string | null
          referred_by?: string | null
          security_answer?: string | null
          security_question?: string | null
          updated_at?: string | null
          user_code?: string | null
          username?: string | null
          wager_requirement?: number | null
          wallet_balance?: number | null
        }
        Relationships: []
      }
      rate_limit_attempts: {
        Row: {
          attempts: number | null
          created_at: string | null
          first_attempt_at: string | null
          id: string
          ip_address: string | null
          key: string
          locked_until: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          first_attempt_at?: string | null
          id?: string
          ip_address?: string | null
          key: string
          locked_until?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          first_attempt_at?: string | null
          id?: string
          ip_address?: string | null
          key?: string
          locked_until?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          pending_reward: number | null
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_rewarded?: boolean
          pending_reward?: number | null
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount?: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_rewarded?: boolean
          pending_reward?: number | null
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_amount?: number
          status?: string
        }
        Relationships: []
      }
      spin_wheel: {
        Row: {
          created_at: string
          id: string
          reward_amount: number
          spun_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reward_amount: number
          spun_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reward_amount?: number
          spun_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spin_wheel_settings: {
        Row: {
          border_color: string | null
          center_color: string | null
          cooldown_hours: number
          created_at: string
          id: string
          is_enabled: boolean
          pointer_color: string | null
          required_deposit: number
          segment_colors: string[] | null
          segment_values: number[]
          updated_at: string
        }
        Insert: {
          border_color?: string | null
          center_color?: string | null
          cooldown_hours?: number
          created_at?: string
          id?: string
          is_enabled?: boolean
          pointer_color?: string | null
          required_deposit?: number
          segment_colors?: string[] | null
          segment_values?: number[]
          updated_at?: string
        }
        Update: {
          border_color?: string | null
          center_color?: string | null
          cooldown_hours?: number
          created_at?: string
          id?: string
          is_enabled?: boolean
          pointer_color?: string | null
          required_deposit?: number
          segment_colors?: string[] | null
          segment_values?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tdm_schedule_settings: {
        Row: {
          auto_cancel_seconds: number
          created_at: string
          entry_fee: number
          gun_category: string | null
          id: string
          is_enabled: boolean
          match_type: string
          max_slots: number
          prize_pool: number
          schedule_times: string[]
          updated_at: string
        }
        Insert: {
          auto_cancel_seconds?: number
          created_at?: string
          entry_fee?: number
          gun_category?: string | null
          id?: string
          is_enabled?: boolean
          match_type?: string
          max_slots?: number
          prize_pool?: number
          schedule_times?: string[]
          updated_at?: string
        }
        Update: {
          auto_cancel_seconds?: number
          created_at?: string
          entry_fee?: number
          gun_category?: string | null
          id?: string
          is_enabled?: boolean
          match_type?: string
          max_slots?: number
          prize_pool?: number
          schedule_times?: string[]
          updated_at?: string
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
          reward_multiplier_easy: number | null
          reward_multiplier_hard: number | null
          reward_multiplier_impossible: number | null
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
          reward_multiplier_easy?: number | null
          reward_multiplier_hard?: number | null
          reward_multiplier_impossible?: number | null
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
          reward_multiplier_easy?: number | null
          reward_multiplier_hard?: number | null
          reward_multiplier_impossible?: number | null
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
      user_bank_cards: {
        Row: {
          account_holder_name: string
          bank_name: string
          card_number: string
          created_at: string
          id: string
          ifsc_code: string
          user_id: string
        }
        Insert: {
          account_holder_name: string
          bank_name: string
          card_number: string
          created_at?: string
          id?: string
          ifsc_code: string
          user_id: string
        }
        Update: {
          account_holder_name?: string
          bank_name?: string
          card_number?: string
          created_at?: string
          id?: string
          ifsc_code?: string
          user_id?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          device_id: string
          id: string
          is_primary: boolean | null
          last_login_at: string
          linked_at: string
          user_id: string
        }
        Insert: {
          device_id: string
          id?: string
          is_primary?: boolean | null
          last_login_at?: string
          linked_at?: string
          user_id: string
        }
        Update: {
          device_id?: string
          id?: string
          is_primary?: boolean | null
          last_login_at?: string
          linked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["device_id"]
          },
        ]
      }
      user_login_sessions: {
        Row: {
          city: string | null
          color_depth: number | null
          country: string | null
          country_code: string | null
          created_at: string
          device_fingerprint: string | null
          device_memory: number | null
          device_name: string | null
          hardware_concurrency: number | null
          id: string
          ip_address: string | null
          is_registration: boolean | null
          isp: string | null
          language: string | null
          latitude: number | null
          longitude: number | null
          platform: string | null
          region: string | null
          screen_resolution: string | null
          timezone: string | null
          touch_support: boolean | null
          user_agent: string | null
          user_id: string
          webgl_renderer: string | null
        }
        Insert: {
          city?: string | null
          color_depth?: number | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_memory?: number | null
          device_name?: string | null
          hardware_concurrency?: number | null
          id?: string
          ip_address?: string | null
          is_registration?: boolean | null
          isp?: string | null
          language?: string | null
          latitude?: number | null
          longitude?: number | null
          platform?: string | null
          region?: string | null
          screen_resolution?: string | null
          timezone?: string | null
          touch_support?: boolean | null
          user_agent?: string | null
          user_id: string
          webgl_renderer?: string | null
        }
        Update: {
          city?: string | null
          color_depth?: number | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_memory?: number | null
          device_name?: string | null
          hardware_concurrency?: number | null
          id?: string
          ip_address?: string | null
          is_registration?: boolean | null
          isp?: string | null
          language?: string | null
          latitude?: number | null
          longitude?: number | null
          platform?: string | null
          region?: string | null
          screen_resolution?: string | null
          timezone?: string | null
          touch_support?: boolean | null
          user_agent?: string | null
          user_id?: string
          webgl_renderer?: string | null
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
      user_upi_accounts: {
        Row: {
          first_used_at: string
          id: string
          last_used_at: string
          upi_id: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          first_used_at?: string
          id?: string
          last_used_at?: string
          upi_id: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          first_used_at?: string
          id?: string
          last_used_at?: string
          upi_id?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_login_rewards: {
        Row: {
          claimed_at: string
          created_at: string
          day_of_week: number
          id: string
          reward_amount: number
          user_id: string
          week_start: string
        }
        Insert: {
          claimed_at?: string
          created_at?: string
          day_of_week: number
          id?: string
          reward_amount?: number
          user_id: string
          week_start: string
        }
        Update: {
          claimed_at?: string
          created_at?: string
          day_of_week?: number
          id?: string
          reward_amount?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      app_settings_public: {
        Row: {
          created_at: string | null
          id: string | null
          key: string | null
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          key?: string | null
          updated_at?: string | null
          value?: never
        }
        Update: {
          created_at?: string | null
          id?: string | null
          key?: string | null
          updated_at?: string | null
          value?: never
        }
        Relationships: []
      }
      todays_scheduled_matches: {
        Row: {
          auto_cancel_at: string | null
          banner_url: string | null
          created_at: string | null
          created_by: string | null
          entry_fee: number | null
          fill_status: string | null
          filled_slots: number | null
          first_place_prize: number | null
          game: Database["public"]["Enums"]["game_type"] | null
          gun_category: string | null
          id: string | null
          is_auto_scheduled: boolean | null
          is_free: boolean | null
          map_name: string | null
          match_time: string | null
          match_type: Database["public"]["Enums"]["match_type"] | null
          max_slots: number | null
          prize_per_kill: number | null
          prize_pool: number | null
          room_id: string | null
          room_password: string | null
          rules: string | null
          second_place_prize: number | null
          status: Database["public"]["Enums"]["match_status"] | null
          third_place_prize: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          auto_cancel_at?: string | null
          banner_url?: string | null
          created_at?: string | null
          created_by?: string | null
          entry_fee?: number | null
          fill_status?: never
          filled_slots?: number | null
          first_place_prize?: number | null
          game?: Database["public"]["Enums"]["game_type"] | null
          gun_category?: string | null
          id?: string | null
          is_auto_scheduled?: boolean | null
          is_free?: boolean | null
          map_name?: string | null
          match_time?: string | null
          match_type?: Database["public"]["Enums"]["match_type"] | null
          max_slots?: number | null
          prize_per_kill?: number | null
          prize_pool?: number | null
          room_id?: string | null
          room_password?: string | null
          rules?: string | null
          second_place_prize?: number | null
          status?: Database["public"]["Enums"]["match_status"] | null
          third_place_prize?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_cancel_at?: string | null
          banner_url?: string | null
          created_at?: string | null
          created_by?: string | null
          entry_fee?: number | null
          fill_status?: never
          filled_slots?: number | null
          first_place_prize?: number | null
          game?: Database["public"]["Enums"]["game_type"] | null
          gun_category?: string | null
          id?: string | null
          is_auto_scheduled?: boolean | null
          is_free?: boolean | null
          map_name?: string | null
          match_time?: string | null
          match_type?: Database["public"]["Enums"]["match_type"] | null
          max_slots?: number | null
          prize_per_kill?: number | null
          prize_pool?: number | null
          room_id?: string | null
          room_password?: string | null
          rules?: string | null
          second_place_prize?: number | null
          status?: Database["public"]["Enums"]["match_status"] | null
          third_place_prize?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_friend_request: { Args: { request_id: string }; Returns: Json }
      are_friends: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      atomic_referral_reward: {
        Args: {
          p_referred_id: string
          p_referrer_id: string
          p_reward_amount: number
        }
        Returns: boolean
      }
      atomic_wallet_update: {
        Args: {
          p_admin_id?: string
          p_amount: number
          p_reason: string
          p_user_id: string
        }
        Returns: {
          error_message: string
          new_balance: number
          success: boolean
        }[]
      }
      auto_cancel_unfilled_match: {
        Args: { p_match_id: string }
        Returns: Json
      }
      ban_device: {
        Args: {
          p_admin_id: string
          p_cascade_to_users?: boolean
          p_device_id: string
          p_reason: string
        }
        Returns: {
          affected_users: number
          success: boolean
        }[]
      }
      cancel_ludo_room: { Args: { p_room_id: string }; Returns: Json }
      check_device_status: {
        Args: { p_device_id: string }
        Returns: {
          account_count: number
          ban_reason: string
          is_banned: boolean
          is_flagged: boolean
          max_accounts_reached: boolean
        }[]
      }
      check_ludo_room: { Args: { p_room_code: string }; Returns: Json }
      check_referral_eligibility: { Args: { p_user_id: string }; Returns: Json }
      check_spin_availability: { Args: never; Returns: Json }
      claim_daily_bonus: { Args: never; Returns: Json }
      claim_referral_rewards: { Args: never; Returns: Json }
      claim_weekly_login_reward: { Args: never; Returns: Json }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      cleanup_stale_processing_deposits: { Args: never; Returns: Json }
      convert_coins_to_wallet: {
        Args: { coins_to_convert: number }
        Returns: Json
      }
      create_ludo_room: { Args: { p_entry_amount: number }; Returns: Json }
      detect_multi_accounts: { Args: never; Returns: Json }
      generate_5digit_user_code: { Args: never; Returns: string }
      generate_match_code: { Args: never; Returns: string }
      generate_room_code: { Args: never; Returns: string }
      get_match_room_credentials: {
        Args: { _match_id: string }
        Returns: {
          room_id: string
          room_password: string
        }[]
      }
      get_weekly_login_status: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_device_banned: { Args: { fingerprint: string }; Returns: boolean }
      is_registered_for_match: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
      is_session_valid: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
      join_ludo_room: { Args: { p_room_code: string }; Returns: Json }
      link_user_to_device: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
      log_user_session: {
        Args: {
          p_device_fingerprint?: string
          p_device_name?: string
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      ludo_is_user_in_match: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
      register_device: {
        Args: {
          p_app_version?: string
          p_device_id: string
          p_device_model?: string
          p_is_emulator?: boolean
          p_is_rooted?: boolean
          p_os_version?: string
          p_platform: string
        }
        Returns: {
          account_count: number
          ban_reason: string
          can_create_account: boolean
          device_banned: boolean
          success: boolean
        }[]
      }
      set_active_session: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
      spin_wheel: { Args: never; Returns: Json }
      unban_device: { Args: { p_device_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "agent"
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
      app_role: ["admin", "moderator", "user", "agent"],
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
