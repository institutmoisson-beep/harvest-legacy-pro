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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievement_badges: {
        Row: {
          badge_color: string | null
          badge_type: string
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          reward_amount: number | null
        }
        Insert: {
          badge_color?: string | null
          badge_type: string
          created_at?: string | null
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
          reward_amount?: number | null
        }
        Update: {
          badge_color?: string | null
          badge_type?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          reward_amount?: number | null
        }
        Relationships: []
      }
      active_locations: {
        Row: {
          accuracy: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_updated: string | null
          latitude: number
          location_type: string | null
          longitude: number
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          latitude: number
          location_type?: string | null
          longitude: number
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          latitude?: number
          location_type?: string | null
          longitude?: number
          user_id?: string
        }
        Relationships: []
      }
      admin_chat_conversations: {
        Row: {
          assigned_admin_id: string | null
          created_at: string | null
          id: string
          last_message_at: string | null
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_chat_messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          is_admin: boolean | null
          message: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_promo_codes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      african_locations: {
        Row: {
          city: string
          country: string
          created_at: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          city: string
          country: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          city?: string
          country?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      agent_badges: {
        Row: {
          badge_color: string | null
          created_at: string | null
          description: string | null
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          badge_color?: string | null
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          badge_color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      agent_bonus_tiers: {
        Row: {
          badge_icon: string
          bonus_amount: number
          created_at: string | null
          id: string
          max_transactions: number | null
          min_transactions: number
          tier_level: number
          tier_name: string
        }
        Insert: {
          badge_icon: string
          bonus_amount: number
          created_at?: string | null
          id?: string
          max_transactions?: number | null
          min_transactions: number
          tier_level: number
          tier_name: string
        }
        Update: {
          badge_icon?: string
          bonus_amount?: number
          created_at?: string | null
          id?: string
          max_transactions?: number | null
          min_transactions?: number
          tier_level?: number
          tier_name?: string
        }
        Relationships: []
      }
      agent_commission_earnings: {
        Row: {
          agent_id: string
          commission_amount: number
          commission_rate: number
          created_at: string | null
          id: string
          tier_level: number | null
          tier_name: string | null
          transaction_amount: number
          transaction_id: string
          transaction_type: string
        }
        Insert: {
          agent_id: string
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          id?: string
          tier_level?: number | null
          tier_name?: string | null
          transaction_amount: number
          transaction_id: string
          transaction_type: string
        }
        Update: {
          agent_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          tier_level?: number | null
          tier_name?: string | null
          transaction_amount?: number
          transaction_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_commission_earnings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "agent_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_commission_settings: {
        Row: {
          created_at: string | null
          deposit_rate: number
          id: string
          is_active: boolean | null
          min_transaction_amount: number | null
          updated_at: string | null
          withdrawal_rate: number
        }
        Insert: {
          created_at?: string | null
          deposit_rate?: number
          id?: string
          is_active?: boolean | null
          min_transaction_amount?: number | null
          updated_at?: string | null
          withdrawal_rate?: number
        }
        Update: {
          created_at?: string | null
          deposit_rate?: number
          id?: string
          is_active?: boolean | null
          min_transaction_amount?: number | null
          updated_at?: string | null
          withdrawal_rate?: number
        }
        Relationships: []
      }
      agent_commission_tiers: {
        Row: {
          badge_color: string
          commission_rate: number
          created_at: string | null
          id: string
          max_monthly_transactions: number | null
          min_monthly_transactions: number
          tier_level: number
          tier_name: string
        }
        Insert: {
          badge_color: string
          commission_rate: number
          created_at?: string | null
          id?: string
          max_monthly_transactions?: number | null
          min_monthly_transactions: number
          tier_level: number
          tier_name: string
        }
        Update: {
          badge_color?: string
          commission_rate?: number
          created_at?: string | null
          id?: string
          max_monthly_transactions?: number | null
          min_monthly_transactions?: number
          tier_level?: number
          tier_name?: string
        }
        Relationships: []
      }
      agent_commissions: {
        Row: {
          agent_id: number | null
          commission_amount: number | null
          created_at: string | null
          fee_type: string | null
          id: number
          order_id: number | null
        }
        Insert: {
          agent_id?: number | null
          commission_amount?: number | null
          created_at?: string | null
          fee_type?: string | null
          id?: number
          order_id?: number | null
        }
        Update: {
          agent_id?: number | null
          commission_amount?: number | null
          created_at?: string | null
          fee_type?: string | null
          id?: number
          order_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "merchant_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_earned_badges: {
        Row: {
          agent_id: string
          badge_id: string
          earned_at: string | null
          id: string
        }
        Insert: {
          agent_id: string
          badge_id: string
          earned_at?: string | null
          id?: string
        }
        Update: {
          agent_id?: string
          badge_id?: string
          earned_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_earned_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "agent_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_monthly_bonus_awards: {
        Row: {
          agent_id: string
          award_month: string
          awarded_at: string | null
          bonus_amount: number
          id: string
          tier_level: number
          tier_name: string
          transactions_count: number
        }
        Insert: {
          agent_id: string
          award_month: string
          awarded_at?: string | null
          bonus_amount: number
          id?: string
          tier_level: number
          tier_name: string
          transactions_count: number
        }
        Update: {
          agent_id?: string
          award_month?: string
          awarded_at?: string | null
          bonus_amount?: number
          id?: string
          tier_level?: number
          tier_name?: string
          transactions_count?: number
        }
        Relationships: []
      }
      agent_monthly_goals: {
        Row: {
          agent_id: string
          created_at: string | null
          current_value: number | null
          goal_type: string
          id: string
          month: string
          progress_percentage: number | null
          reward_amount: number | null
          reward_claimed: boolean | null
          status: string | null
          target_value: number
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          current_value?: number | null
          goal_type: string
          id?: string
          month: string
          progress_percentage?: number | null
          reward_amount?: number | null
          reward_claimed?: boolean | null
          status?: string | null
          target_value: number
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          current_value?: number | null
          goal_type?: string
          id?: string
          month?: string
          progress_percentage?: number | null
          reward_amount?: number | null
          reward_claimed?: boolean | null
          status?: string | null
          target_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_transactions: {
        Row: {
          agent_id: string
          amount: number
          created_at: string | null
          description: string | null
          id: string
          member_id: string
          status: string | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          member_id: string
          status?: string | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          member_id?: string
          status?: string | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      broadcast_channel_messages: {
        Row: {
          author_id: string
          body: string
          category: string
          created_at: string
          id: string
          image_url: string | null
          link_label: string | null
          link_url: string | null
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_label?: string | null
          link_url?: string | null
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_label?: string | null
          link_url?: string | null
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      broadcast_channel_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_channel_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "broadcast_channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      call_center_agents: {
        Row: {
          active_call_id: string | null
          average_call_duration: number | null
          calls_handled_today: number | null
          created_at: string | null
          id: string
          is_vip_handler: boolean | null
          last_active_at: string | null
          status: string
          total_calls_handled: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_call_id?: string | null
          average_call_duration?: number | null
          calls_handled_today?: number | null
          created_at?: string | null
          id?: string
          is_vip_handler?: boolean | null
          last_active_at?: string | null
          status?: string
          total_calls_handled?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_call_id?: string | null
          average_call_duration?: number | null
          calls_handled_today?: number | null
          created_at?: string | null
          id?: string
          is_vip_handler?: boolean | null
          last_active_at?: string | null
          status?: string
          total_calls_handled?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_center_agents_active_call_id_fkey"
            columns: ["active_call_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_center_history: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          call_session_id: string | null
          caller_code: string | null
          caller_id: string
          caller_latitude: number | null
          caller_longitude: number | null
          caller_name: string | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          notes_count: number | null
          queue_id: string | null
          routing_method: string | null
          status: string
          transferred_from: string | null
          wait_seconds: number | null
          was_transferred: boolean | null
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          call_session_id?: string | null
          caller_code?: string | null
          caller_id: string
          caller_latitude?: number | null
          caller_longitude?: number | null
          caller_name?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          notes_count?: number | null
          queue_id?: string | null
          routing_method?: string | null
          status?: string
          transferred_from?: string | null
          wait_seconds?: number | null
          was_transferred?: boolean | null
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          call_session_id?: string | null
          caller_code?: string | null
          caller_id?: string
          caller_latitude?: number | null
          caller_longitude?: number | null
          caller_name?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          notes_count?: number | null
          queue_id?: string | null
          routing_method?: string | null
          status?: string
          transferred_from?: string | null
          wait_seconds?: number | null
          was_transferred?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "call_center_history_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_center_history_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "call_center_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      call_center_notes: {
        Row: {
          agent_id: string
          call_session_id: string
          content: string
          created_at: string | null
          id: string
        }
        Insert: {
          agent_id: string
          call_session_id: string
          content: string
          created_at?: string | null
          id?: string
        }
        Update: {
          agent_id?: string
          call_session_id?: string
          content?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_center_notes_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_center_queue: {
        Row: {
          abandon_reason: string | null
          assigned_agent_id: string | null
          call_session_id: string | null
          caller_code: string
          caller_id: string
          caller_name: string | null
          completed_at: string | null
          connected_at: string | null
          created_at: string | null
          id: string
          is_vip: boolean | null
          priority: number | null
          status: string
          wait_start_at: string | null
        }
        Insert: {
          abandon_reason?: string | null
          assigned_agent_id?: string | null
          call_session_id?: string | null
          caller_code: string
          caller_id: string
          caller_name?: string | null
          completed_at?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          is_vip?: boolean | null
          priority?: number | null
          status?: string
          wait_start_at?: string | null
        }
        Update: {
          abandon_reason?: string | null
          assigned_agent_id?: string | null
          call_session_id?: string | null
          caller_code?: string
          caller_id?: string
          caller_name?: string | null
          completed_at?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          is_vip?: boolean | null
          priority?: number | null
          status?: string
          wait_start_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_center_queue_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "call_center_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_center_queue_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_center_settings: {
        Row: {
          auto_abandon_seconds: number | null
          created_at: string | null
          id: string
          inactive_agent_timeout_seconds: number | null
          max_queue_size: number | null
          max_wait_seconds: number | null
          routing_method: string
          updated_at: string | null
          vip_priority_boost: number | null
        }
        Insert: {
          auto_abandon_seconds?: number | null
          created_at?: string | null
          id?: string
          inactive_agent_timeout_seconds?: number | null
          max_queue_size?: number | null
          max_wait_seconds?: number | null
          routing_method?: string
          updated_at?: string | null
          vip_priority_boost?: number | null
        }
        Update: {
          auto_abandon_seconds?: number | null
          created_at?: string | null
          id?: string
          inactive_agent_timeout_seconds?: number | null
          max_queue_size?: number | null
          max_wait_seconds?: number | null
          routing_method?: string
          updated_at?: string | null
          vip_priority_boost?: number | null
        }
        Relationships: []
      }
      call_recordings: {
        Row: {
          call_id: string
          created_at: string | null
          duration_seconds: number | null
          file_path: string
          file_size_bytes: number | null
          id: string
          recorded_by: string
        }
        Insert: {
          call_id: string
          created_at?: string | null
          duration_seconds?: number | null
          file_path: string
          file_size_bytes?: number | null
          id?: string
          recorded_by: string
        }
        Update: {
          call_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_recordings_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "group_voice_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          answer: Json | null
          callee_id: string
          caller_id: string
          created_at: string | null
          ice_candidates: Json | null
          id: string
          offer: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          answer?: Json | null
          callee_id: string
          caller_id: string
          created_at?: string | null
          ice_candidates?: Json | null
          id?: string
          offer?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          answer?: Json | null
          callee_id?: string
          caller_id?: string
          created_at?: string | null
          ice_candidates?: Json | null
          id?: string
          offer?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          commission_rate: number
          commission_type: string | null
          created_at: string | null
          id: string
          level: number
          order_id: string | null
          source_user_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          commission_rate: number
          commission_type?: string | null
          created_at?: string | null
          id?: string
          level: number
          order_id?: string | null
          source_user_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          commission_rate?: number
          commission_type?: string | null
          created_at?: string | null
          id?: string
          level?: number
          order_id?: string | null
          source_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_products: {
        Row: {
          base_price: number
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          product_name: string
          product_type: string
          vendor_id: string | null
        }
        Insert: {
          base_price: number
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          product_name: string
          product_type: string
          vendor_id?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          product_name?: string
          product_type?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "credit_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_repayments: {
        Row: {
          amount_due: number
          amount_paid: number | null
          created_at: string | null
          credit_id: string | null
          days_overdue: number | null
          due_date: string
          id: string
          payment_date: string | null
          payment_method: string | null
          penalty_amount: number | null
          status: string | null
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          created_at?: string | null
          credit_id?: string | null
          days_overdue?: number | null
          due_date: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          penalty_amount?: number | null
          status?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          created_at?: string | null
          credit_id?: string | null
          days_overdue?: number | null
          due_date?: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          penalty_amount?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_repayments_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_vendors: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          phone: string
          product_categories: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_name: string
          contact_name: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          phone: string
          product_categories?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string
          product_categories?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      credits: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          contract_pdf_url: string | null
          created_at: string | null
          delivery_address: string | null
          down_payment: number | null
          duration_months: number
          end_date: string | null
          id: string
          installment_amount: number
          payment_frequency: string
          product_image: string | null
          product_name: string
          product_type: string
          remaining_amount: number
          start_date: string | null
          status: string | null
          total_price: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          contract_pdf_url?: string | null
          created_at?: string | null
          delivery_address?: string | null
          down_payment?: number | null
          duration_months: number
          end_date?: string | null
          id?: string
          installment_amount: number
          payment_frequency: string
          product_image?: string | null
          product_name: string
          product_type: string
          remaining_amount: number
          start_date?: string | null
          status?: string | null
          total_price: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          contract_pdf_url?: string | null
          created_at?: string | null
          delivery_address?: string | null
          down_payment?: number | null
          duration_months?: number
          end_date?: string | null
          id?: string
          installment_amount?: number
          payment_frequency?: string
          product_image?: string | null
          product_name?: string
          product_type?: string
          remaining_amount?: number
          start_date?: string | null
          status?: string | null
          total_price?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crypto_addresses: {
        Row: {
          address: string
          coin: string
          created_at: string | null
          id: number
          owner_id: string | null
        }
        Insert: {
          address: string
          coin: string
          created_at?: string | null
          id?: number
          owner_id?: string | null
        }
        Update: {
          address?: string
          coin?: string
          created_at?: string | null
          id?: number
          owner_id?: string | null
        }
        Relationships: []
      }
      crypto_payment_settings: {
        Row: {
          api_endpoint: string
          api_key: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          provider: string
        }
        Insert: {
          api_endpoint: string
          api_key?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          provider: string
        }
        Update: {
          api_endpoint?: string
          api_key?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          provider?: string
        }
        Relationships: []
      }
      currency_rates: {
        Row: {
          code: string
          is_active: boolean
          name: string
          rate_to_fcfa: number
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          is_active?: boolean
          name: string
          rate_to_fcfa?: number
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          is_active?: boolean
          name?: string
          rate_to_fcfa?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          actual_pickup_date: string | null
          created_at: string
          customer_id: string
          delivery_address: string | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          destination_relay_id: string | null
          distance_km: number | null
          estimated_pickup_date: string | null
          id: string
          notes: string | null
          order_id: number
          origin_relay_id: string | null
          payment_status: string
          shop_id: number
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        Insert: {
          actual_pickup_date?: string | null
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          destination_relay_id?: string | null
          distance_km?: number | null
          estimated_pickup_date?: string | null
          id?: string
          notes?: string | null
          order_id: number
          origin_relay_id?: string | null
          payment_status?: string
          shop_id: number
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Update: {
          actual_pickup_date?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          destination_relay_id?: string | null
          distance_km?: number | null
          estimated_pickup_date?: string | null
          id?: string
          notes?: string | null
          order_id?: number
          origin_relay_id?: string | null
          payment_status?: string
          shop_id?: number
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_destination_relay_id_fkey"
            columns: ["destination_relay_id"]
            isOneToOne: false
            referencedRelation: "relay_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_origin_relay_id_fkey"
            columns: ["origin_relay_id"]
            isOneToOne: false
            referencedRelation: "relay_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_assignments: {
        Row: {
          accepted_at: string | null
          assigned_by: string | null
          completed_at: string | null
          created_at: string
          delivery_fee: number
          delivery_id: string
          driver_id: string
          id: string
          rating_by_customer: number | null
          rating_by_driver: number | null
          review_by_customer: string | null
          review_by_driver: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_id: string
          driver_id: string
          id?: string
          rating_by_customer?: number | null
          rating_by_driver?: number | null
          review_by_customer?: string | null
          review_by_driver?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_id?: string
          driver_id?: string
          id?: string
          rating_by_customer?: number | null
          rating_by_driver?: number | null
          review_by_customer?: string | null
          review_by_driver?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_notifications: {
        Row: {
          created_at: string
          delivery_id: string
          id: string
          message: string | null
          notification_type: string
          read_at: string | null
          recipient_id: string
        }
        Insert: {
          created_at?: string
          delivery_id: string
          id?: string
          message?: string | null
          notification_type: string
          read_at?: string | null
          recipient_id: string
        }
        Update: {
          created_at?: string
          delivery_id?: string
          id?: string
          message?: string | null
          notification_type?: string
          read_at?: string | null
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notifications_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_offers: {
        Row: {
          created_at: string | null
          deliverer_id: string
          id: string
          message: string | null
          package_id: string
          proposed_delivery_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deliverer_id: string
          id?: string
          message?: string | null
          package_id: string
          proposed_delivery_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deliverer_id?: string
          id?: string
          message?: string | null
          package_id?: string
          proposed_delivery_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_offers_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "delivery_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_packages: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          customer_address: string
          customer_city: string
          customer_id: string
          customer_latitude: number | null
          customer_longitude: number | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          deliverer_id: string | null
          delivery_code: string | null
          delivery_commission: number | null
          delivery_method: string
          id: string
          notes: string | null
          order_id: string | null
          picked_up_at: string | null
          pickup_code: string | null
          relay_point_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          customer_address: string
          customer_city: string
          customer_id: string
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          deliverer_id?: string | null
          delivery_code?: string | null
          delivery_commission?: number | null
          delivery_method: string
          id?: string
          notes?: string | null
          order_id?: string | null
          picked_up_at?: string | null
          pickup_code?: string | null
          relay_point_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          customer_address?: string
          customer_city?: string
          customer_id?: string
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          deliverer_id?: string | null
          delivery_code?: string | null
          delivery_commission?: number | null
          delivery_method?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          picked_up_at?: string | null
          pickup_code?: string | null
          relay_point_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_packages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_packages_relay_point_id_fkey"
            columns: ["relay_point_id"]
            isOneToOne: false
            referencedRelation: "delivery_relay_points"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_providers: {
        Row: {
          api_key: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      delivery_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string
          deliverer_id: string
          id: string
          package_id: string
          rating: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id: string
          deliverer_id: string
          id?: string
          package_id: string
          rating?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string
          deliverer_id?: string
          id?: string
          package_id?: string
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_ratings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "delivery_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_relay_points: {
        Row: {
          address: string
          city: string
          country: string
          created_at: string | null
          description: string | null
          host_type: string
          host_user_id: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          manager_id: string | null
          name: string
          opening_hours: Json | null
          phone: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          address: string
          city: string
          country: string
          created_at?: string | null
          description?: string | null
          host_type?: string
          host_user_id?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name: string
          opening_hours?: Json | null
          phone?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string
          country?: string
          created_at?: string | null
          description?: string | null
          host_type?: string
          host_user_id?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      driver_ratings: {
        Row: {
          average_rating: number
          block_reason: string | null
          blocked: boolean
          created_at: string
          driver_id: string
          id: string
          is_verified: boolean
          successful_deliveries: number
          total_deliveries: number
          verification_date: string | null
        }
        Insert: {
          average_rating?: number
          block_reason?: string | null
          blocked?: boolean
          created_at?: string
          driver_id: string
          id?: string
          is_verified?: boolean
          successful_deliveries?: number
          total_deliveries?: number
          verification_date?: string | null
        }
        Update: {
          average_rating?: number
          block_reason?: string | null
          blocked?: boolean
          created_at?: string
          driver_id?: string
          id?: string
          is_verified?: boolean
          successful_deliveries?: number
          total_deliveries?: number
          verification_date?: string | null
        }
        Relationships: []
      }
      employment_domains: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          domain_icon: string | null
          domain_name: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          domain_icon?: string | null
          domain_name: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          domain_icon?: string | null
          domain_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      enterprise_appointments: {
        Row: {
          appointment_code: string
          appointment_date: string
          created_at: string | null
          enterprise_id: string
          id: string
          notes: string | null
          product_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appointment_code: string
          appointment_date: string
          created_at?: string | null
          enterprise_id: string
          id?: string
          notes?: string | null
          product_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appointment_code?: string
          appointment_date?: string
          created_at?: string | null
          enterprise_id?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_appointments_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_appointments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "enterprise_products"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_orders: {
        Row: {
          created_at: string | null
          enterprise_id: string
          id: string
          notes: string | null
          payment_method: string | null
          product_id: string | null
          quantity: number | null
          status: string | null
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enterprise_id: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          product_id?: string | null
          quantity?: number | null
          status?: string | null
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enterprise_id?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          product_id?: string | null
          quantity?: number | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_orders_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "enterprise_products"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          enterprise_id: string
          id: string
          image_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          enterprise_id: string
          id?: string
          image_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          enterprise_id?: string
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_photos_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_products: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          enterprise_id: string
          id: string
          image_url: string | null
          is_active: boolean | null
          is_service: boolean | null
          name: string
          price: number
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          enterprise_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_service?: boolean | null
          name: string
          price?: number
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          enterprise_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_service?: boolean | null
          name?: string
          price?: number
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_products_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          enterprise_id: string
          id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          enterprise_id: string
          id?: string
          rating?: number | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          enterprise_id?: string
          id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_reviews_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprises: {
        Row: {
          address: string | null
          banner_url: string | null
          branding_color: string | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          opening_hours: Json | null
          phone: string | null
          short_description: string | null
          slug: string
          social_links: Json | null
          updated_at: string | null
          video_url: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          branding_color?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          phone?: string | null
          short_description?: string | null
          slug: string
          social_links?: Json | null
          updated_at?: string | null
          video_url?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          branding_color?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          short_description?: string | null
          slug?: string
          social_links?: Json | null
          updated_at?: string | null
          video_url?: string | null
          website?: string | null
        }
        Relationships: []
      }
      establishments: {
        Row: {
          created_at: string
          description: string | null
          email: string | null
          establishment_type: string
          id: string
          is_active: boolean
          location: string
          name: string
          phone: string | null
          qr_code_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          email?: string | null
          establishment_type?: string
          id?: string
          is_active?: boolean
          location: string
          name: string
          phone?: string | null
          qr_code_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string | null
          establishment_type?: string
          id?: string
          is_active?: boolean
          location?: string
          name?: string
          phone?: string | null
          qr_code_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string
          event_end_date: string | null
          id: string
          image_url: string | null
          location: string | null
          max_capacity: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date: string
          event_end_date?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          max_capacity?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_end_date?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          max_capacity?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fund_contributions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      fund_withdrawals: {
        Row: {
          admin_id: string
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reason: string
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
        }
        Relationships: []
      }
      fundraiser_contributions: {
        Row: {
          amount: number
          contributor_name: string
          created_at: string | null
          fundraiser_id: string
          id: string
          is_anonymous: boolean | null
          message: string | null
          payment_method: string | null
          payment_status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          contributor_name: string
          created_at?: string | null
          fundraiser_id: string
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          payment_method?: string | null
          payment_status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          contributor_name?: string
          created_at?: string | null
          fundraiser_id?: string
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          payment_method?: string | null
          payment_status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fundraiser_contributions_fundraiser_id_fkey"
            columns: ["fundraiser_id"]
            isOneToOne: false
            referencedRelation: "fundraisers"
            referencedColumns: ["id"]
          },
        ]
      }
      fundraisers: {
        Row: {
          category: string | null
          contributors_count: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          current_amount: number | null
          description: string | null
          end_date: string
          goal_amount: number
          id: string
          image_url: string | null
          is_public: boolean | null
          payment_link: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          contributors_count?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          current_amount?: number | null
          description?: string | null
          end_date: string
          goal_amount?: number
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          payment_link?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          contributors_count?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          current_amount?: number | null
          description?: string | null
          end_date?: string
          goal_amount?: number
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          payment_link?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      geographic_assignments: {
        Row: {
          assignment_type: string
          city: string | null
          country: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assignment_type: string
          city?: string | null
          country: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assignment_type?: string
          city?: string | null
          country?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      group_call_messages: {
        Row: {
          call_id: string
          content: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          call_id: string
          content: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          call_id?: string
          content?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_call_messages_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "group_voice_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      group_call_participants: {
        Row: {
          call_id: string
          id: string
          is_muted: boolean | null
          joined_at: string | null
          left_at: string | null
          user_id: string
        }
        Insert: {
          call_id: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          user_id: string
        }
        Update: {
          call_id?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "group_voice_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      group_call_signals: {
        Row: {
          call_id: string
          created_at: string | null
          from_user_id: string
          id: string
          signal_data: Json
          signal_type: string
          to_user_id: string | null
        }
        Insert: {
          call_id: string
          created_at?: string | null
          from_user_id: string
          id?: string
          signal_data: Json
          signal_type: string
          to_user_id?: string | null
        }
        Update: {
          call_id?: string
          created_at?: string | null
          from_user_id?: string
          id?: string
          signal_data?: Json
          signal_type?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_call_signals_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "group_voice_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      group_voice_calls: {
        Row: {
          created_at: string | null
          created_by: string
          ended_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      immo_availability: {
        Row: {
          custom_price: number | null
          date: string
          id: string
          is_available: boolean | null
          listing_id: string
        }
        Insert: {
          custom_price?: number | null
          date: string
          id?: string
          is_available?: boolean | null
          listing_id: string
        }
        Update: {
          custom_price?: number | null
          date?: string
          id?: string
          is_available?: boolean | null
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "immo_availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "immo_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      immo_bookings: {
        Row: {
          booking_status: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          check_in: string
          check_out: string
          client_id: string
          completed_at: string | null
          created_at: string | null
          guests: number
          host_id: string
          id: string
          listing_id: string
          offer_id: string | null
          payment_status: string | null
          platform_commission: number | null
          response_id: string | null
          total_price: number
          updated_at: string | null
        }
        Insert: {
          booking_status?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in: string
          check_out: string
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          guests?: number
          host_id: string
          id?: string
          listing_id: string
          offer_id?: string | null
          payment_status?: string | null
          platform_commission?: number | null
          response_id?: string | null
          total_price: number
          updated_at?: string | null
        }
        Update: {
          booking_status?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in?: string
          check_out?: string
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          guests?: number
          host_id?: string
          id?: string
          listing_id?: string
          offer_id?: string | null
          payment_status?: string | null
          platform_commission?: number | null
          response_id?: string | null
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "immo_bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "immo_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immo_bookings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "immo_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immo_bookings_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "immo_offer_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      immo_listings: {
        Row: {
          address: string
          amenities: string[] | null
          bathrooms: number | null
          bedrooms: number | null
          cancellation_policy: string | null
          check_in_time: string | null
          check_out_time: string | null
          city: string
          country: string
          created_at: string | null
          description: string | null
          host_id: string
          id: string
          images: string[] | null
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          max_guests: number
          price_per_night: number
          property_type: Database["public"]["Enums"]["property_type"]
          rating_avg: number | null
          rating_count: number | null
          rules: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city: string
          country?: string
          created_at?: string | null
          description?: string | null
          host_id: string
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_guests?: number
          price_per_night?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          rating_avg?: number | null
          rating_count?: number | null
          rules?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string
          country?: string
          created_at?: string | null
          description?: string | null
          host_id?: string
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_guests?: number
          price_per_night?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          rating_avg?: number | null
          rating_count?: number | null
          rules?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      immo_messages: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          offer_id: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          offer_id?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          offer_id?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "immo_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "immo_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immo_messages_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "immo_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      immo_offer_responses: {
        Row: {
          created_at: string | null
          host_id: string
          id: string
          listing_id: string
          message: string | null
          offer_id: string
          proposed_price: number
          status: string | null
        }
        Insert: {
          created_at?: string | null
          host_id: string
          id?: string
          listing_id: string
          message?: string | null
          offer_id: string
          proposed_price: number
          status?: string | null
        }
        Update: {
          created_at?: string | null
          host_id?: string
          id?: string
          listing_id?: string
          message?: string | null
          offer_id?: string
          proposed_price?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "immo_offer_responses_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "immo_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immo_offer_responses_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "immo_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      immo_offers: {
        Row: {
          amenities_wanted: string[] | null
          check_in: string
          check_out: string
          city: string
          client_id: string
          country: string
          created_at: string | null
          guests: number
          id: string
          latitude: number | null
          listing_id: string | null
          longitude: number | null
          message: string | null
          property_type_wanted:
            | Database["public"]["Enums"]["property_type"]
            | null
          proposed_budget: number
          radius_km: number | null
          status: Database["public"]["Enums"]["immo_offer_status"] | null
          updated_at: string | null
        }
        Insert: {
          amenities_wanted?: string[] | null
          check_in: string
          check_out: string
          city: string
          client_id: string
          country?: string
          created_at?: string | null
          guests?: number
          id?: string
          latitude?: number | null
          listing_id?: string | null
          longitude?: number | null
          message?: string | null
          property_type_wanted?:
            | Database["public"]["Enums"]["property_type"]
            | null
          proposed_budget: number
          radius_km?: number | null
          status?: Database["public"]["Enums"]["immo_offer_status"] | null
          updated_at?: string | null
        }
        Update: {
          amenities_wanted?: string[] | null
          check_in?: string
          check_out?: string
          city?: string
          client_id?: string
          country?: string
          created_at?: string | null
          guests?: number
          id?: string
          latitude?: number | null
          listing_id?: string | null
          longitude?: number | null
          message?: string | null
          property_type_wanted?:
            | Database["public"]["Enums"]["property_type"]
            | null
          proposed_budget?: number
          radius_km?: number | null
          status?: Database["public"]["Enums"]["immo_offer_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "immo_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "immo_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      immo_reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          listing_id: string | null
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          listing_id?: string | null
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          listing_id?: string | null
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "immo_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "immo_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immo_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "immo_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      immo_transactions: {
        Row: {
          amount: number
          booking_id: string
          commission_amount: number | null
          created_at: string | null
          description: string | null
          id: string
          payee_id: string
          payer_id: string
          status: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          booking_id: string
          commission_amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          payee_id: string
          payer_id: string
          status?: string | null
          transaction_type?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          commission_amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          payee_id?: string
          payer_id?: string
          status?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "immo_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "immo_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_payment_history: {
        Row: {
          amount_paid: number
          created_at: string | null
          id: string
          investment_id: string
          investor_id: string
          payment_status: string
          payment_type: string
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          id?: string
          investment_id: string
          investor_id: string
          payment_status?: string
          payment_type: string
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          id?: string
          investment_id?: string
          investor_id?: string
          payment_status?: string
          payment_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_payment_history_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investment_products"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_products: {
        Row: {
          created_at: string | null
          id: string
          investment_amount: number
          investor_earnings: number | null
          investor_id: string
          investor_share_percentage: number | null
          last_payout_at: string | null
          payout_frequency: string
          product_name: string
          profit_percentage: number | null
          status: string | null
          total_profit: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          investment_amount: number
          investor_earnings?: number | null
          investor_id: string
          investor_share_percentage?: number | null
          last_payout_at?: string | null
          payout_frequency: string
          product_name: string
          profit_percentage?: number | null
          status?: string | null
          total_profit?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          investment_amount?: number
          investor_earnings?: number | null
          investor_id?: string
          investor_share_percentage?: number | null
          last_payout_at?: string | null
          payout_frequency?: string
          product_name?: string
          profit_percentage?: number | null
          status?: string | null
          total_profit?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      investment_sales: {
        Row: {
          created_at: string | null
          id: string
          investment_id: string
          investor_earnings: number
          profit_amount: number
          sale_amount: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          investment_id: string
          investor_earnings: number
          profit_amount: number
          sale_amount: number
        }
        Update: {
          created_at?: string | null
          id?: string
          investment_id?: string
          investor_earnings?: number
          profit_amount?: number
          sale_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "investment_sales_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investment_products"
            referencedColumns: ["id"]
          },
        ]
      }
      job_domains: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          display_order: number | null
          emoji: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          establishment_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          establishment_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          establishment_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_available: boolean
          is_featured: boolean
          name: string
          preparation_time_minutes: number | null
          price: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          name: string
          preparation_time_minutes?: number | null
          price: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          name?: string
          preparation_time_minutes?: number | null
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_agents: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          id: number
          merchant_id: number | null
          name: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: number
          merchant_id?: number | null
          name?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: number
          merchant_id?: number | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_agents_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          active: boolean | null
          balance: number | null
          created_at: string | null
          description: string | null
          id: number
          name: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          balance?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          balance?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          from_user_id: string
          id: string
          read: boolean | null
          to_user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          from_user_id: string
          id?: string
          read?: boolean | null
          to_user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          from_user_id?: string
          id?: string
          read?: boolean | null
          to_user_id?: string
        }
        Relationships: []
      }
      mlm_pack_commissions: {
        Row: {
          amount: number
          beneficiary_id: string
          buyer_id: string
          created_at: string
          id: string
          level: number
          pack_id: string
          percentage: number
          purchase_id: string
        }
        Insert: {
          amount: number
          beneficiary_id: string
          buyer_id: string
          created_at?: string
          id?: string
          level: number
          pack_id: string
          percentage: number
          purchase_id: string
        }
        Update: {
          amount?: number
          beneficiary_id?: string
          buyer_id?: string
          created_at?: string
          id?: string
          level?: number
          pack_id?: string
          percentage?: number
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mlm_pack_commissions_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "mlm_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlm_pack_commissions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "mlm_pack_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      mlm_pack_purchases: {
        Row: {
          benefit_amount: number
          buyer_id: string
          created_at: string
          delivery_address: string | null
          delivery_city: string | null
          delivery_mode: string
          delivery_notes: string | null
          delivery_phone: string | null
          id: string
          pack_id: string
          picked_up_at: string | null
          pickup_code: string | null
          price_paid: number
          relay_point_id: string | null
          status: string
          tracking_code: string | null
        }
        Insert: {
          benefit_amount: number
          buyer_id: string
          created_at?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_mode?: string
          delivery_notes?: string | null
          delivery_phone?: string | null
          id?: string
          pack_id: string
          picked_up_at?: string | null
          pickup_code?: string | null
          price_paid: number
          relay_point_id?: string | null
          status?: string
          tracking_code?: string | null
        }
        Update: {
          benefit_amount?: number
          buyer_id?: string
          created_at?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_mode?: string
          delivery_notes?: string | null
          delivery_phone?: string | null
          id?: string
          pack_id?: string
          picked_up_at?: string | null
          pickup_code?: string | null
          price_paid?: number
          relay_point_id?: string | null
          status?: string
          tracking_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mlm_pack_purchases_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "mlm_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlm_pack_purchases_relay_point_id_fkey"
            columns: ["relay_point_id"]
            isOneToOne: false
            referencedRelation: "delivery_relay_points"
            referencedColumns: ["id"]
          },
        ]
      }
      mlm_packs: {
        Row: {
          base_commission_percentage: number
          benefit_amount: number
          created_at: string
          created_by: string | null
          decay_rate: number
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean
          max_levels: number
          name: string
          partner_image_url: string | null
          partner_logo_url: string | null
          partner_name: string | null
          price: number
          updated_at: string
        }
        Insert: {
          base_commission_percentage?: number
          benefit_amount: number
          created_at?: string
          created_by?: string | null
          decay_rate?: number
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          max_levels?: number
          name: string
          partner_image_url?: string | null
          partner_logo_url?: string | null
          partner_name?: string | null
          price: number
          updated_at?: string
        }
        Update: {
          base_commission_percentage?: number
          benefit_amount?: number
          created_at?: string
          created_by?: string | null
          decay_rate?: number
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          max_levels?: number
          name?: string
          partner_image_url?: string | null
          partner_logo_url?: string | null
          partner_name?: string | null
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      moissonneur_fund: {
        Row: {
          id: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          id?: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          id?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_images: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          id: string
          image_url: string
          mime_type: string | null
          order_id: string
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          image_url: string
          mime_type?: string | null
          order_id: string
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          image_url?: string
          mime_type?: string | null
          order_id?: string
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_images_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_monthly_goals: {
        Row: {
          broker_id: string
          created_at: string | null
          current_value: number | null
          goal_type: string
          id: string
          month: string
          progress_percentage: number | null
          reward_amount: number | null
          reward_claimed: boolean | null
          status: string | null
          target_value: number
          updated_at: string | null
        }
        Insert: {
          broker_id: string
          created_at?: string | null
          current_value?: number | null
          goal_type: string
          id?: string
          month: string
          progress_percentage?: number | null
          reward_amount?: number | null
          reward_claimed?: boolean | null
          status?: string | null
          target_value: number
          updated_at?: string | null
        }
        Update: {
          broker_id?: string
          created_at?: string | null
          current_value?: number | null
          goal_type?: string
          id?: string
          month?: string
          progress_percentage?: number | null
          reward_amount?: number | null
          reward_claimed?: boolean | null
          status?: string | null
          target_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          broker_code: string
          broker_id: string
          city: string | null
          country: string | null
          created_at: string | null
          customer_name: string
          customer_phone: string | null
          geographic_zone: string | null
          id: string
          payment_method_id: string | null
          product_name: string
          profit: number
          purchase_price: number
          quantity: number
          status: Database["public"]["Enums"]["order_status"] | null
          updated_at: string | null
          validated_at: string | null
        }
        Insert: {
          broker_code: string
          broker_id: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          customer_name: string
          customer_phone?: string | null
          geographic_zone?: string | null
          id?: string
          payment_method_id?: string | null
          product_name: string
          profit: number
          purchase_price: number
          quantity: number
          status?: Database["public"]["Enums"]["order_status"] | null
          updated_at?: string | null
          validated_at?: string | null
        }
        Update: {
          broker_code?: string
          broker_id?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          geographic_zone?: string | null
          id?: string
          payment_method_id?: string | null
          product_name?: string
          profit?: number
          purchase_price?: number
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"] | null
          updated_at?: string | null
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_contacts: {
        Row: {
          contact_name: string | null
          contact_number: string
          created_at: string | null
          id: string
          is_active: boolean | null
          payment_method: string
          updated_at: string | null
        }
        Insert: {
          contact_name?: string | null
          contact_number: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_method: string
          updated_at?: string | null
        }
        Update: {
          contact_name?: string | null
          contact_number?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_method?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          error_message: string | null
          external_transaction_id: string | null
          id: string
          order_id: string
          payment_details: Json | null
          payment_method_id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          error_message?: string | null
          external_transaction_id?: string | null
          id?: string
          order_id: string
          payment_details?: Json | null
          payment_method_id: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          error_message?: string | null
          external_transaction_id?: string | null
          id?: string
          order_id?: string
          payment_details?: Json | null
          payment_method_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          description: string | null
          id: string
          module: string
          name: string
        }
        Insert: {
          action: string
          description?: string | null
          id?: string
          module: string
          name: string
        }
        Update: {
          action?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      product_downloads: {
        Row: {
          created_at: string | null
          download_count: number | null
          download_url: string
          downloaded_at: string | null
          id: number
          order_id: number
          product_id: number
        }
        Insert: {
          created_at?: string | null
          download_count?: number | null
          download_url: string
          downloaded_at?: string | null
          id?: number
          order_id: number
          product_id: number
        }
        Update: {
          created_at?: string | null
          download_count?: number | null
          download_url?: string
          downloaded_at?: string | null
          id?: number
          order_id?: number
          product_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_downloads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_downloads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_path: string
          image_url: string
          is_primary: boolean | null
          mime_type: string | null
          product_listing_id: string
          size_bytes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_path: string
          image_url: string
          is_primary?: boolean | null
          mime_type?: string | null
          product_listing_id: string
          size_bytes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_path?: string
          image_url?: string
          is_primary?: boolean | null
          mime_type?: string | null
          product_listing_id?: string
          size_bytes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_listing_id_fkey"
            columns: ["product_listing_id"]
            isOneToOne: false
            referencedRelation: "product_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      product_listings: {
        Row: {
          brand: string
          created_at: string
          id: string
          images: string[] | null
          location: string
          price: number
          product_name: string
          quantity: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand: string
          created_at?: string
          id?: string
          images?: string[] | null
          location: string
          price: number
          product_name: string
          quantity: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          images?: string[] | null
          location?: string
          price?: number
          product_name?: string
          quantity?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_media: {
        Row: {
          created_at: string | null
          file_data: string
          file_name: string
          file_size: number | null
          id: number
          is_primary: boolean | null
          media_type: string
          mime_type: string | null
          product_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_data: string
          file_name: string
          file_size?: number | null
          id?: number
          is_primary?: boolean | null
          media_type: string
          mime_type?: string | null
          product_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_data?: string
          file_name?: string
          file_size?: number | null
          id?: number
          is_primary?: boolean | null
          media_type?: string
          mime_type?: string | null
          product_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reservations: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          product_id: string
          quantity: number | null
          reservation_code: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          product_id: string
          quantity?: number | null
          reservation_code: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          product_id?: string
          quantity?: number | null
          reservation_code?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          binary_parent_id: string | null
          binary_position: string | null
          career_level: Database["public"]["Enums"]["career_level"] | null
          career_level_updated_at: string | null
          created_at: string | null
          full_name: string
          id: string
          id_number: string | null
          id_verified: boolean | null
          phone: string | null
          preferred_currency: string
          referral_code: string
          referred_by: string | null
          updated_at: string | null
        }
        Insert: {
          binary_parent_id?: string | null
          binary_position?: string | null
          career_level?: Database["public"]["Enums"]["career_level"] | null
          career_level_updated_at?: string | null
          created_at?: string | null
          full_name: string
          id: string
          id_number?: string | null
          id_verified?: boolean | null
          phone?: string | null
          preferred_currency?: string
          referral_code: string
          referred_by?: string | null
          updated_at?: string | null
        }
        Update: {
          binary_parent_id?: string | null
          binary_position?: string | null
          career_level?: Database["public"]["Enums"]["career_level"] | null
          career_level_updated_at?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          id_verified?: boolean | null
          phone?: string | null
          preferred_currency?: string
          referral_code?: string
          referred_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_binary_parent_id_fkey"
            columns: ["binary_parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_binary_parent_id_fkey"
            columns: ["binary_parent_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_menu_order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          notes: string | null
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          notes?: string | null
          order_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "qr_menu_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_menu_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "qr_menu_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_menu_orders: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          establishment_id: string
          id: string
          notes: string | null
          status: string
          table_number: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          establishment_id: string
          id?: string
          notes?: string | null
          status?: string
          table_number?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          establishment_id?: string
          id?: string
          notes?: string | null
          status?: string
          table_number?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_menu_orders_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          level: number
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: number
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: number
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      relay_points: {
        Row: {
          address: string
          admin_id: string
          capacity: number
          city: string
          created_at: string
          current_packages_count: number
          email: string | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          opening_hours: Json | null
          phone: string | null
          postal_code: string | null
          relay_type: string
          updated_at: string
        }
        Insert: {
          address: string
          admin_id: string
          capacity?: number
          city: string
          created_at?: string
          current_packages_count?: number
          email?: string | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          opening_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          relay_type?: string
          updated_at?: string
        }
        Update: {
          address?: string
          admin_id?: string
          capacity?: number
          city?: string
          created_at?: string
          current_packages_count?: number
          email?: string | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          relay_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_method: string | null
          savings_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_method?: string | null
          savings_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_method?: string | null
          savings_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_payments_savings_id_fkey"
            columns: ["savings_id"]
            isOneToOne: false
            referencedRelation: "savings_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_purchases: {
        Row: {
          amount_saved: number | null
          created_at: string | null
          id: string
          partner_id: string | null
          penalty_rate: number | null
          product_image: string | null
          product_name: string
          qr_code_url: string | null
          status: string | null
          total_price: number
          updated_at: string | null
          user_id: string
          withdrawal_code: string | null
          withdrawn_at: string | null
        }
        Insert: {
          amount_saved?: number | null
          created_at?: string | null
          id?: string
          partner_id?: string | null
          penalty_rate?: number | null
          product_image?: string | null
          product_name: string
          qr_code_url?: string | null
          status?: string | null
          total_price: number
          updated_at?: string | null
          user_id: string
          withdrawal_code?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          amount_saved?: number | null
          created_at?: string | null
          id?: string
          partner_id?: string | null
          penalty_rate?: number | null
          product_image?: string | null
          product_name?: string
          qr_code_url?: string | null
          status?: string | null
          total_price?: number
          updated_at?: string | null
          user_id?: string
          withdrawal_code?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_purchases_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          buyer_id: string | null
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string | null
          crypto_address: string | null
          id: number
          order_status: string | null
          payment_mode: string | null
          product_id: number | null
          quantity: number | null
          shop_id: number | null
          total_amount: number
          tx_hash: string | null
        }
        Insert: {
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string | null
          crypto_address?: string | null
          id?: number
          order_status?: string | null
          payment_mode?: string | null
          product_id?: number | null
          quantity?: number | null
          shop_id?: number | null
          total_amount?: number
          tx_hash?: string | null
        }
        Update: {
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string | null
          crypto_address?: string | null
          id?: number
          order_status?: string | null
          payment_mode?: string | null
          product_id?: number | null
          quantity?: number | null
          shop_id?: number | null
          total_amount?: number
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          categories: string | null
          created_at: string | null
          description: string | null
          file_url: string | null
          id: number
          image_url: string | null
          is_active: boolean | null
          is_approved: boolean | null
          is_featured: boolean | null
          payment_link: string | null
          price: number
          product_name: string
          product_type: string | null
          shop_id: number | null
          stock: number | null
          virtual_product_expiry: number | null
        }
        Insert: {
          categories?: string | null
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          payment_link?: string | null
          price: number
          product_name: string
          product_type?: string | null
          shop_id?: number | null
          stock?: number | null
          virtual_product_expiry?: number | null
        }
        Update: {
          categories?: string | null
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          payment_link?: string | null
          price?: number
          product_name?: string
          product_type?: string | null
          shop_id?: number | null
          stock?: number | null
          virtual_product_expiry?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_qr_codes: {
        Row: {
          created_at: string | null
          id: number
          qr_url: string
          shop_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          qr_url: string
          shop_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          qr_url?: string
          shop_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_qr_codes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          active: boolean | null
          background_theme: string | null
          banner_url: string | null
          created_at: string | null
          description: string | null
          id: number
          logo_url: string | null
          shop_name: string
          shop_url_slug: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          background_theme?: string | null
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          logo_url?: string | null
          shop_name: string
          shop_url_slug?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          background_theme?: string | null
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          logo_url?: string | null
          shop_name?: string
          shop_url_slug?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ticket_purchases: {
        Row: {
          buyer_email: string | null
          buyer_name: string
          buyer_phone: string | null
          checked_in: boolean | null
          checked_in_at: string | null
          created_at: string | null
          event_id: string
          id: string
          payment_method: string | null
          payment_status: string | null
          quantity: number | null
          ticket_code: string | null
          ticket_type_id: string
          total_amount: number
          user_id: string | null
        }
        Insert: {
          buyer_email?: string | null
          buyer_name: string
          buyer_phone?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          quantity?: number | null
          ticket_code?: string | null
          ticket_type_id: string
          total_amount: number
          user_id?: string | null
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          quantity?: number | null
          ticket_code?: string | null
          ticket_type_id?: string
          total_amount?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_purchases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_purchases_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          benefits: string[] | null
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          name: string
          payment_link: string | null
          price: number
          quantity_available: number
          quantity_sold: number | null
          tier: string | null
        }
        Insert: {
          benefits?: string[] | null
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          name: string
          payment_link?: string | null
          price?: number
          quantity_available?: number
          quantity_sold?: number | null
          tier?: string | null
        }
        Update: {
          benefits?: string[] | null
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          payment_link?: string | null
          price?: number
          quantity_available?: number
          quantity_sold?: number | null
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tontine_drawings: {
        Row: {
          amount_won: number
          cycle_number: number
          drawn_at: string | null
          id: string
          tontine_id: string
          winner_id: string
        }
        Insert: {
          amount_won: number
          cycle_number: number
          drawn_at?: string | null
          id?: string
          tontine_id: string
          winner_id: string
        }
        Update: {
          amount_won?: number
          cycle_number?: number
          drawn_at?: string | null
          id?: string
          tontine_id?: string
          winner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tontine_drawings_tontine_id_fkey"
            columns: ["tontine_id"]
            isOneToOne: false
            referencedRelation: "tontines"
            referencedColumns: ["id"]
          },
        ]
      }
      tontine_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          tontine_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          tontine_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          tontine_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tontine_messages_tontine_id_fkey"
            columns: ["tontine_id"]
            isOneToOne: false
            referencedRelation: "tontines"
            referencedColumns: ["id"]
          },
        ]
      }
      tontine_participants: {
        Row: {
          has_received: boolean | null
          id: string
          is_paid_current_cycle: boolean | null
          joined_at: string | null
          received_at: string | null
          tontine_id: string
          user_id: string
        }
        Insert: {
          has_received?: boolean | null
          id?: string
          is_paid_current_cycle?: boolean | null
          joined_at?: string | null
          received_at?: string | null
          tontine_id: string
          user_id: string
        }
        Update: {
          has_received?: boolean | null
          id?: string
          is_paid_current_cycle?: boolean | null
          joined_at?: string | null
          received_at?: string | null
          tontine_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tontine_participants_tontine_id_fkey"
            columns: ["tontine_id"]
            isOneToOne: false
            referencedRelation: "tontines"
            referencedColumns: ["id"]
          },
        ]
      }
      tontine_payment_schedule: {
        Row: {
          amount: number
          created_at: string | null
          cycle_number: number
          due_date: string
          id: string
          reminder_sent: boolean | null
          status: string | null
          tontine_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          cycle_number: number
          due_date: string
          id?: string
          reminder_sent?: boolean | null
          status?: string | null
          tontine_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          cycle_number?: number
          due_date?: string
          id?: string
          reminder_sent?: boolean | null
          status?: string | null
          tontine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tontine_payment_schedule_tontine_id_fkey"
            columns: ["tontine_id"]
            isOneToOne: false
            referencedRelation: "tontines"
            referencedColumns: ["id"]
          },
        ]
      }
      tontine_payments: {
        Row: {
          amount: number
          created_at: string | null
          cycle_number: number
          id: string
          payment_contact: string | null
          payment_method: string | null
          status: string | null
          tontine_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          cycle_number: number
          id?: string
          payment_contact?: string | null
          payment_method?: string | null
          status?: string | null
          tontine_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          cycle_number?: number
          id?: string
          payment_contact?: string | null
          payment_method?: string | null
          status?: string | null
          tontine_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tontine_payments_tontine_id_fkey"
            columns: ["tontine_id"]
            isOneToOne: false
            referencedRelation: "tontines"
            referencedColumns: ["id"]
          },
        ]
      }
      tontines: {
        Row: {
          amount: number
          created_at: string | null
          creator_id: string
          current_cycle: number | null
          frequency: string
          id: string
          max_participants: number
          name: string
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator_id: string
          current_cycle?: number | null
          frequency: string
          id?: string
          max_participants: number
          name: string
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator_id?: string
          current_cycle?: number | null
          frequency?: string
          id?: string
          max_participants?: number
          name?: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transport_driver_locations: {
        Row: {
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string | null
          ride_id: string | null
          speed: number | null
        }
        Insert: {
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string | null
          ride_id?: string | null
          speed?: number | null
        }
        Update: {
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string | null
          ride_id?: string | null
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "transport_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_driver_locations_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "transport_rides"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_drivers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          full_name: string
          id: string
          identity_document_url: string | null
          identity_number: string
          is_approved: boolean | null
          last_location_update: string | null
          license_document_url: string | null
          license_expiry: string | null
          license_number: string
          notes: string | null
          phone: string
          photo_url: string | null
          rating: number | null
          status: Database["public"]["Enums"]["driver_status"] | null
          total_earnings: number | null
          total_rides: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          full_name: string
          id?: string
          identity_document_url?: string | null
          identity_number: string
          is_approved?: boolean | null
          last_location_update?: string | null
          license_document_url?: string | null
          license_expiry?: string | null
          license_number: string
          notes?: string | null
          phone: string
          photo_url?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          total_earnings?: number | null
          total_rides?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          full_name?: string
          id?: string
          identity_document_url?: string | null
          identity_number?: string
          is_approved?: boolean | null
          last_location_update?: string | null
          license_document_url?: string | null
          license_expiry?: string | null
          license_number?: string
          notes?: string | null
          phone?: string
          photo_url?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          total_earnings?: number | null
          total_rides?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transport_pricing: {
        Row: {
          base_fare: number
          created_at: string | null
          holiday_multiplier: number | null
          id: string
          is_active: boolean | null
          is_strike_active: boolean | null
          min_fare: number
          night_end_hour: number | null
          night_multiplier: number | null
          night_start_hour: number | null
          peak_end_hour: number | null
          peak_evening_end: number | null
          peak_evening_start: number | null
          peak_hour_multiplier: number | null
          peak_start_hour: number | null
          price_per_km: number
          price_per_minute: number
          service_class: Database["public"]["Enums"]["service_class"]
          strike_multiplier: number | null
          updated_at: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          weekend_multiplier: number | null
        }
        Insert: {
          base_fare?: number
          created_at?: string | null
          holiday_multiplier?: number | null
          id?: string
          is_active?: boolean | null
          is_strike_active?: boolean | null
          min_fare?: number
          night_end_hour?: number | null
          night_multiplier?: number | null
          night_start_hour?: number | null
          peak_end_hour?: number | null
          peak_evening_end?: number | null
          peak_evening_start?: number | null
          peak_hour_multiplier?: number | null
          peak_start_hour?: number | null
          price_per_km?: number
          price_per_minute?: number
          service_class: Database["public"]["Enums"]["service_class"]
          strike_multiplier?: number | null
          updated_at?: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          weekend_multiplier?: number | null
        }
        Update: {
          base_fare?: number
          created_at?: string | null
          holiday_multiplier?: number | null
          id?: string
          is_active?: boolean | null
          is_strike_active?: boolean | null
          min_fare?: number
          night_end_hour?: number | null
          night_multiplier?: number | null
          night_start_hour?: number | null
          peak_end_hour?: number | null
          peak_evening_end?: number | null
          peak_evening_start?: number | null
          peak_hour_multiplier?: number | null
          peak_start_hour?: number | null
          price_per_km?: number
          price_per_minute?: number
          service_class?: Database["public"]["Enums"]["service_class"]
          strike_multiplier?: number | null
          updated_at?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          weekend_multiplier?: number | null
        }
        Relationships: []
      }
      transport_ride_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          ride_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          ride_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          ride_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_ride_messages_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "transport_rides"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_rides: {
        Row: {
          accepted_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string | null
          distance_km: number | null
          driver_arrived_at: string | null
          driver_id: string | null
          driver_rating: number | null
          driver_review: string | null
          dropoff_address: string
          dropoff_latitude: number
          dropoff_longitude: number
          duration_minutes: number | null
          estimated_fare: number | null
          fare_breakdown: Json | null
          fare_multiplier: number | null
          final_fare: number | null
          id: string
          msn_channel_id: string | null
          payment_method: string | null
          payment_status: string | null
          pickup_address: string
          pickup_latitude: number
          pickup_longitude: number
          rider_id: string
          rider_rating: number | null
          rider_review: string | null
          service_class: Database["public"]["Enums"]["service_class"] | null
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"] | null
          updated_at: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          accepted_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          distance_km?: number | null
          driver_arrived_at?: string | null
          driver_id?: string | null
          driver_rating?: number | null
          driver_review?: string | null
          dropoff_address: string
          dropoff_latitude: number
          dropoff_longitude: number
          duration_minutes?: number | null
          estimated_fare?: number | null
          fare_breakdown?: Json | null
          fare_multiplier?: number | null
          final_fare?: number | null
          id?: string
          msn_channel_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_address: string
          pickup_latitude: number
          pickup_longitude: number
          rider_id: string
          rider_rating?: number | null
          rider_review?: string | null
          service_class?: Database["public"]["Enums"]["service_class"] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ride_status"] | null
          updated_at?: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          accepted_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          distance_km?: number | null
          driver_arrived_at?: string | null
          driver_id?: string | null
          driver_rating?: number | null
          driver_review?: string | null
          dropoff_address?: string
          dropoff_latitude?: number
          dropoff_longitude?: number
          duration_minutes?: number | null
          estimated_fare?: number | null
          fare_breakdown?: Json | null
          fare_multiplier?: number | null
          final_fare?: number | null
          id?: string
          msn_channel_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_address?: string
          pickup_latitude?: number
          pickup_longitude?: number
          rider_id?: string
          rider_rating?: number | null
          rider_review?: string | null
          service_class?: Database["public"]["Enums"]["service_class"] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ride_status"] | null
          updated_at?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transport_rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "transport_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transport_vehicles: {
        Row: {
          brand: string
          color: string | null
          created_at: string | null
          driver_id: string
          id: string
          insurance_expiry: string | null
          insurance_number: string | null
          is_active: boolean | null
          model: string
          plate_number: string
          service_class: Database["public"]["Enums"]["service_class"] | null
          updated_at: string | null
          vehicle_photo_url: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          year: number | null
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string | null
          driver_id: string
          id?: string
          insurance_expiry?: string | null
          insurance_number?: string | null
          is_active?: boolean | null
          model: string
          plate_number: string
          service_class?: Database["public"]["Enums"]["service_class"] | null
          updated_at?: string | null
          vehicle_photo_url?: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          year?: number | null
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string | null
          driver_id?: string
          id?: string
          insurance_expiry?: string | null
          insurance_number?: string | null
          is_active?: boolean | null
          model?: string
          plate_number?: string
          service_class?: Database["public"]["Enums"]["service_class"] | null
          updated_at?: string | null
          vehicle_photo_url?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "transport_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury: {
        Row: {
          amount: number | null
          id: number
          last_updated: string | null
          name: string | null
        }
        Insert: {
          amount?: number | null
          id?: number
          last_updated?: string | null
          name?: string | null
        }
        Update: {
          amount?: number | null
          id?: number
          last_updated?: string | null
          name?: string | null
        }
        Relationships: []
      }
      treasury_withdrawals: {
        Row: {
          admin_id: string | null
          amount: number | null
          created_at: string | null
          details: string | null
          id: number
          reason: string | null
        }
        Insert: {
          admin_id?: string | null
          amount?: number | null
          created_at?: string | null
          details?: string | null
          id?: number
          reason?: string | null
        }
        Update: {
          admin_id?: string | null
          amount?: number | null
          created_at?: string | null
          details?: string | null
          id?: number
          reason?: string | null
        }
        Relationships: []
      }
      user_credit_profiles: {
        Row: {
          active_credits: number | null
          blocked_reason: string | null
          completed_credits: number | null
          created_at: string | null
          credit_score: number | null
          defaulted_credits: number | null
          id: string
          is_blocked: boolean | null
          total_credits: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active_credits?: number | null
          blocked_reason?: string | null
          completed_credits?: number | null
          created_at?: string | null
          credit_score?: number | null
          defaulted_credits?: number | null
          id?: string
          is_blocked?: boolean | null
          total_credits?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_credits?: number | null
          blocked_reason?: string | null
          completed_credits?: number | null
          created_at?: string | null
          credit_score?: number | null
          defaulted_credits?: number | null
          id?: string
          is_blocked?: boolean | null
          total_credits?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_earned_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          reward_claimed: boolean | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          reward_claimed?: boolean | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          reward_claimed?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_earned_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "achievement_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_employment: {
        Row: {
          bio: string | null
          created_at: string
          domain_id: string
          id: string
          is_primary: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          domain_id: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          domain_id?: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_employment_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "employment_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      user_job_profiles: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          job_domain_id: string
          selected_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          job_domain_id: string
          selected_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          job_domain_id?: string
          selected_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_job_profiles_job_domain_id_fkey"
            columns: ["job_domain_id"]
            isOneToOne: false
            referencedRelation: "job_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          accuracy: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          latitude: number
          longitude: number
          shared_with_user_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude: number
          longitude: number
          shared_with_user_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number
          longitude?: number
          shared_with_user_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_qr_codes: {
        Row: {
          created_at: string | null
          id: string
          qr_code_data: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          qr_code_data: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          qr_code_data?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          access_level: number | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          access_level?: number | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          access_level?: number | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          created_at: string | null
          id: string
          path: string
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          path: string
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          from_user_id: string | null
          id: string
          payment_contact: string | null
          payment_method: string | null
          status: string | null
          to_user_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          from_user_id?: string | null
          id?: string
          payment_contact?: string | null
          payment_method?: string | null
          status?: string | null
          to_user_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          from_user_id?: string | null
          id?: string
          payment_contact?: string | null
          payment_method?: string | null
          status?: string | null
          to_user_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_codes: {
        Row: {
          code: string
          created_at: string
          delivery_id: string
          expires_at: string
          id: string
          is_used: boolean
          used_at: string | null
          used_by: string | null
          verification_attempts: number
        }
        Insert: {
          code: string
          created_at?: string
          delivery_id: string
          expires_at?: string
          id?: string
          is_used?: boolean
          used_at?: string | null
          used_by?: string | null
          verification_attempts?: number
        }
        Update: {
          code?: string
          created_at?: string
          delivery_id?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          used_at?: string | null
          used_by?: string | null
          verification_attempts?: number
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_codes_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_partners: {
        Row: {
          address: string
          city: string
          commission_rate: number | null
          company_name: string
          contact_name: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          phone: string
          region: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address: string
          city: string
          commission_rate?: number | null
          company_name: string
          contact_name: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          phone: string
          region: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string
          city?: string
          commission_rate?: number | null
          company_name?: string
          contact_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string
          region?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      agent_leaderboard: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          current_tier: string | null
          deposit_count: number | null
          rank_by_commissions: number | null
          rank_by_transactions: number | null
          rank_by_volume: number | null
          total_commissions: number | null
          total_transactions: number | null
          total_volume: number | null
          withdrawal_count: number | null
        }
        Relationships: []
      }
      agent_monthly_commission_report: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          avg_commission_rate: number | null
          current_tier: string | null
          deposit_count: number | null
          report_month: string | null
          tier_level: number | null
          total_commission: number | null
          total_transactions: number | null
          total_volume: number | null
          withdrawal_count: number | null
        }
        Relationships: []
      }
      agent_performance_comparison: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          avg_transaction_amount: number | null
          monthly_commissions: number | null
          monthly_deposits: number | null
          monthly_transactions: number | null
          monthly_volume: number | null
          monthly_withdrawals: number | null
          performance_month: string | null
        }
        Relationships: []
      }
      crypto_payment_settings_public: {
        Row: {
          api_endpoint: string | null
          created_at: string | null
          id: number | null
          is_active: boolean | null
          provider: string | null
        }
        Insert: {
          api_endpoint?: string | null
          created_at?: string | null
          id?: number | null
          is_active?: boolean | null
          provider?: string | null
        }
        Update: {
          api_endpoint?: string | null
          created_at?: string | null
          id?: number | null
          is_active?: boolean | null
          provider?: string | null
        }
        Relationships: []
      }
      delivery_providers_public: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
        }
        Relationships: []
      }
      users_with_roles: {
        Row: {
          career_level: Database["public"]["Enums"]["career_level"] | null
          created_at: string | null
          full_name: string | null
          id: string | null
          max_access_level: number | null
          phone: string | null
          referral_code: string | null
          roles: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_user_account: { Args: { p_user_id: string }; Returns: undefined }
      auto_update_career_level: { Args: never; Returns: undefined }
      award_monthly_bonus: { Args: never; Returns: undefined }
      calculate_career_level: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["career_level"]
      }
      calculate_investment_earnings: {
        Args: {
          p_investor_share_percentage: number
          p_profit_percentage: number
          p_sale_amount: number
        }
        Returns: number
      }
      can_view_order: {
        Args: { _order_city: string; _order_country: string; _user_id: string }
        Returns: boolean
      }
      check_and_award_achievement_badges: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_and_award_badges: {
        Args: { p_agent_id: string }
        Returns: undefined
      }
      convert_shop_to_relay: {
        Args: { p_host_type?: string; p_shop_id: string }
        Returns: string
      }
      debit_wallet_for_payment: {
        Args: {
          p_amount: number
          p_order_id: string
          p_product_name: string
          p_user_id: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      decrement_wallet_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      delete_user_account: { Args: { p_user_id: string }; Returns: undefined }
      detect_inactive_agents: { Args: never; Returns: undefined }
      ensure_super_admin: { Args: never; Returns: undefined }
      generate_appointment_code: { Args: never; Returns: string }
      generate_delivery_code: { Args: never; Returns: string }
      generate_pickup_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      generate_reservation_code: { Args: never; Returns: string }
      generate_tracking_code: { Args: never; Returns: string }
      generate_withdrawal_code: { Args: never; Returns: string }
      get_agent_tier: {
        Args: { p_agent_id: string }
        Returns: {
          badge_color: string
          commission_rate: number
          tier_level: number
          tier_name: string
        }[]
      }
      get_all_users_admin: {
        Args: never
        Returns: {
          banned_until: string
          confirmed_at: string
          created_at: string
          email: string
          full_name: string
          id: string
          max_access_level: number
          phone: string
          referral_code: string
          roles: Json
        }[]
      }
      get_available_delivery_packages: {
        Args: never
        Returns: {
          approximate_latitude: number
          approximate_longitude: number
          created_at: string
          customer_city: string
          delivery_commission: number
          id: string
        }[]
      }
      get_role_access_level: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: number
      }
      get_role_permissions: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: {
          action: string
          description: string
          module: string
          name: string
        }[]
      }
      get_super_admin_info: {
        Args: never
        Returns: {
          access_level: number
          email: string
          full_name: string
          phone: string
          referral_code: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      get_user_admin_details: {
        Args: { _user_id: string }
        Returns: {
          banned_until: string
          confirmed_at: string
          created_at: string
          email: string
          full_name: string
          id: string
          max_access_level: number
          phone: string
          referral_code: string
          roles: Json
        }[]
      }
      get_user_max_access_level: { Args: { _user_id: string }; Returns: number }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          action: string
          description: string
          module: string
          name: string
        }[]
      }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_access_level: {
        Args: { _min_level: number; _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_wallet_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      initialize_agent_monthly_goals: { Args: never; Returns: undefined }
      initialize_order_monthly_goals: { Args: never; Returns: undefined }
      is_super_admin: { Args: never; Returns: boolean }
      is_tontine_participant: {
        Args: { _tontine_id: string; _user_id?: string }
        Returns: boolean
      }
      is_user_admin: { Args: { _user_id: string }; Returns: boolean }
      purchase_mlm_pack:
        | {
            Args: { p_pack_id: string }
            Returns: {
              message: string
              purchase_id: string
              success: boolean
            }[]
          }
        | {
            Args: {
              p_delivery_address?: string
              p_delivery_city?: string
              p_delivery_notes?: string
              p_delivery_phone?: string
              p_pack_id: string
            }
            Returns: {
              message: string
              purchase_id: string
              success: boolean
            }[]
          }
        | {
            Args: {
              p_delivery_address?: string
              p_delivery_city?: string
              p_delivery_mode?: string
              p_delivery_notes?: string
              p_delivery_phone?: string
              p_pack_id: string
              p_relay_point_id?: string
            }
            Returns: {
              message: string
              pickup_code: string
              purchase_id: string
              success: boolean
            }[]
          }
      refund_wallet_payment: {
        Args: {
          p_amount: number
          p_order_id: string
          p_reason?: string
          p_user_id: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      reject_order_with_refund: {
        Args: { p_order_id: string; p_rejection_reason?: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      route_call_to_agent: { Args: { p_queue_id: string }; Returns: string }
      run_monthly_bonus_awards: { Args: never; Returns: undefined }
      suspend_user_account: {
        Args: { p_days?: number; p_user_id: string }
        Returns: undefined
      }
      update_agent_goals_progress: { Args: never; Returns: undefined }
      update_all_career_levels: { Args: never; Returns: undefined }
      update_order_goals_progress: { Args: never; Returns: undefined }
      update_user_career_level: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      verify_function_security: {
        Args: never
        Returns: {
          function_name: string
          has_search_path: boolean
          is_security_definer: boolean
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "financier"
        | "merchant"
        | "agent"
        | "country_representative"
        | "city_representative"
        | "driver"
        | "moissonneur"
        | "broker"
        | "shop_manager"
        | "relay_agent"
        | "developer"
        | "operational_admin"
        | "financial_manager"
        | "tontine_manager"
      assignment_status:
        | "pending"
        | "accepted"
        | "in_progress"
        | "completed"
        | "failed"
        | "rejected"
      career_level:
        | "novice"
        | "actif"
        | "zonal"
        | "principal"
        | "gouverneur"
        | "comte"
        | "general"
        | "royal_8"
        | "royal_9"
        | "guide"
        | "semeur"
        | "cultivateur"
        | "recolteur"
        | "gestionnaire"
        | "superviseur"
        | "coordinateur"
        | "directeur"
        | "ambassadeur"
      delivery_status:
        | "pending"
        | "available"
        | "assigned"
        | "in_progress"
        | "completed"
        | "failed"
        | "cancelled"
      driver_status: "available" | "busy" | "offline" | "suspended"
      immo_offer_status:
        | "pending"
        | "accepted"
        | "refused"
        | "expired"
        | "cancelled"
        | "confirmed"
        | "completed"
      order_status:
        | "pending"
        | "validated"
        | "rejected"
        | "completed"
        | "pending_admin_review"
      property_type:
        | "apartment"
        | "studio"
        | "room"
        | "hotel"
        | "villa"
        | "house"
        | "residence"
      ride_status:
        | "pending"
        | "accepted"
        | "driver_arriving"
        | "in_progress"
        | "completed"
        | "cancelled"
      service_class: "standard" | "vip" | "vvip"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "transfer"
        | "commission"
        | "order_profit"
        | "order_payment"
        | "pack_purchase"
        | "badge_reward"
      vehicle_type: "moto" | "vehicule" | "mini_remorque" | "remorque"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "financier",
        "merchant",
        "agent",
        "country_representative",
        "city_representative",
        "driver",
        "moissonneur",
        "broker",
        "shop_manager",
        "relay_agent",
        "developer",
        "operational_admin",
        "financial_manager",
        "tontine_manager",
      ],
      assignment_status: [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "failed",
        "rejected",
      ],
      career_level: [
        "novice",
        "actif",
        "zonal",
        "principal",
        "gouverneur",
        "comte",
        "general",
        "royal_8",
        "royal_9",
        "guide",
        "semeur",
        "cultivateur",
        "recolteur",
        "gestionnaire",
        "superviseur",
        "coordinateur",
        "directeur",
        "ambassadeur",
      ],
      delivery_status: [
        "pending",
        "available",
        "assigned",
        "in_progress",
        "completed",
        "failed",
        "cancelled",
      ],
      driver_status: ["available", "busy", "offline", "suspended"],
      immo_offer_status: [
        "pending",
        "accepted",
        "refused",
        "expired",
        "cancelled",
        "confirmed",
        "completed",
      ],
      order_status: [
        "pending",
        "validated",
        "rejected",
        "completed",
        "pending_admin_review",
      ],
      property_type: [
        "apartment",
        "studio",
        "room",
        "hotel",
        "villa",
        "house",
        "residence",
      ],
      ride_status: [
        "pending",
        "accepted",
        "driver_arriving",
        "in_progress",
        "completed",
        "cancelled",
      ],
      service_class: ["standard", "vip", "vvip"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "transfer",
        "commission",
        "order_profit",
        "order_payment",
        "pack_purchase",
        "badge_reward",
      ],
      vehicle_type: ["moto", "vehicule", "mini_remorque", "remorque"],
    },
  },
} as const
