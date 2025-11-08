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
      orders: {
        Row: {
          broker_code: string
          broker_id: string
          created_at: string | null
          customer_name: string
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
          created_at?: string | null
          customer_name: string
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
          created_at?: string | null
          customer_name?: string
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
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      [_ in never]: never
    }
    Functions: {
      auto_update_career_level: { Args: never; Returns: undefined }
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
      decrement_wallet_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
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
      update_user_career_level: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "financier"
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
      app_role: ["admin", "moderator", "user", "financier"],
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
