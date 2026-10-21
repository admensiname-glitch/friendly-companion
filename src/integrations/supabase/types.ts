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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      agent_actions: {
        Row: {
          action_type: string
          created_at: string
          details: Json
          id: string
          run_id: string | null
          task_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json
          id?: string
          run_id?: string | null
          task_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json
          id?: string
          run_id?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_approvals: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          requested_action: Json
          run_id: string
          status: string
          task_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          requested_action?: Json
          run_id: string
          status?: string
          task_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          requested_action?: Json
          run_id?: string
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_approvals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_approvals_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_findings: {
        Row: {
          created_at: string
          details: string
          evidence: Json
          id: string
          recommendation: string | null
          run_id: string
          severity: string
          status: string
          task_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          details: string
          evidence?: Json
          id?: string
          recommendation?: string | null
          run_id: string
          severity?: string
          status?: string
          task_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          details?: string
          evidence?: Json
          id?: string
          recommendation?: string | null
          run_id?: string
          severity?: string
          status?: string
          task_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_findings_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          id: string
          memory_key: string
          memory_value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          memory_key: string
          memory_value?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          memory_key?: string
          memory_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          created_at: string
          id: string
          mission: string
          requested_by: string
          risk_level: string
          scope: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mission: string
          requested_by: string
          risk_level?: string
          scope?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mission?: string
          requested_by?: string
          risk_level?: string
          scope?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_tasks: {
        Row: {
          created_at: string
          description: string
          id: string
          risk_level: string
          run_id: string
          status: string
          task_key: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          risk_level?: string
          run_id: string
          status?: string
          task_key: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          risk_level?: string
          run_id?: string
          status?: string
          task_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tool_requests: {
        Row: {
          arguments: Json
          created_at: string
          evidence: Json
          id: string
          purpose: string
          requested_by: string
          result: Json | null
          risk_level: string
          run_id: string
          status: string
          task_id: string | null
          tool_name: string
          updated_at: string
        }
        Insert: {
          arguments?: Json
          created_at?: string
          evidence?: Json
          id?: string
          purpose: string
          requested_by: string
          result?: Json | null
          risk_level?: string
          run_id: string
          status?: string
          task_id?: string | null
          tool_name: string
          updated_at?: string
        }
        Update: {
          arguments?: Json
          created_at?: string
          evidence?: Json
          id?: string
          purpose?: string
          requested_by?: string
          result?: Json | null
          risk_level?: string
          run_id?: string
          status?: string
          task_id?: string | null
          tool_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tool_requests_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_micro_assessments: {
        Row: {
          answered_at: string | null
          concept_tags: string[]
          conversation_id: string | null
          correct_option_index: number
          created_at: string
          difficulty: string
          explanation: string
          id: string
          is_correct: boolean | null
          options: Json
          question_text: string
          selected_option_index: number | null
          status: string
          topic_id: string
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          concept_tags?: string[]
          conversation_id?: string | null
          correct_option_index: number
          created_at?: string
          difficulty?: string
          explanation: string
          id?: string
          is_correct?: boolean | null
          options: Json
          question_text: string
          selected_option_index?: number | null
          status?: string
          topic_id: string
          user_id: string
        }
        Update: {
          answered_at?: string | null
          concept_tags?: string[]
          conversation_id?: string | null
          correct_option_index?: number
          created_at?: string
          difficulty?: string
          explanation?: string
          id?: string
          is_correct?: boolean | null
          options?: Json
          question_text?: string
          selected_option_index?: number | null
          status?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_micro_assessments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_micro_assessments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      community_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_avatar_url: string | null
          author_display_name: string | null
          author_id: string
          author_is_verified: boolean
          body: string
          course_id: string | null
          created_at: string
          discipline_id: string | null
          id: string
          image_path: string | null
          image_url: string | null
          is_official: boolean
          official_until: string | null
          topic_id: string | null
          tutor_image_url: string | null
          tutor_image_alt: string | null
          tutor_image_source_url: string | null
          tutor_image_license: string | null
          tutor_image_attribution: string | null
          tutor_visual_aid: Json | null
          tutor_video_url: string | null
          tutor_video_embed_url: string | null
          tutor_video_title: string | null
          tutor_video_description: string | null
          tutor_video_channel_name: string | null
          tutor_video_duration_label: string | null
          tutor_video_reason: string | null
          updated_at: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_display_name?: string | null
          author_id: string
          author_is_verified?: boolean
          body: string
          course_id?: string | null
          created_at?: string
          discipline_id?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_official?: boolean
          official_until?: string | null
          topic_id?: string | null
          tutor_image_url?: string | null
          tutor_image_alt?: string | null
          tutor_image_source_url?: string | null
          tutor_image_license?: string | null
          tutor_image_attribution?: string | null
          tutor_visual_aid?: Json | null
          tutor_video_url?: string | null
          tutor_video_embed_url?: string | null
          tutor_video_title?: string | null
          tutor_video_description?: string | null
          tutor_video_channel_name?: string | null
          tutor_video_duration_label?: string | null
          tutor_video_reason?: string | null
          updated_at?: string
        }
        Update: {
          author_avatar_url?: string | null
          author_display_name?: string | null
          author_id?: string
          author_is_verified?: boolean
          body?: string
          course_id?: string | null
          created_at?: string
          discipline_id?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_official?: boolean
          official_until?: string | null
          topic_id?: string | null
          tutor_image_url?: string | null
          tutor_image_alt?: string | null
          tutor_image_source_url?: string | null
          tutor_image_license?: string | null
          tutor_image_attribution?: string | null
          tutor_visual_aid?: Json | null
          tutor_video_url?: string | null
          tutor_video_embed_url?: string | null
          tutor_video_title?: string | null
          tutor_video_description?: string | null
          tutor_video_channel_name?: string | null
          tutor_video_duration_label?: string | null
          tutor_video_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      community_saves: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
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
          component_kind: string
          course_id: string
          created_at: string
          curriculum_area: string | null
          curriculum_order: number | null
          curriculum_status: string
          description: string | null
          id: string
          is_core: boolean
          name: string
          published: boolean
          reference_semester: number | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          component_kind?: string
          course_id: string
          created_at?: string
          curriculum_area?: string | null
          curriculum_order?: number | null
          curriculum_status?: string
          description?: string | null
          id?: string
          is_core?: boolean
          name: string
          published?: boolean
          reference_semester?: number | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          component_kind?: string
          course_id?: string
          created_at?: string
          curriculum_area?: string | null
          curriculum_order?: number | null
          curriculum_status?: string
          description?: string | null
          id?: string
          is_core?: boolean
          name?: string
          published?: boolean
          reference_semester?: number | null
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
      exam_attempt_answers: {
        Row: {
          ai_feedback: string | null
          answered_at: string
          attempt_id: string
          attempt_question_id: string
          id: string
          is_correct: boolean
          response_text: string | null
          rubric_score: number | null
          selected_option_id: string | null
        }
        Insert: {
          ai_feedback?: string | null
          answered_at?: string
          attempt_id: string
          attempt_question_id: string
          id?: string
          is_correct: boolean
          response_text?: string | null
          rubric_score?: number | null
          selected_option_id?: string | null
        }
        Update: {
          ai_feedback?: string | null
          answered_at?: string
          attempt_id?: string
          attempt_question_id?: string
          id?: string
          is_correct?: boolean
          response_text?: string | null
          rubric_score?: number | null
          selected_option_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempt_answers_attempt_question_id_fkey"
            columns: ["attempt_question_id"]
            isOneToOne: false
            referencedRelation: "exam_attempt_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempt_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "exercise_options"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempt_questions: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          minimum_lines: number | null
          position: number
          question_id: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          minimum_lines?: number | null
          position: number
          question_id: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          minimum_lines?: number | null
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempt_questions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempt_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exercise_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          answered_questions: number
          completed_at: string | null
          correct_answers: number
          created_at: string
          discipline_id: string | null
          duration_seconds: number | null
          id: string
          score: number | null
          started_at: string
          status: string
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answered_questions?: number
          completed_at?: string | null
          correct_answers?: number
          created_at?: string
          discipline_id?: string | null
          duration_seconds?: number | null
          id?: string
          score?: number | null
          started_at?: string
          status?: string
          total_questions: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answered_questions?: number
          completed_at?: string | null
          correct_answers?: number
          created_at?: string
          discipline_id?: string | null
          duration_seconds?: number | null
          id?: string
          score?: number | null
          started_at?: string
          status?: string
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
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
      formal_evaluation_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          id: string
          is_correct: boolean
          question_id: string
          selected_option_index: number
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_option_index: number
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_option_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "formal_evaluation_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "evaluation_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formal_evaluation_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "formal_evaluation_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      formal_evaluation_questions: {
        Row: {
          attempt_id: string
          concept_tags: string[]
          correct_option_index: number
          created_at: string
          difficulty: string
          explanation: string
          id: string
          options: Json
          position: number
          question_text: string
        }
        Insert: {
          attempt_id: string
          concept_tags?: string[]
          correct_option_index: number
          created_at?: string
          difficulty?: string
          explanation?: string
          id?: string
          options: Json
          position: number
          question_text: string
        }
        Update: {
          attempt_id?: string
          concept_tags?: string[]
          correct_option_index?: number
          created_at?: string
          difficulty?: string
          explanation?: string
          id?: string
          options?: Json
          position?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "formal_evaluation_questions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "evaluation_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_content_rebuild_auth: {
        Row: {
          created_at: string
          id: number
          token: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          id: number
          token?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          id?: number
          token?: string | null
          token_hash?: string
        }
        Relationships: []
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
      material_chunk_citations: {
        Row: {
          created_at: string
          id: string
          material_id: string
          section_id: string | null
          source_chunk_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          section_id?: string | null
          source_chunk_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          section_id?: string | null
          source_chunk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_chunk_citations_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_chunk_citations_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "material_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_chunk_citations_source_chunk_id_fkey"
            columns: ["source_chunk_id"]
            isOneToOne: false
            referencedRelation: "source_chunks"
            referencedColumns: ["id"]
          },
        ]
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
      material_generation_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          material_id: string | null
          model_name: string | null
          prompt_version: string | null
          source_count: number
          started_at: string | null
          status: string
          topic_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          material_id?: string | null
          model_name?: string | null
          prompt_version?: string | null
          source_count?: number
          started_at?: string | null
          status?: string
          topic_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          material_id?: string | null
          model_name?: string | null
          prompt_version?: string | null
          source_count?: number
          started_at?: string | null
          status?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_generation_runs_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_generation_runs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
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
      notification_preferences: {
        Row: {
          announcements: boolean
          learning_recommendations: boolean
          push_enabled: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          review_reminders: boolean
          study_reminders: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          announcements?: boolean
          learning_recommendations?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          review_reminders?: boolean
          study_reminders?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          announcements?: boolean
          learning_recommendations?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          review_reminders?: boolean
          study_reminders?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      professor_audit_findings: {
        Row: {
          audit_kind: string
          auditor_version: string
          created_at: string
          evidence: Json
          findings: Json
          id: string
          model_name: string
          recommendation: string | null
          score: number | null
          status: string
          target_id: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          audit_kind: string
          auditor_version: string
          created_at?: string
          evidence?: Json
          findings?: Json
          id?: string
          model_name: string
          recommendation?: string | null
          score?: number | null
          status?: string
          target_id: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          audit_kind?: string
          auditor_version?: string
          created_at?: string
          evidence?: Json
          findings?: Json
          id?: string
          model_name?: string
          recommendation?: string | null
          score?: number | null
          status?: string
          target_id?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          active: boolean
          auth_key: string | null
          channel: string
          created_at: string
          endpoint: string | null
          fcm_token: string | null
          id: string
          p256dh: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          auth_key?: string | null
          channel: string
          created_at?: string
          endpoint?: string | null
          fcm_token?: string | null
          id?: string
          p256dh?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          auth_key?: string | null
          channel?: string
          created_at?: string
          endpoint?: string | null
          fcm_token?: string | null
          id?: string
          p256dh?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      source_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          embedding_model: string | null
          id: string
          locator: string | null
          source_document_id: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          locator?: string | null
          source_document_id: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          locator?: string | null
          source_document_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "source_chunks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      source_documents: {
        Row: {
          canonical_url: string | null
          content_sha256: string | null
          created_at: string
          document_type: string
          id: string
          retrieval_status: string
          retrieval_url: string | null
          retrieved_at: string | null
          rights_snapshot: string
          source_id: string
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          content_sha256?: string | null
          created_at?: string
          document_type?: string
          id?: string
          retrieval_status?: string
          retrieval_url?: string | null
          retrieved_at?: string | null
          rights_snapshot?: string
          source_id: string
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          content_sha256?: string | null
          created_at?: string
          document_type?: string
          id?: string
          retrieval_status?: string
          retrieval_url?: string | null
          retrieved_at?: string | null
          rights_snapshot?: string
          source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_ingestion_jobs: {
        Row: {
          candidate_count: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          provider: string
          query_text: string
          requested_by: string | null
          selected_count: number
          stage: string
          started_at: string | null
          status: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          candidate_count?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          provider: string
          query_text: string
          requested_by?: string | null
          selected_count?: number
          stage?: string
          started_at?: string | null
          status?: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          candidate_count?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          provider?: string
          query_text?: string
          requested_by?: string | null
          selected_count?: number
          stage?: string
          started_at?: string | null
          status?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_ingestion_jobs_topic_id_fkey"
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
      source_search_candidates: {
        Row: {
          access_model: string | null
          authors: Json
          canonical_url: string
          created_at: string
          doi: string | null
          external_id: string | null
          id: string
          job_id: string
          language: string | null
          metadata: Json
          provider: string
          publication_date: string | null
          publisher: string | null
          relevance_score: number | null
          rights_class: string | null
          rights_evidence_note: string | null
          rights_evidence_url: string | null
          source_id: string | null
          source_type: string
          title: string
          updated_at: string
          validation_status: string
        }
        Insert: {
          access_model?: string | null
          authors?: Json
          canonical_url: string
          created_at?: string
          doi?: string | null
          external_id?: string | null
          id?: string
          job_id: string
          language?: string | null
          metadata?: Json
          provider: string
          publication_date?: string | null
          publisher?: string | null
          relevance_score?: number | null
          rights_class?: string | null
          rights_evidence_note?: string | null
          rights_evidence_url?: string | null
          source_id?: string | null
          source_type?: string
          title: string
          updated_at?: string
          validation_status?: string
        }
        Update: {
          access_model?: string | null
          authors?: Json
          canonical_url?: string
          created_at?: string
          doi?: string | null
          external_id?: string | null
          id?: string
          job_id?: string
          language?: string | null
          metadata?: Json
          provider?: string
          publication_date?: string | null
          publisher?: string | null
          relevance_score?: number | null
          rights_class?: string | null
          rights_evidence_note?: string | null
          rights_evidence_url?: string | null
          source_id?: string | null
          source_type?: string
          title?: string
          updated_at?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_search_candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "source_ingestion_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_search_candidates_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
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
      student_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
      student_focus_discipline: {
        Row: {
          discipline_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          discipline_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          discipline_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_focus_discipline_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      student_focus_disciplines: {
        Row: {
          created_at: string
          discipline_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discipline_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discipline_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_focus_disciplines_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      student_learning_signals: {
        Row: {
          concept: string
          correct_count: number
          discipline_id: string
          evidence: string | null
          first_seen: string
          id: string
          last_seen: string
          occurrences: number
          severity: number
          signal_type: string
          status: string
          topic_id: string
          user_id: string
        }
        Insert: {
          concept: string
          correct_count?: number
          discipline_id: string
          evidence?: string | null
          first_seen?: string
          id?: string
          last_seen?: string
          occurrences?: number
          severity?: number
          signal_type: string
          status?: string
          topic_id: string
          user_id: string
        }
        Update: {
          concept?: string
          correct_count?: number
          discipline_id?: string
          evidence?: string | null
          first_seen?: string
          id?: string
          last_seen?: string
          occurrences?: number
          severity?: number
          signal_type?: string
          status?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_learning_signals_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_learning_signals_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_material_section_progress: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          section_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          section_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          section_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_material_section_progress_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "material_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notifications: {
        Row: {
          body: string
          category: string
          created_at: string
          delivery_status: string
          id: string
          push_sent_at: string | null
          read_at: string | null
          target_url: string | null
          title: string
          topic: string | null
          user_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          delivery_status?: string
          id?: string
          push_sent_at?: string | null
          read_at?: string | null
          target_url?: string | null
          title: string
          topic?: string | null
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          delivery_status?: string
          id?: string
          push_sent_at?: string | null
          read_at?: string | null
          target_url?: string | null
          title?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          avatar_url: string | null
          course_id: string | null
          created_at: string
          daily_study_minutes: number | null
          difficulties: string[] | null
          display_name: string | null
          id: string
          institution: string | null
          onboarding_completed: boolean
          semester: number | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          course_id?: string | null
          created_at?: string
          daily_study_minutes?: number | null
          difficulties?: string[] | null
          display_name?: string | null
          id?: string
          institution?: string | null
          onboarding_completed?: boolean
          semester?: number | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          course_id?: string | null
          created_at?: string
          daily_study_minutes?: number | null
          difficulties?: string[] | null
          display_name?: string | null
          id?: string
          institution?: string | null
          onboarding_completed?: boolean
          semester?: number | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_topic_difficulties: {
        Row: {
          correct_count: number
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
          correct_count?: number
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
          correct_count?: number
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
          last_learning_activity_at: string | null
          last_position: number | null
          micro_current_difficulty: string
          micro_mastery_level: string
          micro_questions_attempted: number
          micro_questions_correct: number
          next_micro_review_at: string | null
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
          last_learning_activity_at?: string | null
          last_position?: number | null
          micro_current_difficulty?: string
          micro_mastery_level?: string
          micro_questions_attempted?: number
          micro_questions_correct?: number
          next_micro_review_at?: string | null
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
          last_learning_activity_at?: string | null
          last_position?: number | null
          micro_current_difficulty?: string
          micro_mastery_level?: string
          micro_questions_attempted?: number
          micro_questions_correct?: number
          next_micro_review_at?: string | null
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
      study_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      system_owners: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
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
      topic_videos: {
        Row: {
          channel_name: string | null
          created_at: string
          description: string | null
          duration_label: string | null
          embed_url: string
          id: string
          platform: string
          position: number
          published: boolean
          source_id: string | null
          title: string
          topic_id: string
          updated_at: string
          video_url: string
        }
        Insert: {
          channel_name?: string | null
          created_at?: string
          description?: string | null
          duration_label?: string | null
          embed_url: string
          id?: string
          platform?: string
          position?: number
          published?: boolean
          source_id?: string | null
          title: string
          topic_id: string
          updated_at?: string
          video_url: string
        }
        Update: {
          channel_name?: string | null
          created_at?: string
          description?: string | null
          duration_label?: string | null
          embed_url?: string
          id?: string
          platform?: string
          position?: number
          published?: boolean
          source_id?: string | null
          title?: string
          topic_id?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_videos_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_videos_topic_id_fkey"
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
      admin_create_source_ingestion_job: {
        Args: { _provider?: string; _query_text: string; _topic_id: string }
        Returns: string
      }
      admin_get_source_ingestion_jobs: {
        Args: { _limit?: number }
        Returns: {
          candidate_count: number
          completed_at: string
          created_at: string
          error_message: string
          id: string
          provider: string
          query_text: string
          selected_count: number
          stage: string
          started_at: string
          status: string
          topic_id: string
          updated_at: string
        }[]
      }
      admin_get_source_search_candidates: {
        Args: { _job_id: string; _limit?: number }
        Returns: {
          access_model: string
          authors: Json
          canonical_url: string
          doi: string
          external_id: string
          id: string
          language: string
          metadata: Json
          provider: string
          publication_date: string
          publisher: string
          relevance_score: number
          rights_class: string
          rights_evidence_note: string
          rights_evidence_url: string
          source_id: string
          source_type: string
          title: string
          validation_status: string
        }[]
      }
      admin_set_publication: {
        Args: { _entity_id: string; _entity_type: string; _published: boolean }
        Returns: Json
      }
      auth_role: { Args: never; Returns: string }
      create_formal_evaluation_attempt: {
        Args: { _questions: Json; _topic_id: string; _user_id: string }
        Returns: Json
      }
      finalize_formal_evaluation: {
        Args: { _answers: Json; _attempt_id: string }
        Returns: Json
      }
      finalize_topic_evaluation: {
        Args: { _answers: Json; _attempt_id: string }
        Returns: Json
      }
      finish_exam: { Args: { _attempt_id: string }; Returns: Json }
      finish_study_session: { Args: { _session_id: string }; Returns: Json }
      get_admin_content_overview: {
        Args: never
        Returns: {
          entity_id: string
          entity_type: string
          name: string
          parent_name: string
          published: boolean
          updated_at: string
        }[]
      }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_admin_source_overview: {
        Args: never
        Returns: {
          access_model: string
          document_count: number
          publisher: string
          rights_class: string
          source_id: string
          source_type: string
          title: string
          topic_count: number
          verified_at: string
        }[]
      }
      get_formal_evaluation_history: {
        Args: { _topic_id: string }
        Returns: Json
      }
      get_formal_evaluation_state: {
        Args: { _topic_id: string }
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
      get_student_focus_discipline: { Args: never; Returns: Json }
      get_student_focus_disciplines: { Args: never; Returns: Json }
      get_student_performance_summary: { Args: never; Returns: Json }
      get_student_recent_evaluations: {
        Args: { _limit?: number }
        Returns: {
          attempt_id: string
          completed_at: string
          correct_answers: number
          discipline_name: string
          score: number
          topic_id: string
          topic_name: string
          total_questions: number
        }[]
      }
      get_student_review_items: {
        Args: never
        Returns: {
          correct_count: number
          count: number
          difficulty_tag: string
          discipline_id: string
          discipline_name: string
          last_occurrence: string
          review_status: string
          topic_id: string
          topic_name: string
        }[]
      }
      get_student_study_recommendation: { Args: never; Returns: Json }
      get_student_today_study: { Args: never; Returns: Json }
      get_student_topic_application_progress: {
        Args: { _topic_id: string }
        Returns: {
          answered_questions: number
          progress: number
          total_questions: number
        }[]
      }
      has_role: { Args: { required_role: string }; Returns: boolean }
      mark_material_section_complete: {
        Args: { _section_id: string }
        Returns: {
          completed_sections: number
          total_sections: number
        }[]
      }
      record_learning_signal: {
        Args: {
          _concept: string
          _correct?: boolean
          _evidence?: string
          _severity?: number
          _signal_type: string
          _topic_id: string
        }
        Returns: undefined
      }
      record_micro_assessment_answer: {
        Args: { _assessment_id: string; _selected_option_index: number }
        Returns: Json
      }
      record_topic_difficulty: {
        Args: { _difficulty_tag: string; _topic_id: string }
        Returns: undefined
      }
      register_source_document: {
        Args: {
          _retrieval_url: string
          _rights_snapshot: string
          _source_id: string
        }
        Returns: string
      }
      remove_student_focus_discipline: {
        Args: { _discipline_id: string }
        Returns: Json
      }
      save_exam_answer: {
        Args: { _attempt_question_id: string; _selected_option_id: string }
        Returns: Json
      }
      save_exam_text_answer: {
        Args: { _attempt_question_id: string; _response_text: string }
        Returns: Json
      }
      save_student_topic_position: {
        Args: { _position: number; _topic_id: string }
        Returns: Json
      }
      set_student_focus_discipline: {
        Args: { _discipline_id: string }
        Returns: Json
      }
      start_exam: {
        Args: {
          _discipline_id: string
          _duration_seconds: number
          _question_count: number
          _topic_ids: string[]
        }
        Returns: Json
      }
      start_study_session: { Args: { _topic_id: string }; Returns: Json }
      start_topic_evaluation: { Args: { _topic_id: string }; Returns: Json }
      submit_application_answer: {
        Args: {
          _open_text?: string
          _question_id: string
          _selected_option_id?: string
        }
        Returns: Json
      }
      update_topic_difficulty_after_answer: {
        Args: {
          _difficulty_tags: string[]
          _is_correct: boolean
          _topic_id: string
          _user_id: string
        }
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
