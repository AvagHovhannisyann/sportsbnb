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
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          xp_reward: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
          requirement_type: string
          requirement_value?: number
          xp_reward?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          xp_reward?: number
        }
        Relationships: []
      }
      ai_insights_cache: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          insight_type: string
          payload: Json
          scope_key: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          insight_type: string
          payload?: Json
          scope_key?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          insight_type?: string
          payload?: Json
          scope_key?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      autopilot_config: {
        Row: {
          created_at: string
          daily_send_cap: number
          digest_email: string | null
          id: number
          is_paused: boolean
          last_digest_at: string | null
          target_cities: Json
          telegram_chat_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_send_cap?: number
          digest_email?: string | null
          id?: number
          is_paused?: boolean
          last_digest_at?: string | null
          target_cities?: Json
          telegram_chat_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_send_cap?: number
          digest_email?: string | null
          id?: number
          is_paused?: boolean
          last_digest_at?: string | null
          target_cities?: Json
          telegram_chat_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      autopilot_runs: {
        Row: {
          bookings_handled: number
          discovered: number
          errors: Json
          finished_at: string | null
          followups: number
          id: string
          multi_channel: number
          replies: number
          researched: number
          sent: number
          started_at: string
          status: string
        }
        Insert: {
          bookings_handled?: number
          discovered?: number
          errors?: Json
          finished_at?: string | null
          followups?: number
          id?: string
          multi_channel?: number
          replies?: number
          researched?: number
          sent?: number
          started_at?: string
          status?: string
        }
        Update: {
          bookings_handled?: number
          discovered?: number
          errors?: Json
          finished_at?: string | null
          followups?: number
          id?: string
          multi_channel?: number
          replies?: number
          researched?: number
          sent?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          id: string
          reason: string | null
          venue_id: string
        }
        Insert: {
          blocked_date: string
          created_at?: string
          id?: string
          reason?: string | null
          venue_id: string
        }
        Update: {
          blocked_date?: string
          created_at?: string
          id?: string
          reason?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
          room_id: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
          room_id?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_name: string
          content: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          target_keyword: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          target_keyword?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          target_keyword?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_intents: {
        Row: {
          admin_notes: string | null
          booking_code: string
          booking_date: string | null
          booking_time: string | null
          channel_used: string
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          lead_outcome: string
          note: string | null
          outcome_updated_at: string | null
          players_count: number | null
          status: string
          updated_at: string
          user_id: string | null
          venue_id: string
          venue_name: string
        }
        Insert: {
          admin_notes?: string | null
          booking_code: string
          booking_date?: string | null
          booking_time?: string | null
          channel_used: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          lead_outcome?: string
          note?: string | null
          outcome_updated_at?: string | null
          players_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
          venue_id: string
          venue_name: string
        }
        Update: {
          admin_notes?: string | null
          booking_code?: string
          booking_date?: string | null
          booking_time?: string | null
          channel_used?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          lead_outcome?: string
          note?: string | null
          outcome_updated_at?: string | null
          players_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
          venue_id?: string
          venue_name?: string
        }
        Relationships: []
      }
      booking_waitlist: {
        Row: {
          booking_date: string
          booking_time: string
          created_at: string
          duration_hours: number
          expires_at: string | null
          id: string
          notified_at: string | null
          status: string
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          booking_date: string
          booking_time: string
          created_at?: string
          duration_hours?: number
          expires_at?: string | null
          id?: string
          notified_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          booking_date?: string
          booking_time?: string
          created_at?: string
          duration_hours?: number
          expires_at?: string | null
          id?: string
          notified_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          booking_time: string
          court_id: string | null
          created_at: string
          created_by_owner_id: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          duration_hours: number
          id: string
          notes: string | null
          payment_intent_id: string | null
          recurring_booking_id: string | null
          source: string
          status: string
          team_id: string | null
          total_price: number
          updated_at: string
          user_id: string
          venue_id: string
          venue_name: string
          venue_uuid: string | null
          starts_at: string | null
          ends_at: string | null
          amount_minor: number | null
          currency: string
          platform_fee_minor: number | null
          owner_amount_minor: number | null
          cancellation_policy: Json | null
          expires_at: string | null
        }
        Insert: {
          booking_date: string
          booking_time: string
          court_id?: string | null
          created_at?: string
          created_by_owner_id?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          duration_hours?: number
          id?: string
          notes?: string | null
          payment_intent_id?: string | null
          recurring_booking_id?: string | null
          source?: string
          status?: string
          team_id?: string | null
          total_price: number
          updated_at?: string
          user_id: string
          venue_id: string
          venue_name: string
          venue_uuid?: string | null
          starts_at?: string | null
          ends_at?: string | null
          amount_minor?: number | null
          currency?: string
          platform_fee_minor?: number | null
          owner_amount_minor?: number | null
          cancellation_policy?: Json | null
          expires_at?: string | null
        }
        Update: {
          booking_date?: string
          booking_time?: string
          court_id?: string | null
          created_at?: string
          created_by_owner_id?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          duration_hours?: number
          id?: string
          notes?: string | null
          payment_intent_id?: string | null
          recurring_booking_id?: string | null
          source?: string
          status?: string
          team_id?: string | null
          total_price?: number
          updated_at?: string
          user_id?: string
          venue_id?: string
          venue_name?: string
          venue_uuid?: string | null
          starts_at?: string | null
          ends_at?: string | null
          amount_minor?: number | null
          currency?: string
          platform_fee_minor?: number | null
          owner_amount_minor?: number | null
          cancellation_policy?: Json | null
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "venue_courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_recurring_booking_id_fkey"
            columns: ["recurring_booking_id"]
            isOneToOne: false
            referencedRelation: "recurring_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          provider: string
          refresh_token: string | null
          sync_enabled: boolean | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          venue_id: string | null
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider: string
          refresh_token?: string | null
          sync_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          venue_id?: string | null
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          sync_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_integrations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_fields: {
        Row: {
          confidence_score: number
          created_at: string
          detected_sport_type: string
          detection_source: string
          detection_timestamp: string
          id: string
          latitude: number
          longitude: number
          raw_metadata: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tile_key: string | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          detected_sport_type?: string
          detection_source?: string
          detection_timestamp?: string
          id?: string
          latitude: number
          longitude: number
          raw_metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tile_key?: string | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          detected_sport_type?: string
          detection_source?: string
          detection_timestamp?: string
          id?: string
          latitude?: number
          longitude?: number
          raw_metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tile_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_members: {
        Row: {
          id: string
          joined_at: string
          last_read_at: string | null
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_reported: boolean | null
          message_text: string
          message_type: string
          reported_at: string | null
          reported_by: string | null
          room_id: string
          sender_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_reported?: boolean | null
          message_text: string
          message_type?: string
          reported_at?: string | null
          reported_by?: string | null
          room_id: string
          sender_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_reported?: boolean | null
          message_text?: string
          message_type?: string
          reported_at?: string | null
          reported_by?: string | null
          room_id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          id: string
          reference_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reference_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reference_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      field_checkins: {
        Row: {
          checked_in_at: string
          checked_out_at: string | null
          field_id: string
          id: string
          player_count: number | null
          user_id: string
          verified_field_id: string | null
        }
        Insert: {
          checked_in_at?: string
          checked_out_at?: string | null
          field_id: string
          id?: string
          player_count?: number | null
          user_id: string
          verified_field_id?: string | null
        }
        Update: {
          checked_in_at?: string
          checked_out_at?: string | null
          field_id?: string
          id?: string
          player_count?: number | null
          user_id?: string
          verified_field_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_checkins_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "public_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_checkins_verified_field_id_fkey"
            columns: ["verified_field_id"]
            isOneToOne: false
            referencedRelation: "verified_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      field_submissions: {
        Row: {
          address: string | null
          admin_notes: string | null
          city: string
          created_at: string
          description: string | null
          has_lighting: boolean | null
          id: string
          latitude: number
          longitude: number
          name: string
          photo_url: string | null
          sports: string[]
          status: string
          submitted_by: string
          surface_type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          city?: string
          created_at?: string
          description?: string | null
          has_lighting?: boolean | null
          id?: string
          latitude: number
          longitude: number
          name: string
          photo_url?: string | null
          sports?: string[]
          status?: string
          submitted_by: string
          surface_type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          city?: string
          created_at?: string
          description?: string | null
          has_lighting?: boolean | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          photo_url?: string | null
          sports?: string[]
          status?: string
          submitted_by?: string
          surface_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      game_participants: {
        Row: {
          game_id: string
          id: string
          joined_at: string
          status: string
          user_id: string
        }
        Insert: {
          game_id: string
          id?: string
          joined_at?: string
          status?: string
          user_id: string
        }
        Update: {
          game_id?: string
          id?: string
          joined_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_participants_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          description: string | null
          duration_hours: number
          game_date: string
          game_time: string
          host_id: string
          id: string
          is_public: boolean | null
          latitude: number | null
          location: string
          longitude: number | null
          max_players: number
          play_mode: string
          price_per_player: number | null
          skill_level: string
          sport: string
          status: string
          team_id: string | null
          title: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_hours?: number
          game_date: string
          game_time: string
          host_id: string
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          location: string
          longitude?: number | null
          max_players?: number
          play_mode?: string
          price_per_player?: number | null
          skill_level?: string
          sport: string
          status?: string
          team_id?: string | null
          title: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_hours?: number
          game_date?: string
          game_time?: string
          host_id?: string
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          max_players?: number
          play_mode?: string
          price_per_player?: number | null
          skill_level?: string
          sport?: string
          status?: string
          team_id?: string | null
          title?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications_outbox: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          id: string
          last_error: string | null
          payload: Json
          sent_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          id?: string
          last_error?: string | null
          payload: Json
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      outreach_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          target_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          target_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_events_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "outreach_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_messages: {
        Row: {
          body: string
          direction: string
          from_email: string | null
          id: string
          resend_id: string | null
          sent_at: string
          sent_by: string | null
          status: string
          subject: string | null
          target_id: string
          to_email: string | null
        }
        Insert: {
          body: string
          direction: string
          from_email?: string | null
          id?: string
          resend_id?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject?: string | null
          target_id: string
          to_email?: string | null
        }
        Update: {
          body?: string
          direction?: string
          from_email?: string | null
          id?: string
          resend_id?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject?: string | null
          target_id?: string
          to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_messages_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "outreach_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_targets: {
        Row: {
          ai_body: string | null
          ai_subject: string | null
          autopilot_locked: boolean
          city: string | null
          contact_email: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          created_by: string | null
          enriched: Json
          followup_at: string | null
          followup_count: number
          id: string
          language: string
          last_contacted_at: string | null
          last_followup_at: string | null
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          place_id: string | null
          replied_at: string | null
          reply_sentiment: string | null
          research: Json
          status: string
          updated_at: string
        }
        Insert: {
          ai_body?: string | null
          ai_subject?: string | null
          autopilot_locked?: boolean
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          enriched?: Json
          followup_at?: string | null
          followup_count?: number
          id?: string
          language?: string
          last_contacted_at?: string | null
          last_followup_at?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          notes?: string | null
          place_id?: string | null
          replied_at?: string | null
          reply_sentiment?: string | null
          research?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          ai_body?: string | null
          ai_subject?: string | null
          autopilot_locked?: boolean
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          enriched?: Json
          followup_at?: string | null
          followup_count?: number
          id?: string
          language?: string
          last_contacted_at?: string | null
          last_followup_at?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          place_id?: string | null
          replied_at?: string | null
          reply_sentiment?: string | null
          research?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      owner_reply_templates: {
        Row: {
          created_at: string
          id: string
          message_text: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_text: string
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_text?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_policies: {
        Row: {
          created_at: string
          id: string
          policy_data: Json
          policy_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          policy_data?: Json
          policy_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          policy_data?: Json
          policy_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          user_id: string
          booking_id: string | null
          game_id: string | null
          provider: string
          order_ref: number
          provider_payment_id: string | null
          amount_minor: number
          currency: string
          status: string
          refunded_minor: number
          idempotency_key: string | null
          provider_payload: Json | null
          error_code: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          booking_id?: string | null
          game_id?: string | null
          provider: string
          order_ref?: number
          provider_payment_id?: string | null
          amount_minor: number
          currency?: string
          status?: string
          refunded_minor?: number
          idempotency_key?: string | null
          provider_payload?: Json | null
          error_code?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          booking_id?: string | null
          game_id?: string | null
          provider?: string
          order_ref?: number
          provider_payment_id?: string | null
          amount_minor?: number
          currency?: string
          status?: string
          refunded_minor?: number
          idempotency_key?: string | null
          provider_payload?: Json | null
          error_code?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          id: number
          entry_type: string
          payment_id: string | null
          booking_id: string | null
          payout_id: string | null
          owner_id: string | null
          amount_minor: number
          currency: string
          memo: string | null
          created_at: string
        }
        Insert: {
          entry_type: string
          payment_id?: string | null
          booking_id?: string | null
          payout_id?: string | null
          owner_id?: string | null
          amount_minor: number
          currency?: string
          memo?: string | null
          created_at?: string
        }
        Update: {
          entry_type?: string
          payment_id?: string | null
          booking_id?: string | null
          payout_id?: string | null
          owner_id?: string | null
          amount_minor?: number
          currency?: string
          memo?: string | null
          created_at?: string
        }
        Relationships: []
      }
      owner_payout_accounts: {
        Row: {
          owner_id: string
          method: string
          details: Json
          verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          owner_id: string
          method: string
          details: Json
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          owner_id?: string
          method?: string
          details?: Json
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          id: string
          owner_id: string
          amount_minor: number
          currency: string
          status: string
          period_start: string | null
          period_end: string | null
          method: string | null
          destination_snapshot: Json | null
          reference: string | null
          initiated_by: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          amount_minor: number
          currency?: string
          status?: string
          period_start?: string | null
          period_end?: string | null
          method?: string | null
          destination_snapshot?: Json | null
          reference?: string | null
          initiated_by?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          amount_minor?: number
          currency?: string
          status?: string
          period_start?: string | null
          period_end?: string | null
          method?: string | null
          destination_snapshot?: Json | null
          reference?: string | null
          initiated_by?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          level: number
          notification_preferences: Json | null
          onboarding_completed: boolean
          phone: string | null
          preferred_currency: string | null
          preferred_sports: string[] | null
          skill_level: string | null
          sports_offered: string[] | null
          stripe_account_id: string | null
          stripe_onboarding_completed: boolean | null
          updated_at: string
          user_id: string
          user_type: string
          username: string | null
          venue_address: string | null
          venue_description: string | null
          venue_name: string | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          level?: number
          notification_preferences?: Json | null
          onboarding_completed?: boolean
          phone?: string | null
          preferred_currency?: string | null
          preferred_sports?: string[] | null
          skill_level?: string | null
          sports_offered?: string[] | null
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          updated_at?: string
          user_id: string
          user_type?: string
          username?: string | null
          venue_address?: string | null
          venue_description?: string | null
          venue_name?: string | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          level?: number
          notification_preferences?: Json | null
          onboarding_completed?: boolean
          phone?: string | null
          preferred_currency?: string | null
          preferred_sports?: string[] | null
          skill_level?: string | null
          sports_offered?: string[] | null
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          updated_at?: string
          user_id?: string
          user_type?: string
          username?: string | null
          venue_address?: string | null
          venue_description?: string | null
          venue_name?: string | null
          xp?: number
        }
        Relationships: []
      }
      public_fields: {
        Row: {
          active_checkins: number | null
          address: string | null
          best_time: string | null
          busyness_score: string | null
          city: string
          condition_rating: number | null
          created_at: string
          description: string | null
          has_goals: boolean | null
          has_lighting: boolean | null
          has_markings: boolean | null
          has_nets: boolean | null
          id: string
          is_approved: boolean | null
          last_checkin_at: string | null
          latitude: number
          longitude: number
          name: string
          peak_hours: string | null
          photo_url: string | null
          sports: string[]
          submitted_by: string | null
          surface_type: string | null
          updated_at: string
        }
        Insert: {
          active_checkins?: number | null
          address?: string | null
          best_time?: string | null
          busyness_score?: string | null
          city?: string
          condition_rating?: number | null
          created_at?: string
          description?: string | null
          has_goals?: boolean | null
          has_lighting?: boolean | null
          has_markings?: boolean | null
          has_nets?: boolean | null
          id?: string
          is_approved?: boolean | null
          last_checkin_at?: string | null
          latitude: number
          longitude: number
          name: string
          peak_hours?: string | null
          photo_url?: string | null
          sports?: string[]
          submitted_by?: string | null
          surface_type?: string | null
          updated_at?: string
        }
        Update: {
          active_checkins?: number | null
          address?: string | null
          best_time?: string | null
          busyness_score?: string | null
          city?: string
          condition_rating?: number | null
          created_at?: string
          description?: string | null
          has_goals?: boolean | null
          has_lighting?: boolean | null
          has_markings?: boolean | null
          has_nets?: boolean | null
          id?: string
          is_approved?: boolean | null
          last_checkin_at?: string | null
          latitude?: number
          longitude?: number
          name?: string
          peak_hours?: string | null
          photo_url?: string | null
          sports?: string[]
          submitted_by?: string | null
          surface_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recurring_bookings: {
        Row: {
          booking_time: string
          created_at: string
          day_of_week: number
          duration_hours: number
          end_date: string | null
          id: string
          is_active: boolean
          notes: string | null
          recurrence_type: string
          start_date: string
          team_id: string | null
          total_price: number
          updated_at: string
          user_id: string
          venue_id: string
          venue_name: string
        }
        Insert: {
          booking_time: string
          created_at?: string
          day_of_week: number
          duration_hours?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          recurrence_type?: string
          start_date: string
          team_id?: string | null
          total_price: number
          updated_at?: string
          user_id: string
          venue_id: string
          venue_name: string
        }
        Update: {
          booking_time?: string
          created_at?: string
          day_of_week?: number
          duration_hours?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          recurrence_type?: string
          start_date?: string
          team_id?: string | null
          total_price?: number
          updated_at?: string
          user_id?: string
          venue_id?: string
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
          uses_count?: number
        }
        Relationships: []
      }
      referral_credits: {
        Row: {
          created_at: string
          credit_amount: number
          id: string
          is_used: boolean
          referee_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          credit_amount?: number
          id?: string
          is_used?: boolean
          referee_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          credit_amount?: number
          id?: string
          is_used?: boolean
          referee_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      review_prompts: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          prompt_after: string
          status: string
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          prompt_after: string
          status?: string
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          prompt_after?: string
          status?: string
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_prompts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_email: string | null
          invited_user_id: string | null
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_email?: string | null
          invited_user_id?: string | null
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_email?: string | null
          invited_user_id?: string | null
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invite_code: string | null
          logo_url: string | null
          name: string
          owner_id: string
          sport: string
          team_size: number
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          sport: string
          team_size?: number
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          sport?: string
          team_size?: number
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      venue_courts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          price_per_hour: number | null
          sport: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price_per_hour?: number | null
          sport?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price_per_hour?: number | null
          sport?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_courts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_equipment: {
        Row: {
          created_at: string
          description: string | null
          equipment_type: string
          id: string
          is_available: boolean
          name: string
          price: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          equipment_type?: string
          id?: string
          is_available?: boolean
          name: string
          price?: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          equipment_type?: string
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_equipment_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_hours: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean | null
          open_time: string
          venue_id: string
        }
        Insert: {
          close_time: string
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          open_time: string
          venue_id: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          open_time?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_images: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          venue_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          venue_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_images_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_policies: {
        Row: {
          booking_window_days: number
          buffer_minutes: number
          cancellation_hours: number
          cancellation_policy: string
          checkin_instructions: string | null
          created_at: string
          early_arrival_minutes: number | null
          early_arrival_policy: string | null
          grace_period_minutes: number
          id: string
          max_duration_hours: number
          min_duration_hours: number
          overtime_rate_per_minute: number | null
          refund_type: string
          time_slot_increment: number
          updated_at: string
          venue_id: string
          venue_rules: string | null
        }
        Insert: {
          booking_window_days?: number
          buffer_minutes?: number
          cancellation_hours?: number
          cancellation_policy?: string
          checkin_instructions?: string | null
          created_at?: string
          early_arrival_minutes?: number | null
          early_arrival_policy?: string | null
          grace_period_minutes?: number
          id?: string
          max_duration_hours?: number
          min_duration_hours?: number
          overtime_rate_per_minute?: number | null
          refund_type?: string
          time_slot_increment?: number
          updated_at?: string
          venue_id: string
          venue_rules?: string | null
        }
        Update: {
          booking_window_days?: number
          buffer_minutes?: number
          cancellation_hours?: number
          cancellation_policy?: string
          checkin_instructions?: string | null
          created_at?: string
          early_arrival_minutes?: number | null
          early_arrival_policy?: string | null
          grace_period_minutes?: number
          id?: string
          max_duration_hours?: number
          min_duration_hours?: number
          overtime_rate_per_minute?: number | null
          refund_type?: string
          time_slot_increment?: number
          updated_at?: string
          venue_id?: string
          venue_rules?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_policies_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_promotions: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          is_active: boolean
          owner_id: string
          plan: string
          starts_at: string
          stripe_subscription_id: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          is_active?: boolean
          owner_id: string
          plan?: string
          starts_at?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          is_active?: boolean
          owner_id?: string
          plan?: string
          starts_at?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_promotions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          amenities: string[] | null
          city: string
          contact_name: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_indoor: boolean | null
          latitude: number | null
          location_confirmed: boolean | null
          longitude: number | null
          make_webhook_events: string[] | null
          make_webhook_url: string | null
          name: string
          owner_id: string
          phone: string | null
          price_per_hour: number
          rating: number | null
          review_count: number | null
          sms_enabled: boolean
          sports: string[]
          updated_at: string
          whatsapp_enabled: boolean
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          city: string
          contact_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_indoor?: boolean | null
          latitude?: number | null
          location_confirmed?: boolean | null
          longitude?: number | null
          make_webhook_events?: string[] | null
          make_webhook_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          price_per_hour?: number
          rating?: number | null
          review_count?: number | null
          sms_enabled?: boolean
          sports?: string[]
          updated_at?: string
          whatsapp_enabled?: boolean
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          city?: string
          contact_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_indoor?: boolean | null
          latitude?: number | null
          location_confirmed?: boolean | null
          longitude?: number | null
          make_webhook_events?: string[] | null
          make_webhook_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          price_per_hour?: number
          rating?: number | null
          review_count?: number | null
          sms_enabled?: boolean
          sports?: string[]
          updated_at?: string
          whatsapp_enabled?: boolean
          zip_code?: string | null
        }
        Relationships: []
      }
      verified_fields: {
        Row: {
          active_checkins: number | null
          address: string | null
          best_time: string | null
          busyness_score: string | null
          candidate_id: string | null
          city: string
          condition_rating: number | null
          created_at: string
          description: string | null
          has_lighting: boolean | null
          id: string
          is_public: boolean
          last_checkin_at: string | null
          latitude: number
          longitude: number
          name: string
          peak_hours: string | null
          photo_url: string | null
          sport_type: string
          surface_type: string | null
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          active_checkins?: number | null
          address?: string | null
          best_time?: string | null
          busyness_score?: string | null
          candidate_id?: string | null
          city?: string
          condition_rating?: number | null
          created_at?: string
          description?: string | null
          has_lighting?: boolean | null
          id?: string
          is_public?: boolean
          last_checkin_at?: string | null
          latitude: number
          longitude: number
          name: string
          peak_hours?: string | null
          photo_url?: string | null
          sport_type: string
          surface_type?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          active_checkins?: number | null
          address?: string | null
          best_time?: string | null
          busyness_score?: string | null
          candidate_id?: string | null
          city?: string
          condition_rating?: number | null
          created_at?: string
          description?: string | null
          has_lighting?: boolean | null
          id?: string
          is_public?: boolean
          last_checkin_at?: string | null
          latitude?: number
          longitude?: number
          name?: string
          peak_hours?: string | null
          photo_url?: string | null
          sport_type?: string
          surface_type?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verified_fields_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_fields"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      owner_balances: {
        Row: {
          owner_id: string | null
          currency: string | null
          balance_minor: number | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          onboarding_completed: boolean | null
          preferred_sports: string[] | null
          skill_level: string | null
          user_id: string | null
          user_type: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          onboarding_completed?: boolean | null
          preferred_sports?: string[] | null
          skill_level?: string | null
          user_id?: string | null
          user_type?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          onboarding_completed?: boolean | null
          preferred_sports?: string[] | null
          skill_level?: string | null
          user_id?: string | null
          user_type?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_chat_member: {
        Args: { p_role: string; p_room_id: string; p_user_id: string }
        Returns: undefined
      }
      check_and_award_achievements: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Tables"]["achievements"]["Row"][]
      }
      create_booking_hold: {
        Args: {
          p_venue_id: string
          p_starts_at: string
          p_ends_at: string
          p_court_id?: string | null
          p_notes?: string | null
        }
        Returns: Json
      }
      get_available_slots: {
        Args: { p_venue_id: string; p_date: string; p_court_id?: string | null }
        Returns: {
          slot_start: string
          slot_end: string
          available: boolean
        }[]
      }
      get_or_create_chat_room: {
        Args: { p_reference_id: string; p_type: string }
        Returns: string
      }
      join_game: {
        Args: { p_game_id: string }
        Returns: Json
      }
      get_or_create_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          code: string
          created_at: string
        }[]
      }
      get_player_stats: { Args: { p_user_id: string }; Returns: Json }
      notify_user: {
        Args: {
          p_user_id: string
          p_type: string
          p_title: string
          p_message: string
          p_link?: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chat_member: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_captain: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      is_user_blocked: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: boolean
      }
      send_system_message: {
        Args: { p_message: string; p_room_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
