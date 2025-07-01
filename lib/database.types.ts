export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chat_messages: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          session_id: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          session_id: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          session_id?: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          issue_description: string
          recommendation: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          issue_description: string
          recommendation?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          issue_description?: string
          recommendation?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      dtc_codes: {
        Row: {
          cleared_at: string | null
          code: string
          created_at: string
          description: string
          id: string
          session_id: string
          severity: Database["public"]["Enums"]["severity_level"]
        }
        Insert: {
          cleared_at?: string | null
          code: string
          created_at?: string
          description: string
          id?: string
          session_id: string
          severity?: Database["public"]["Enums"]["severity_level"]
        }
        Update: {
          cleared_at?: string | null
          code?: string
          created_at?: string
          description?: string
          id?: string
          session_id?: string
          severity?: Database["public"]["Enums"]["severity_level"]
        }
        Relationships: [
          {
            foreignKeyName: "dtc_codes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      obd_data: {
        Row: {
          coolant_temp: number | null
          engine_load: number | null
          fuel_pressure: number | null
          id: string
          recorded_at: string
          rpm: number | null
          session_id: string
          speed: number | null
          voltage: number | null
        }
        Insert: {
          coolant_temp?: number | null
          engine_load?: number | null
          fuel_pressure?: number | null
          id?: string
          recorded_at?: string
          rpm?: number | null
          session_id: string
          speed?: number | null
          voltage?: number | null
        }
        Update: {
          coolant_temp?: number | null
          engine_load?: number | null
          fuel_pressure?: number | null
          id?: string
          recorded_at?: string
          rpm?: number | null
          session_id?: string
          speed?: number | null
          voltage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obd_data_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          id: string
          license_plate: string | null
          make: string
          model: string
          updated_at: string
          user_id: string
          vin: string | null
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          license_plate?: string | null
          make: string
          model: string
          updated_at?: string
          user_id: string
          vin?: string | null
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          license_plate?: string | null
          make?: string
          model?: string
          updated_at?: string
          user_id?: string
          vin?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      message_type: "user" | "ai" | "system"
      session_status: "pending" | "in-progress" | "resolved"
      severity_level: "low" | "medium" | "high"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never