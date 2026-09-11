-- ============ ENUMS & HELPERS ============
CREATE TYPE public.app_role AS ENUM ('analyst','admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'analyst')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ INVESTIGATIONS ============
CREATE TABLE public.investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','monitoring','closed','archived')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_investigations_created_by ON public.investigations(created_by);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investigations TO authenticated;
GRANT ALL ON public.investigations TO service_role;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.investigation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'analyst',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, user_id)
);
CREATE INDEX idx_inv_members_user ON public.investigation_members(user_id);
GRANT SELECT, INSERT, DELETE ON public.investigation_members TO authenticated;
GRANT ALL ON public.investigation_members TO service_role;
ALTER TABLE public.investigation_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_investigation(_investigation_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.investigations i
    WHERE i.id = _investigation_id
      AND (i.created_by = auth.uid()
           OR public.has_role(auth.uid(),'admin')
           OR EXISTS (SELECT 1 FROM public.investigation_members m
                      WHERE m.investigation_id = i.id AND m.user_id = auth.uid()))
  )
$$;

-- ============ SOURCES ============
CREATE TABLE public.intelligence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf','image','audio','video','text','log','csv','json')),
  mime_type TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  original_filename TEXT,
  file_size BIGINT,
  original_language TEXT,
  normalized_language TEXT,
  original_content TEXT,
  normalized_content TEXT,
  processing_status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (processing_status IN ('uploaded','queued','processing','processed','partially_processed','failed')),
  processing_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  content_hash TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, content_hash)
);
CREATE INDEX idx_sources_inv ON public.intelligence_sources(investigation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_sources TO authenticated;
GRANT ALL ON public.intelligence_sources TO service_role;
ALTER TABLE public.intelligence_sources ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_source(_source_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.intelligence_sources s
    WHERE s.id = _source_id AND public.can_access_investigation(s.investigation_id)
  )
$$;

CREATE TABLE public.source_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.intelligence_sources(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  job_type TEXT NOT NULL,
  external_job_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','partially_completed','failed')),
  request_metadata JSONB NOT NULL DEFAULT '{}',
  response_metadata JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_source ON public.source_processing_jobs(source_id);
GRANT SELECT, INSERT, UPDATE ON public.source_processing_jobs TO authenticated;
GRANT ALL ON public.source_processing_jobs TO service_role;
ALTER TABLE public.source_processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.document_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.intelligence_sources(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  extracted_content TEXT,
  structured_content JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, page_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_pages TO authenticated;
GRANT ALL ON public.document_pages TO service_role;
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audio_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.intelligence_sources(id) ON DELETE CASCADE,
  language TEXT,
  transcript TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transcripts_source ON public.audio_transcripts(source_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_transcripts TO authenticated;
GRANT ALL ON public.audio_transcripts TO service_role;
ALTER TABLE public.audio_transcripts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.audio_transcripts(id) ON DELETE CASCADE,
  speaker_label TEXT,
  start_time NUMERIC,
  end_time NUMERIC,
  text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_segments_transcript ON public.transcript_segments(transcript_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transcript_segments TO authenticated;
GRANT ALL ON public.transcript_segments TO service_role;
ALTER TABLE public.transcript_segments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.video_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.intelligence_sources(id) ON DELETE CASCADE,
  timestamp_seconds NUMERIC NOT NULL,
  storage_bucket TEXT,
  storage_path TEXT,
  frame_index INTEGER,
  analysis_status TEXT NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending','processing','analyzed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, frame_index)
);
CREATE INDEX idx_frames_source ON public.video_frames(source_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_frames TO authenticated;
GRANT ALL ON public.video_frames TO service_role;
ALTER TABLE public.video_frames ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.visual_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frame_id UUID NOT NULL REFERENCES public.video_frames(id) ON DELETE CASCADE,
  observation_type TEXT NOT NULL DEFAULT 'visual',
  observation_text TEXT NOT NULL,
  confidence NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visobs_frame ON public.visual_observations(frame_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visual_observations TO authenticated;
GRANT ALL ON public.visual_observations TO service_role;
ALTER TABLE public.visual_observations ENABLE ROW LEVEL SECURITY;

-- ============ COMMON INTELLIGENCE MODEL ============
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person','organization','location','vehicle','device','ip_address','domain','email','phone','account','malware','threat_actor','other')),
  description TEXT,
  confidence NUMERIC,
  risk_score NUMERIC,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, entity_type, normalized_name)
);
CREATE INDEX idx_entities_inv ON public.entities(investigation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entities TO authenticated;
GRANT ALL ON public.entities TO service_role;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.entity_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source_id UUID REFERENCES public.intelligence_sources(id) ON DELETE SET NULL,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, alias)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_aliases TO authenticated;
GRANT ALL ON public.entity_aliases TO service_role;
ALTER TABLE public.entity_aliases ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.entity_match_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  entity_a_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  entity_b_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  confidence NUMERIC,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'possible_match' CHECK (status IN ('possible_match','merged','separate','uncertain')),
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_a_id, entity_b_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_match_candidates TO authenticated;
GRANT ALL ON public.entity_match_candidates TO service_role;
ALTER TABLE public.entity_match_candidates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  event_time TIMESTAMPTZ,
  event_time_text TEXT,
  location_text TEXT,
  confidence NUMERIC,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, dedupe_key)
);
CREATE INDEX idx_events_inv ON public.events(investigation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  role TEXT,
  UNIQUE (event_id, entity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_participants TO authenticated;
GRANT ALL ON public.event_participants TO service_role;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_entity_id, target_entity_id, relationship_type)
);
CREATE INDEX idx_rel_inv ON public.relationships(investigation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relationships TO authenticated;
GRANT ALL ON public.relationships TO service_role;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pattern_type TEXT,
  risk_level TEXT CHECK (risk_level IN ('critical','high','medium','low','informational')),
  confidence NUMERIC,
  uncertainty TEXT,
  source_count INTEGER NOT NULL DEFAULT 0,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, dedupe_key)
);
CREATE INDEX idx_patterns_inv ON public.patterns(investigation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patterns TO authenticated;
GRANT ALL ON public.patterns TO service_role;
ALTER TABLE public.patterns ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pattern_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES public.patterns(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  UNIQUE (pattern_id, entity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pattern_entities TO authenticated;
GRANT ALL ON public.pattern_entities TO service_role;
ALTER TABLE public.pattern_entities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pattern_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES public.patterns(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  UNIQUE (pattern_id, event_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pattern_events TO authenticated;
GRANT ALL ON public.pattern_events TO service_role;
ALTER TABLE public.pattern_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pattern_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES public.patterns(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  UNIQUE (pattern_id, relationship_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pattern_relationships TO authenticated;
GRANT ALL ON public.pattern_relationships TO service_role;
ALTER TABLE public.pattern_relationships ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  detection_reason TEXT,
  risk_level TEXT CHECK (risk_level IN ('critical','high','medium','low','informational')),
  confidence NUMERIC,
  facts JSONB NOT NULL DEFAULT '[]',
  inference JSONB NOT NULL DEFAULT '[]',
  uncertainty JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('draft','pending_review','approved','rejected','needs_further_investigation')),
  pattern_id UUID REFERENCES public.patterns(id) ON DELETE SET NULL,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, dedupe_key)
);
CREATE INDEX idx_findings_inv ON public.findings(investigation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.findings TO authenticated;
GRANT ALL ON public.findings TO service_role;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.intelligence_sources(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES public.relationships(id) ON DELETE CASCADE,
  pattern_id UUID REFERENCES public.patterns(id) ON DELETE CASCADE,
  finding_id UUID REFERENCES public.findings(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL,
  evidence_text TEXT,
  location_reference TEXT,
  page_number INTEGER,
  timestamp_seconds NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, dedupe_key)
);
CREATE INDEX idx_evidence_inv ON public.evidence(investigation_id);
CREATE INDEX idx_evidence_entity ON public.evidence(entity_id);
CREATE INDEX idx_evidence_event ON public.evidence(event_id);
CREATE INDEX idx_evidence_rel ON public.evidence(relationship_id);
CREATE INDEX idx_evidence_pattern ON public.evidence(pattern_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence TO authenticated;
GRANT ALL ON public.evidence TO service_role;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.finding_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID NOT NULL REFERENCES public.findings(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES public.evidence(id) ON DELETE CASCADE,
  UNIQUE (finding_id, evidence_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finding_evidence TO authenticated;
GRANT ALL ON public.finding_evidence TO service_role;
ALTER TABLE public.finding_evidence ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.analyst_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID NOT NULL REFERENCES public.findings(id) ON DELETE CASCADE,
  analyst_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected','needs_further_investigation','note')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_finding ON public.analyst_reviews(finding_id);
GRANT SELECT, INSERT ON public.analyst_reviews TO authenticated;
GRANT ALL ON public.analyst_reviews TO service_role;
ALTER TABLE public.analyst_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','partially_completed','failed')),
  sources_processed INTEGER NOT NULL DEFAULT 0,
  entities_found INTEGER NOT NULL DEFAULT 0,
  events_found INTEGER NOT NULL DEFAULT 0,
  relationships_found INTEGER NOT NULL DEFAULT 0,
  patterns_found INTEGER NOT NULL DEFAULT 0,
  findings_found INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_runs_inv ON public.analysis_runs(investigation_id);
GRANT SELECT, INSERT, UPDATE ON public.analysis_runs TO authenticated;
GRANT ALL ON public.analysis_runs TO service_role;
ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;

-- ============ TRIGGERS ============
CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_inv_upd BEFORE UPDATE ON public.investigations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_src_upd BEFORE UPDATE ON public.intelligence_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_ent_upd BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_evt_upd BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_rel_upd BEFORE UPDATE ON public.relationships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_pat_upd BEFORE UPDATE ON public.patterns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_fnd_upd BEFORE UPDATE ON public.findings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ POLICIES ============
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "inv select" ON public.investigations FOR SELECT TO authenticated
  USING (public.can_access_investigation(id));
CREATE POLICY "inv insert" ON public.investigations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "inv update" ON public.investigations FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "inv delete" ON public.investigations FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "members select" ON public.investigation_members FOR SELECT TO authenticated
  USING (public.can_access_investigation(investigation_id));
CREATE POLICY "members insert" ON public.investigation_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.investigations i WHERE i.id = investigation_id
    AND (i.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "members delete" ON public.investigation_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.investigations i WHERE i.id = investigation_id
    AND (i.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE POLICY "src all" ON public.intelligence_sources FOR ALL TO authenticated
  USING (public.can_access_investigation(investigation_id))
  WITH CHECK (public.can_access_investigation(investigation_id));
CREATE POLICY "jobs all" ON public.source_processing_jobs FOR ALL TO authenticated
  USING (public.can_access_source(source_id)) WITH CHECK (public.can_access_source(source_id));
CREATE POLICY "pages all" ON public.document_pages FOR ALL TO authenticated
  USING (public.can_access_source(source_id)) WITH CHECK (public.can_access_source(source_id));
CREATE POLICY "transcripts all" ON public.audio_transcripts FOR ALL TO authenticated
  USING (public.can_access_source(source_id)) WITH CHECK (public.can_access_source(source_id));
CREATE POLICY "segments all" ON public.transcript_segments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.audio_transcripts t WHERE t.id = transcript_id AND public.can_access_source(t.source_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.audio_transcripts t WHERE t.id = transcript_id AND public.can_access_source(t.source_id)));
CREATE POLICY "frames all" ON public.video_frames FOR ALL TO authenticated
  USING (public.can_access_source(source_id)) WITH CHECK (public.can_access_source(source_id));
CREATE POLICY "visobs all" ON public.visual_observations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.video_frames f WHERE f.id = frame_id AND public.can_access_source(f.source_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.video_frames f WHERE f.id = frame_id AND public.can_access_source(f.source_id)));

CREATE POLICY "entities all" ON public.entities FOR ALL TO authenticated
  USING (public.can_access_investigation(investigation_id)) WITH CHECK (public.can_access_investigation(investigation_id));
CREATE POLICY "aliases all" ON public.entity_aliases FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.entities e WHERE e.id = entity_id AND public.can_access_investigation(e.investigation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.entities e WHERE e.id = entity_id AND public.can_access_investigation(e.investigation_id)));
CREATE POLICY "matches all" ON public.entity_match_candidates FOR ALL TO authenticated
  USING (public.can_access_investigation(investigation_id)) WITH CHECK (public.can_access_investigation(investigation_id));
CREATE POLICY "events all" ON public.events FOR ALL TO authenticated
  USING (public.can_access_investigation(investigation_id)) WITH CHECK (public.can_access_investigation(investigation_id));
CREATE POLICY "participants all" ON public.event_participants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.can_access_investigation(e.investigation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.can_access_investigation(e.investigation_id)));
CREATE POLICY "rel all" ON public.relationships FOR ALL TO authenticated
  USING (public.can_access_investigation(investigation_id)) WITH CHECK (public.can_access_investigation(investigation_id));
CREATE POLICY "patterns all" ON public.patterns FOR ALL TO authenticated
  USING (public.can_access_investigation(investigation_id)) WITH CHECK (public.can_access_investigation(investigation_id));
CREATE POLICY "pat_ent all" ON public.pattern_entities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patterns p WHERE p.id = pattern_id AND public.can_access_investigation(p.investigation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.patterns p WHERE p.id = pattern_id AND public.can_access_investigation(p.investigation_id)));
CREATE POLICY "pat_evt all" ON public.pattern_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patterns p WHERE p.id = pattern_id AND public.can_access_investigation(p.investigation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.patterns p WHERE p.id = pattern_id AND public.can_access_investigation(p.investigation_id)));
CREATE POLICY "pat_rel all" ON public.pattern_relationships FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patterns p WHERE p.id = pattern_id AND public.can_access_investigation(p.investigation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.patterns p WHERE p.id = pattern_id AND public.can_access_investigation(p.investigation_id)));
CREATE POLICY "findings all" ON public.findings FOR ALL TO authenticated
  USING (public.can_access_investigation(investigation_id)) WITH CHECK (public.can_access_investigation(investigation_id));
CREATE POLICY "evidence all" ON public.evidence FOR ALL TO authenticated
  USING (public.can_access_investigation(investigation_id)) WITH CHECK (public.can_access_investigation(investigation_id));
CREATE POLICY "fnd_evd all" ON public.finding_evidence FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.findings f WHERE f.id = finding_id AND public.can_access_investigation(f.investigation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.findings f WHERE f.id = finding_id AND public.can_access_investigation(f.investigation_id)));
CREATE POLICY "reviews select" ON public.analyst_reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.findings f WHERE f.id = finding_id AND public.can_access_investigation(f.investigation_id)));
CREATE POLICY "reviews insert" ON public.analyst_reviews FOR INSERT TO authenticated
  WITH CHECK (analyst_id = auth.uid() AND EXISTS (SELECT 1 FROM public.findings f WHERE f.id = finding_id AND public.can_access_investigation(f.investigation_id)));
CREATE POLICY "runs all" ON public.analysis_runs FOR ALL TO authenticated
  USING (public.can_access_investigation(investigation_id)) WITH CHECK (public.can_access_investigation(investigation_id));

-- ============ STORAGE POLICIES ============
CREATE POLICY "sahayak storage read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('intelligence-sources','video-derived','analysis-artifacts')
    AND public.can_access_investigation(((storage.foldername(name))[1])::uuid));
CREATE POLICY "sahayak storage insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('intelligence-sources','video-derived','analysis-artifacts')
    AND public.can_access_investigation(((storage.foldername(name))[1])::uuid));
CREATE POLICY "sahayak storage delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('intelligence-sources','video-derived','analysis-artifacts')
    AND public.can_access_investigation(((storage.foldername(name))[1])::uuid));