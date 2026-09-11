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
      analysis_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          entities_found: number
          error_summary: string | null
          events_found: number
          findings_found: number
          id: string
          investigation_id: string
          patterns_found: number
          relationships_found: number
          sources_processed: number
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          entities_found?: number
          error_summary?: string | null
          events_found?: number
          findings_found?: number
          id?: string
          investigation_id: string
          patterns_found?: number
          relationships_found?: number
          sources_processed?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          entities_found?: number
          error_summary?: string | null
          events_found?: number
          findings_found?: number
          id?: string
          investigation_id?: string
          patterns_found?: number
          relationships_found?: number
          sources_processed?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_runs_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      analyst_reviews: {
        Row: {
          analyst_id: string
          created_at: string
          decision: string
          finding_id: string
          id: string
          notes: string | null
        }
        Insert: {
          analyst_id: string
          created_at?: string
          decision: string
          finding_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          analyst_id?: string
          created_at?: string
          decision?: string
          finding_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analyst_reviews_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_transcripts: {
        Row: {
          created_at: string
          id: string
          language: string | null
          metadata: Json
          source_id: string
          transcript: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          metadata?: Json
          source_id: string
          transcript?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          metadata?: Json
          source_id?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_transcripts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "intelligence_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      document_pages: {
        Row: {
          created_at: string
          extracted_content: string | null
          id: string
          metadata: Json
          page_number: number
          source_id: string
          structured_content: Json
        }
        Insert: {
          created_at?: string
          extracted_content?: string | null
          id?: string
          metadata?: Json
          page_number: number
          source_id: string
          structured_content?: Json
        }
        Update: {
          created_at?: string
          extracted_content?: string | null
          id?: string
          metadata?: Json
          page_number?: number
          source_id?: string
          structured_content?: Json
        }
        Relationships: [
          {
            foreignKeyName: "document_pages_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "intelligence_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          confidence: number | null
          created_at: string
          description: string | null
          entity_type: string
          first_seen: string | null
          id: string
          investigation_id: string
          last_seen: string | null
          name: string
          normalized_name: string
          risk_score: number | null
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          description?: string | null
          entity_type: string
          first_seen?: string | null
          id?: string
          investigation_id: string
          last_seen?: string | null
          name: string
          normalized_name: string
          risk_score?: number | null
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          description?: string | null
          entity_type?: string
          first_seen?: string | null
          id?: string
          investigation_id?: string
          last_seen?: string | null
          name?: string
          normalized_name?: string
          risk_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_aliases: {
        Row: {
          alias: string
          confidence: number | null
          created_at: string
          entity_id: string
          id: string
          source_id: string | null
        }
        Insert: {
          alias: string
          confidence?: number | null
          created_at?: string
          entity_id: string
          id?: string
          source_id?: string | null
        }
        Update: {
          alias?: string
          confidence?: number | null
          created_at?: string
          entity_id?: string
          id?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_aliases_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_aliases_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "intelligence_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_match_candidates: {
        Row: {
          confidence: number | null
          created_at: string
          decided_by: string | null
          entity_a_id: string
          entity_b_id: string
          id: string
          investigation_id: string
          reason: string | null
          status: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          decided_by?: string | null
          entity_a_id: string
          entity_b_id: string
          id?: string
          investigation_id: string
          reason?: string | null
          status?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          decided_by?: string | null
          entity_a_id?: string
          entity_b_id?: string
          id?: string
          investigation_id?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_match_candidates_entity_a_id_fkey"
            columns: ["entity_a_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_match_candidates_entity_b_id_fkey"
            columns: ["entity_b_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_match_candidates_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          entity_id: string
          event_id: string
          id: string
          role: string | null
        }
        Insert: {
          entity_id: string
          event_id: string
          id?: string
          role?: string | null
        }
        Update: {
          entity_id?: string
          event_id?: string
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          confidence: number | null
          created_at: string
          dedupe_key: string | null
          description: string | null
          event_time: string | null
          event_time_text: string | null
          event_type: string | null
          id: string
          investigation_id: string
          location_text: string | null
          title: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          dedupe_key?: string | null
          description?: string | null
          event_time?: string | null
          event_time_text?: string | null
          event_type?: string | null
          id?: string
          investigation_id: string
          location_text?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          dedupe_key?: string | null
          description?: string | null
          event_time?: string | null
          event_time_text?: string | null
          event_type?: string | null
          id?: string
          investigation_id?: string
          location_text?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          confidence: number | null
          created_at: string
          dedupe_key: string | null
          entity_id: string | null
          event_id: string | null
          evidence_text: string | null
          evidence_type: string
          finding_id: string | null
          id: string
          investigation_id: string
          location_reference: string | null
          metadata: Json
          page_number: number | null
          pattern_id: string | null
          relationship_id: string | null
          source_id: string | null
          timestamp_seconds: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          event_id?: string | null
          evidence_text?: string | null
          evidence_type: string
          finding_id?: string | null
          id?: string
          investigation_id: string
          location_reference?: string | null
          metadata?: Json
          page_number?: number | null
          pattern_id?: string | null
          relationship_id?: string | null
          source_id?: string | null
          timestamp_seconds?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          event_id?: string | null
          evidence_text?: string | null
          evidence_type?: string
          finding_id?: string | null
          id?: string
          investigation_id?: string
          location_reference?: string | null
          metadata?: Json
          page_number?: number | null
          pattern_id?: string | null
          relationship_id?: string | null
          source_id?: string | null
          timestamp_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "intelligence_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_evidence: {
        Row: {
          evidence_id: string
          finding_id: string
          id: string
        }
        Insert: {
          evidence_id: string
          finding_id: string
          id?: string
        }
        Update: {
          evidence_id?: string
          finding_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finding_evidence_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_evidence_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          confidence: number | null
          created_at: string
          dedupe_key: string | null
          detection_reason: string | null
          facts: Json
          id: string
          inference: Json
          investigation_id: string
          pattern_id: string | null
          risk_level: string | null
          status: string
          summary: string | null
          title: string
          uncertainty: Json
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          dedupe_key?: string | null
          detection_reason?: string | null
          facts?: Json
          id?: string
          inference?: Json
          investigation_id: string
          pattern_id?: string | null
          risk_level?: string | null
          status?: string
          summary?: string | null
          title: string
          uncertainty?: Json
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          dedupe_key?: string | null
          detection_reason?: string | null
          facts?: Json
          id?: string
          inference?: Json
          investigation_id?: string
          pattern_id?: string | null
          risk_level?: string | null
          status?: string
          summary?: string | null
          title?: string
          uncertainty?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_sources: {
        Row: {
          content_hash: string | null
          created_at: string
          created_by: string
          file_size: number | null
          id: string
          investigation_id: string
          metadata: Json
          mime_type: string | null
          normalized_content: string | null
          normalized_language: string | null
          original_content: string | null
          original_filename: string | null
          original_language: string | null
          processing_error: string | null
          processing_status: string
          source_type: string
          storage_bucket: string | null
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          created_by: string
          file_size?: number | null
          id?: string
          investigation_id: string
          metadata?: Json
          mime_type?: string | null
          normalized_content?: string | null
          normalized_language?: string | null
          original_content?: string | null
          original_filename?: string | null
          original_language?: string | null
          processing_error?: string | null
          processing_status?: string
          source_type: string
          storage_bucket?: string | null
          storage_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          created_by?: string
          file_size?: number | null
          id?: string
          investigation_id?: string
          metadata?: Json
          mime_type?: string | null
          normalized_content?: string | null
          normalized_language?: string | null
          original_content?: string | null
          original_filename?: string | null
          original_language?: string | null
          processing_error?: string | null
          processing_status?: string
          source_type?: string
          storage_bucket?: string | null
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_sources_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      investigation_members: {
        Row: {
          created_at: string
          id: string
          investigation_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          investigation_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          investigation_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investigation_members_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      investigations: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          priority: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pattern_entities: {
        Row: {
          entity_id: string
          id: string
          pattern_id: string
        }
        Insert: {
          entity_id: string
          id?: string
          pattern_id: string
        }
        Update: {
          entity_id?: string
          id?: string
          pattern_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_entities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pattern_entities_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      pattern_events: {
        Row: {
          event_id: string
          id: string
          pattern_id: string
        }
        Insert: {
          event_id: string
          id?: string
          pattern_id: string
        }
        Update: {
          event_id?: string
          id?: string
          pattern_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pattern_events_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      pattern_relationships: {
        Row: {
          id: string
          pattern_id: string
          relationship_id: string
        }
        Insert: {
          id?: string
          pattern_id: string
          relationship_id: string
        }
        Update: {
          id?: string
          pattern_id?: string
          relationship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_relationships_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pattern_relationships_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      patterns: {
        Row: {
          confidence: number | null
          created_at: string
          dedupe_key: string | null
          description: string | null
          evidence_count: number
          id: string
          investigation_id: string
          pattern_type: string | null
          risk_level: string | null
          source_count: number
          title: string
          uncertainty: string | null
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          dedupe_key?: string | null
          description?: string | null
          evidence_count?: number
          id?: string
          investigation_id: string
          pattern_type?: string | null
          risk_level?: string | null
          source_count?: number
          title: string
          uncertainty?: string | null
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          dedupe_key?: string | null
          description?: string | null
          evidence_count?: number
          id?: string
          investigation_id?: string
          pattern_type?: string | null
          risk_level?: string | null
          source_count?: number
          title?: string
          uncertainty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patterns_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      relationships: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          investigation_id: string
          relationship_type: string
          source_entity_id: string
          target_entity_id: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          investigation_id: string
          relationship_type: string
          source_entity_id: string
          target_entity_id: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          investigation_id?: string
          relationship_type?: string
          source_entity_id?: string
          target_entity_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_source_entity_id_fkey"
            columns: ["source_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_target_entity_id_fkey"
            columns: ["target_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      source_processing_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          external_job_id: string | null
          id: string
          job_type: string
          provider: string
          request_metadata: Json
          response_metadata: Json
          source_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          external_job_id?: string | null
          id?: string
          job_type: string
          provider: string
          request_metadata?: Json
          response_metadata?: Json
          source_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          external_job_id?: string | null
          id?: string
          job_type?: string
          provider?: string
          request_metadata?: Json
          response_metadata?: Json
          source_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_processing_jobs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "intelligence_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_segments: {
        Row: {
          created_at: string
          end_time: number | null
          id: string
          metadata: Json
          speaker_label: string | null
          start_time: number | null
          text: string | null
          transcript_id: string
        }
        Insert: {
          created_at?: string
          end_time?: number | null
          id?: string
          metadata?: Json
          speaker_label?: string | null
          start_time?: number | null
          text?: string | null
          transcript_id: string
        }
        Update: {
          created_at?: string
          end_time?: number | null
          id?: string
          metadata?: Json
          speaker_label?: string | null
          start_time?: number | null
          text?: string | null
          transcript_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_segments_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "audio_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_frames: {
        Row: {
          analysis_status: string
          created_at: string
          frame_index: number | null
          id: string
          source_id: string
          storage_bucket: string | null
          storage_path: string | null
          timestamp_seconds: number
        }
        Insert: {
          analysis_status?: string
          created_at?: string
          frame_index?: number | null
          id?: string
          source_id: string
          storage_bucket?: string | null
          storage_path?: string | null
          timestamp_seconds: number
        }
        Update: {
          analysis_status?: string
          created_at?: string
          frame_index?: number | null
          id?: string
          source_id?: string
          storage_bucket?: string | null
          storage_path?: string | null
          timestamp_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_frames_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "intelligence_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_observations: {
        Row: {
          confidence: number | null
          created_at: string
          frame_id: string
          id: string
          metadata: Json
          observation_text: string
          observation_type: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          frame_id: string
          id?: string
          metadata?: Json
          observation_text: string
          observation_type?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          frame_id?: string
          id?: string
          metadata?: Json
          observation_text?: string
          observation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "visual_observations_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "video_frames"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_investigation: {
        Args: { _investigation_id: string }
        Returns: boolean
      }
      can_access_source: { Args: { _source_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "analyst" | "admin"
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
    Enums: {
      app_role: ["analyst", "admin"],
    },
  },
} as const
