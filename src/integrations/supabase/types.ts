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
      ai_analysis_jobs: {
        Row: {
          assessment_id: string | null
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          input: Json | null
          job_type: string
          model: string | null
          organisation_id: string
          output: Json | null
          pillar_assessment_id: string | null
          provider: Database["public"]["Enums"]["ai_provider"] | null
          started_at: string | null
          status: Database["public"]["Enums"]["ai_job_status"]
          triggered_by: string | null
        }
        Insert: {
          assessment_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input?: Json | null
          job_type: string
          model?: string | null
          organisation_id: string
          output?: Json | null
          pillar_assessment_id?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_job_status"]
          triggered_by?: string | null
        }
        Update: {
          assessment_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input?: Json | null
          job_type?: string
          model?: string | null
          organisation_id?: string
          output?: Json | null
          pillar_assessment_id?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_job_status"]
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_jobs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_jobs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_jobs_pillar_assessment_id_fkey"
            columns: ["pillar_assessment_id"]
            isOneToOne: false
            referencedRelation: "pillar_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_roles: {
        Row: {
          assessment_id: string
          id: string
          role: Database["public"]["Enums"]["assessment_role"]
          user_id: string
        }
        Insert: {
          assessment_id: string
          id?: string
          role: Database["public"]["Enums"]["assessment_role"]
          user_id: string
        }
        Update: {
          assessment_id?: string
          id?: string
          role?: Database["public"]["Enums"]["assessment_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_roles_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          business_area: string | null
          complexity_level: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organisation_id: string
          scope_level: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          target_completion_date: string | null
          transformation_profile: string | null
          updated_at: string
        }
        Insert: {
          business_area?: string | null
          complexity_level?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organisation_id: string
          scope_level?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          target_completion_date?: string | null
          transformation_profile?: string | null
          updated_at?: string
        }
        Update: {
          business_area?: string | null
          complexity_level?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organisation_id?: string
          scope_level?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          target_completion_date?: string | null
          transformation_profile?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          assessment_id: string | null
          created_at: string
          detail: Json | null
          event_type: string
          id: string
          organisation_id: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          assessment_id?: string | null
          created_at?: string
          detail?: Json | null
          event_type: string
          id?: string
          organisation_id?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          assessment_id?: string | null
          created_at?: string
          detail?: Json | null
          event_type?: string
          id?: string
          organisation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_items: {
        Row: {
          ai_summary: string | null
          assessment_id: string
          created_at: string
          description: string | null
          evidence_type: Database["public"]["Enums"]["evidence_type"]
          file_name: string
          file_type: string | null
          id: string
          organisation_id: string
          pillar_assessment_id: string | null
          processing_status: Database["public"]["Enums"]["evidence_processing_status"]
          relevance_score: number | null
          storage_path: string | null
          uploaded_by: string | null
        }
        Insert: {
          ai_summary?: string | null
          assessment_id: string
          created_at?: string
          description?: string | null
          evidence_type?: Database["public"]["Enums"]["evidence_type"]
          file_name: string
          file_type?: string | null
          id?: string
          organisation_id: string
          pillar_assessment_id?: string | null
          processing_status?: Database["public"]["Enums"]["evidence_processing_status"]
          relevance_score?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Update: {
          ai_summary?: string | null
          assessment_id?: string
          created_at?: string
          description?: string | null
          evidence_type?: Database["public"]["Enums"]["evidence_type"]
          file_name?: string
          file_type?: string | null
          id?: string
          organisation_id?: string
          pillar_assessment_id?: string | null
          processing_status?: Database["public"]["Enums"]["evidence_processing_status"]
          relevance_score?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_pillar_assessment_id_fkey"
            columns: ["pillar_assessment_id"]
            isOneToOne: false
            referencedRelation: "pillar_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          organisation_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organisation_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organisation_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_ai_keys: {
        Row: {
          encrypted_key: string
          organisation_id: string
          updated_at: string
        }
        Insert: {
          encrypted_key: string
          organisation_id: string
          updated_at?: string
        }
        Update: {
          encrypted_key?: string
          organisation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_ai_keys_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_ai_settings: {
        Row: {
          api_key_last4: string | null
          is_active: boolean
          last_verified_at: string | null
          last_verified_status: string | null
          model: string
          organisation_id: string
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key_last4?: string | null
          is_active?: boolean
          last_verified_at?: string | null
          last_verified_status?: string | null
          model?: string
          organisation_id: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key_last4?: string | null
          is_active?: boolean
          last_verified_at?: string | null
          last_verified_status?: string | null
          model?: string
          organisation_id?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organisation_ai_settings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
        }
        Relationships: []
      }
      pillar_assessments: {
        Row: {
          ai_evidence_considered: string[] | null
          ai_missing_evidence: string[] | null
          ai_rationale: string | null
          ai_suggested_next_action: string | null
          assessment_id: string
          confidence: string | null
          created_at: string
          final_score: number | null
          id: string
          pillar_id: string
          provisional_score: number | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["pillar_status"]
          updated_at: string
          weight_override: number | null
        }
        Insert: {
          ai_evidence_considered?: string[] | null
          ai_missing_evidence?: string[] | null
          ai_rationale?: string | null
          ai_suggested_next_action?: string | null
          assessment_id: string
          confidence?: string | null
          created_at?: string
          final_score?: number | null
          id?: string
          pillar_id: string
          provisional_score?: number | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["pillar_status"]
          updated_at?: string
          weight_override?: number | null
        }
        Update: {
          ai_evidence_considered?: string[] | null
          ai_missing_evidence?: string[] | null
          ai_rationale?: string | null
          ai_suggested_next_action?: string | null
          assessment_id?: string
          confidence?: string | null
          created_at?: string
          final_score?: number | null
          id?: string
          pillar_id?: string
          provisional_score?: number | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["pillar_status"]
          updated_at?: string
          weight_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pillar_assessments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pillar_assessments_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      pillar_assignments: {
        Row: {
          id: string
          pillar_assessment_id: string
          role: Database["public"]["Enums"]["pillar_role"]
          user_id: string
        }
        Insert: {
          id?: string
          pillar_assessment_id: string
          role: Database["public"]["Enums"]["pillar_role"]
          user_id: string
        }
        Update: {
          id?: string
          pillar_assessment_id?: string
          role?: Database["public"]["Enums"]["pillar_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pillar_assignments_pillar_assessment_id_fkey"
            columns: ["pillar_assessment_id"]
            isOneToOne: false
            referencedRelation: "pillar_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      pillars: {
        Row: {
          code: string
          default_weight: number
          description: string
          display_order: number
          id: string
          name: string
          subdimensions: Json
        }
        Insert: {
          code: string
          default_weight: number
          description: string
          display_order: number
          id?: string
          name: string
          subdimensions?: Json
        }
        Update: {
          code?: string
          default_weight?: number
          description?: string
          display_order?: number
          id?: string
          name?: string
          subdimensions?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          display_order: number
          id: string
          pillar_id: string
          prompt: string
          subdimension: string
        }
        Insert: {
          display_order?: number
          id?: string
          pillar_id: string
          prompt: string
          subdimension: string
        }
        Update: {
          display_order?: number
          id?: string
          pillar_id?: string
          prompt?: string
          subdimension?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          assessment_id: string
          category: Database["public"]["Enums"]["recommendation_category"]
          created_at: string
          description: string | null
          id: string
          organisation_id: string
          pillar_id: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          rationale: string | null
          status: Database["public"]["Enums"]["recommendation_status"]
          suggested_owner: string | null
          title: string
        }
        Insert: {
          assessment_id: string
          category?: Database["public"]["Enums"]["recommendation_category"]
          created_at?: string
          description?: string | null
          id?: string
          organisation_id: string
          pillar_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          rationale?: string | null
          status?: Database["public"]["Enums"]["recommendation_status"]
          suggested_owner?: string | null
          title: string
        }
        Update: {
          assessment_id?: string
          category?: Database["public"]["Enums"]["recommendation_category"]
          created_at?: string
          description?: string | null
          id?: string
          organisation_id?: string
          pillar_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          rationale?: string | null
          status?: Database["public"]["Enums"]["recommendation_status"]
          suggested_owner?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          pillar_assessment_id: string
          question_id: string
          respondent_id: string | null
          score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          pillar_assessment_id: string
          question_id: string
          respondent_id?: string | null
          score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          pillar_assessment_id?: string
          question_id?: string
          respondent_id?: string | null
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_pillar_assessment_id_fkey"
            columns: ["pillar_assessment_id"]
            isOneToOne: false
            referencedRelation: "pillar_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      review_comments: {
        Row: {
          author_id: string | null
          comment: string
          created_at: string
          decision: string | null
          id: string
          pillar_assessment_id: string
        }
        Insert: {
          author_id?: string | null
          comment: string
          created_at?: string
          decision?: string | null
          id?: string
          pillar_assessment_id: string
        }
        Update: {
          author_id?: string | null
          comment?: string
          created_at?: string
          decision?: string | null
          id?: string
          pillar_assessment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_pillar_assessment_id_fkey"
            columns: ["pillar_assessment_id"]
            isOneToOne: false
            referencedRelation: "pillar_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          assessment_id: string
          created_at: string
          description: string | null
          id: string
          likelihood: Database["public"]["Enums"]["priority_level"]
          mitigation: string | null
          organisation_id: string
          pillar_id: string | null
          severity: Database["public"]["Enums"]["priority_level"]
          title: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          description?: string | null
          id?: string
          likelihood?: Database["public"]["Enums"]["priority_level"]
          mitigation?: string | null
          organisation_id: string
          pillar_id?: string | null
          severity?: Database["public"]["Enums"]["priority_level"]
          title: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          description?: string | null
          id?: string
          likelihood?: Database["public"]["Enums"]["priority_level"]
          mitigation?: string | null
          organisation_id?: string
          pillar_id?: string | null
          severity?: Database["public"]["Enums"]["priority_level"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      score_overrides: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          new_score: number
          pillar_assessment_id: string
          previous_score: number | null
          rationale: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          new_score: number
          pillar_assessment_id: string
          previous_score?: number | null
          rationale: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          new_score?: number
          pillar_assessment_id?: string
          previous_score?: number | null
          rationale?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_overrides_pillar_assessment_id_fkey"
            columns: ["pillar_assessment_id"]
            isOneToOne: false
            referencedRelation: "pillar_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          stakeholder_group: string | null
          submitted_at: string | null
          survey_id: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          stakeholder_group?: string | null
          submitted_at?: string | null
          survey_id: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          stakeholder_group?: string | null
          submitted_at?: string | null
          survey_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_recipients_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          question_id: string | null
          recipient_id: string
          score: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          question_id?: string | null
          recipient_id: string
          score?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          question_id?: string | null
          recipient_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "survey_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          assessment_id: string
          created_at: string
          description: string | null
          id: string
          pillar_id: string | null
          title: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          description?: string | null
          id?: string
          pillar_id?: string | null
          title: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          description?: string | null
          id?: string
          pillar_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          organisation_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          organisation_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          organisation_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assessment_org: { Args: { _assessment_id: string }; Returns: string }
      has_org_access: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      readiness_band: { Args: { score: number }; Returns: string }
    }
    Enums: {
      ai_job_status: "pending" | "running" | "complete" | "failed"
      ai_provider: "openai" | "anthropic" | "gemini"
      app_role: "org_admin"
      assessment_role: "change_owner" | "reviewer" | "observer"
      assessment_status:
        | "draft"
        | "active"
        | "in_review"
        | "complete"
        | "archived"
      evidence_processing_status:
        | "uploaded"
        | "processing"
        | "complete"
        | "failed"
      evidence_type:
        | "strategy_document"
        | "business_case"
        | "governance_paper"
        | "risk_register"
        | "process_map"
        | "policy_or_standard"
        | "operating_model_document"
        | "org_chart"
        | "capability_assessment"
        | "training_plan"
        | "technology_inventory"
        | "architecture_diagram"
        | "data_reporting_document"
        | "kpi_performance_report"
        | "meeting_note"
        | "other"
      org_role: "admin" | "member"
      pillar_role: "pillar_lead" | "contributor"
      pillar_status:
        | "not_started"
        | "in_progress"
        | "awaiting_evidence"
        | "awaiting_stakeholder_input"
        | "ready_for_ai_analysis"
        | "ai_analysis_complete"
        | "ready_for_review"
        | "changes_requested"
        | "complete"
      priority_level: "low" | "medium" | "high" | "critical"
      recommendation_category:
        | "quick_win"
        | "foundational_improvement"
        | "strategic_intervention"
        | "risk_mitigation"
        | "dependency_resolution"
        | "capability_uplift"
        | "governance_improvement"
        | "adoption_intervention"
      recommendation_status:
        | "suggested"
        | "accepted"
        | "in_progress"
        | "complete"
        | "dismissed"
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
      ai_job_status: ["pending", "running", "complete", "failed"],
      ai_provider: ["openai", "anthropic", "gemini"],
      app_role: ["org_admin"],
      assessment_role: ["change_owner", "reviewer", "observer"],
      assessment_status: [
        "draft",
        "active",
        "in_review",
        "complete",
        "archived",
      ],
      evidence_processing_status: [
        "uploaded",
        "processing",
        "complete",
        "failed",
      ],
      evidence_type: [
        "strategy_document",
        "business_case",
        "governance_paper",
        "risk_register",
        "process_map",
        "policy_or_standard",
        "operating_model_document",
        "org_chart",
        "capability_assessment",
        "training_plan",
        "technology_inventory",
        "architecture_diagram",
        "data_reporting_document",
        "kpi_performance_report",
        "meeting_note",
        "other",
      ],
      org_role: ["admin", "member"],
      pillar_role: ["pillar_lead", "contributor"],
      pillar_status: [
        "not_started",
        "in_progress",
        "awaiting_evidence",
        "awaiting_stakeholder_input",
        "ready_for_ai_analysis",
        "ai_analysis_complete",
        "ready_for_review",
        "changes_requested",
        "complete",
      ],
      priority_level: ["low", "medium", "high", "critical"],
      recommendation_category: [
        "quick_win",
        "foundational_improvement",
        "strategic_intervention",
        "risk_mitigation",
        "dependency_resolution",
        "capability_uplift",
        "governance_improvement",
        "adoption_intervention",
      ],
      recommendation_status: [
        "suggested",
        "accepted",
        "in_progress",
        "complete",
        "dismissed",
      ],
    },
  },
} as const
