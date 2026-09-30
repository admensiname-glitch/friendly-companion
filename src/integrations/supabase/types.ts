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
      courses: {
        Row: {
          created_at: string
          id: string
          name: string
          published: boolean
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          published?: boolean
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          published?: boolean
          slug?: string
        }
        Relationships: []
      }
      discipline_aliases: {
        Row: {
          alias: string
          created_at: string
          discipline_id: string
          id: string
          normalized_alias: string
        }
        Insert: {
          alias: string
          created_at?: string
          discipline_id: string
          id?: string
          normalized_alias: string
        }
        Update: {
          alias?: string
          created_at?: string
          discipline_id?: string
          id?: string
          normalized_alias?: string
        }
        Relationships: [
          {
            foreignKeyName: "discipline_aliases_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplines: {
        Row: {
          code: string | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          published: boolean
          updated_at: string
        }
        Insert: {
          code?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          published?: boolean
          updated_at?: string
        }
        Update: {
          code?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          published?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplines_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_attempts: {
        Row: {
          answered_questions: number
          completed_at: string | null
          correct_answers: number
          created_at: string
          exercise_id: string
          id: string
          score: number | null
          started_at: string
          status: string
          topic_id: string
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answered_questions?: number
          completed_at?: string | null
          correct_answers?: number
          created_at?: string
          exercise_id: string
          id?: string
          score?: number | null
          started_at?: string
          status?: string
          topic_id: string
          total_questions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answered_questions?: number
          completed_at?: string | null
          correct_answers?: number
          created_at?: string
          exercise_id?: string
          id?: string
          score?: number | null
          started_at?: string
          status?: string
          topic_id?: string
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_answers: {
        Row: {
          answered_at: string
          evaluation_attempt_id: string | null
          feedback: string | null
          id: string
          is_correct: boolean | null
          open_text: string | null
          question_id: string
          selected_option_id: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          evaluation_attempt_id?: string | null
          feedback?: string | null
          id?: string
          is_correct?: boolean | null
          open_text?: string | null
          question_id: string
          selected_option_id?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string
          evaluation_attempt_id?: string | null
          feedback?: string | null
          id?: string
          is_correct?: boolean | null
          open_text?: string | null
          question_id?: string
          selected_option_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_answers_evaluation_attempt_id_fkey"
            columns: ["evaluation_attempt_id"]
            isOneToOne: false
            referencedRelation: "evaluation_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exercise_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_options: {
        Row: {
          content: string
          created_at: string
          feedback_correct: string | null
          feedback_incorrect: string | null
          id: string
          is_correct: boolean
          position: number
          question_id: string
        }
        Insert: {
          content: string
          created_at?: string
          feedback_correct?: string | null
          feedback_incorrect?: string | null
          id?: string
          is_correct?: boolean
          position: number
          question_id: string
        }
        Update: {
          content?: string
          created_at?: string
          feedback_correct?: string | null
          feedback_incorrect?: string | null
          id?: string
          is_correct?: boolean
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exercise_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_questions: {
        Row: {
          created_at: string
          difficulty_tag: string[]
          exercise_id: string
          feedback_hint: string | null
          id: string
          position: number
          question_text: string
          question_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          difficulty_tag?: string[]
          exercise_id: string
          feedback_hint?: string | null
          id?: string
          position: number
          question_text: string
          question_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          difficulty_tag?: string[]
          exercise_id?: string
          feedback_hint?: string | null
          id?: string
          position?: number
          question_text?: string
          question_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_questions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          content: string
          created_at: string
          difficulty: string
          exercise_type: string
          id: string
          position: number
          published: boolean
          source_id: string | null
          title: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          difficulty: string
          exercise_type: string
          id?: string
          position: number
          published?: boolean
          source_id?: string | null
          title: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          difficulty?: string
          exercise_type?: string
          id?: string
          position?: number
          published?: boolean
          source_id?: string | null
          title?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          code: string
          id: string
          name: string
          notes: string | null
          permits_commercial: boolean
          permits_derivatives: boolean
          requires_attribution: boolean
          url: string | null
        }
        Insert: {
          code: string
          id?: string
          name: string
          notes?: string | null
          permits_commercial?: boolean
          permits_derivatives?: boolean
          requires_attribution?: boolean
          url?: string | null
        }
        Update: {
          code?: string
          id?: string
          name?: string
          notes?: string | null
          permits_commercial?: boolean
          permits_derivatives?: boolean
          requires_attribution?: boolean
          url?: string | null
        }
        Relationships: []
      }
      material_citations: {
        Row: {
          citation_label: string | null
          created_at: string
          id: string
          locator: string | null
          material_id: string
          section_id: string | null
          source_id: string
        }
        Insert: {
          citation_label?: string | null
          created_at?: string
          id?: string
          locator?: string | null
          material_id: string
          section_id?: string | null
          source_id: string
        }
        Update: {
          citation_label?: string | null
          created_at?: string
          id?: string
          locator?: string | null
          material_id?: string
          section_id?: string | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_citations_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_citations_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "material_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_citations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      material_sections: {
        Row: {
          content: string
          created_at: string
          id: string
          material_id: string
          position: number
          section_type: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          material_id: string
          position: number
          section_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          material_id?: string
          position?: number
          section_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_sections_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          id: string
          introduction: string | null
          status: string
          title: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          introduction?: string | null
          status?: string
          title: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          introduction?: string | null
          status?: string
          title?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      source_rights: {
        Row: {
          access_model: string
          evidence_note: string | null
          evidence_url: string | null
          id: string
          license_id: string | null
          rights_class: string
          source_id: string
          superseded_at: string | null
          verified_at: string | null
        }
        Insert: {
          access_model?: string
          evidence_note?: string | null
          evidence_url?: string | null
          id?: string
          license_id?: string | null
          rights_class: string
          source_id: string
          superseded_at?: string | null
          verified_at?: string | null
        }
        Update: {
          access_model?: string
          evidence_note?: string | null
          evidence_url?: string | null
          id?: string
          license_id?: string | null
          rights_class?: string
          source_id?: string
          superseded_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_rights_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_rights_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: true
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          authors: Json | null
          canonical_url: string | null
          created_at: string
          doi: string | null
          id: string
          language: string | null
          publication_date: string | null
          publisher: string | null
          source_type: string
          status: string
          title: string
        }
        Insert: {
          authors?: Json | null
          canonical_url?: string | null
          created_at?: string
          doi?: string | null
          id?: string
          language?: string | null
          publication_date?: string | null
          publisher?: string | null
          source_type: string
          status?: string
          title: string
        }
        Update: {
          authors?: Json | null
          canonical_url?: string | null
          created_at?: string
          doi?: string | null
          id?: string
          language?: string | null
          publication_date?: string | null
          publisher?: string | null
          source_type?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      student_disciplines: {
        Row: {
          course: string
          created_at: string
          discipline_name: string
          id: string
          user_id: string
        }
        Insert: {
          course?: string
          created_at?: string
          discipline_name: string
          id?: string
          user_id: string
        }
        Update: {
          course?: string
          created_at?: string
          discipline_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      student_exams: {
        Row: {
          created_at: string
          discipline: string
          exam_date: string | null
          exam_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discipline: string
          exam_date?: string | null
          exam_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discipline?: string
          exam_date?: string | null
          exam_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          created_at: string
          daily_study_minutes: number | null
          difficulties: string[] | null
          id: string
          institution: string | null
          onboarding_completed: boolean
          semester: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_study_minutes?: number | null
          difficulties?: string[] | null
          id?: string
          institution?: string | null
          onboarding_completed?: boolean
          semester?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_study_minutes?: number | null
          difficulties?: string[] | null
          id?: string
          institution?: string | null
          onboarding_completed?: boolean
          semester?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_topic_difficulties: {
        Row: {
          count: number
          difficulty_tag: string
          first_occurrence: string
          id: string
          last_occurrence: string
          review_status: string
          topic_id: string
          user_id: string
        }
        Insert: {
          count?: number
          difficulty_tag: string
          first_occurrence?: string
          id?: string
          last_occurrence?: string
          review_status?: string
          topic_id: string
          user_id: string
        }
        Update: {
          count?: number
          difficulty_tag?: string
          first_occurrence?: string
          id?: string
          last_occurrence?: string
          review_status?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_topic_difficulties_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_topic_progress: {
        Row: {
          attempts_count: number
          best_score: number | null
          completed_at: string | null
          exercises_completed: number
          id: string
          last_position: number | null
          started_at: string | null
          status: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts_count?: number
          best_score?: number | null
          completed_at?: string | null
          exercises_completed?: number
          id?: string
          last_position?: number | null
          started_at?: string | null
          status?: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts_count?: number
          best_score?: number | null
          completed_at?: string | null
          exercises_completed?: number
          id?: string
          last_position?: number | null
          started_at?: string | null
          status?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_sources: {
        Row: {
          created_at: string
          role: string
          source_id: string
          status: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          role: string
          source_id: string
          status?: string
          topic_id: string
        }
        Update: {
          created_at?: string
          role?: string
          source_id?: string
          status?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_sources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          discipline_id: string
          id: string
          name: string
          position: number
          published: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discipline_id: string
          id?: string
          name: string
          position?: number
          published?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discipline_id?: string
          id?: string
          name?: string
          position?: number
          published?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_role: { Args: never; Returns: string }
      finalize_topic_evaluation: {
        Args: { _answers: Json; _attempt_id: string }
        Returns: Json
      }
      get_student_dashboard_topics: {
        Args: never
        Returns: {
          best_score: number
          discipline_id: string
          discipline_name: string
          progress: number
          review_count: number
          status: string
          topic_description: string
          topic_id: string
          topic_name: string
        }[]
      }
      has_role: { Args: { required_role: string }; Returns: boolean }
      record_topic_difficulty: {
        Args: { _difficulty_tag: string; _topic_id: string }
        Returns: undefined
      }
      start_topic_evaluation: { Args: { _topic_id: string }; Returns: Json }
      submit_application_answer: {
        Args: {
          _open_text?: string
          _question_id: string
          _selected_option_id?: string
        }
        Returns: Json
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
    Enums: {},
  },
} as const
