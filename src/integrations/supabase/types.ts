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
          provider: string
        }
        Insert: {
          api_endpoint: string
          api_key?: string | null
          created_at?: string | null
          id?: number
          provider: string
        }
        Update: {
          api_endpoint?: string
          api_key?: string | null
          created_at?: string | null
          id?: number
          provider?: string
        }
        Relationships: []
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
      merchant_agents: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          id: number
          merchant_id: number | null
          name: string | null
          password_hash: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: number
          merchant_id?: number | null
          name?: string | null
          password_hash?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: number
          merchant_id?: number | null
          name?: string | null
          password_hash?: string | null
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
          message: string
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          product_name?: string
          profit?: number
          purchase_price?: number
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"] | null
          updated_at?: string | null
          validated_at?: string | null
        }
        Relationships: []
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
          created_at: string | null
          description: string | null
          file_url: string | null
          id: number
          image_url: string | null
          is_active: boolean | null
          is_approved: boolean | null
          price: number
          product_name: string
          product_type: string | null
          shop_id: number | null
          stock: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          price: number
          product_name: string
          product_type?: string | null
          shop_id?: number | null
          stock?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          price?: number
          product_name?: string
          product_type?: string | null
          shop_id?: number | null
          stock?: number | null
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
      decrement_wallet_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      delete_user_account: { Args: { p_user_id: string }; Returns: undefined }
      ensure_super_admin: { Args: never; Returns: undefined }
      generate_referral_code: { Args: never; Returns: string }
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
      run_monthly_bonus_awards: { Args: never; Returns: undefined }
      suspend_user_account: {
        Args: { p_days?: number; p_user_id: string }
        Returns: undefined
      }
      update_agent_goals_progress: { Args: never; Returns: undefined }
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
      order_status: "pending" | "validated" | "rejected" | "completed"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "transfer"
        | "commission"
        | "order_profit"
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
      ],
      order_status: ["pending", "validated", "rejected", "completed"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "transfer",
        "commission",
        "order_profit",
      ],
    },
  },
} as const
