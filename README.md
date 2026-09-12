# Sahayak

Build a complete, production-ready full-stack application from SCRATCH.

PROJECT NAME:

SAHAYAK

PRODUCT:

SAHAYAK — Multimodal Intelligence Analysis Platform

TAGLINE:

From Fragmented Signals to Structured Intelligence

IMPORTANT:

This is a new project that must be built from scratch.

Do not build a demo-only UI.

Do not build a mock dashboard.

Do not use fake frontend-only data.

Do not seed demo/sample intelligence data.

Do not create unnecessary features that are not part of this specification.

The user will upload real data later.

The application must be fully functional with real Supabase persistence and real processing pipelines.

========================================================

1. CORE PRODUCT PURPOSE

========================================================

Build SAHAYAK as a multimodal intelligence analysis platform.

The platform allows an analyst/user to upload:

- PDF

- PNG

- JPG

- JPEG

- Audio / Voice

- Video

- Text

- Logs

The system processes these different source types and converts them into a common structured intelligence representation.

The application must then:

1. Extract entities.

2. Extract events.

3. Extract observations.

4. Discover relationships.

5. Correlate signals across multiple sources.

6. Detect potentially significant patterns and weak signals.

7. Build a connected knowledge graph.

8. Generate explainable findings.

9. Link every important finding back to supporting evidence.

10. Clearly distinguish facts, inference and uncertainty.

11. Keep the final decision with the human analyst.

The product must solve the underlying intelligence problem.

It must NOT be just:

- a document summarizer

- an image captioner

- a voice transcription app

- a video analyzer

- a chatbot

- a generic dashboard

The core pipeline is:

RAW MULTIMODAL SOURCES

        ↓

SOURCE-SPECIFIC AI PROCESSING

        ↓

STRUCTURED INTELLIGENCE

        ↓

ENTITIES + EVENTS + OBSERVATIONS

        ↓

RELATIONSHIPS

        ↓

CROSS-SOURCE CORRELATION

        ↓

WEAK SIGNAL / PATTERN DETECTION

        ↓

KNOWLEDGE GRAPH

        ↓

EXPLAINABLE FINDINGS

        ↓

EVIDENCE / PROVENANCE

        ↓

HUMAN ANALYST REVIEW

========================================================

2. TECHNOLOGY STACK

========================================================

Frontend:

- React

- TypeScript

- Vite

- Tailwind CSS

- shadcn/ui

- React Query or equivalent data-fetching layer

- Proper reusable component architecture

Backend:

- Supabase PostgreSQL

- Supabase Authentication

- Supabase Storage

- Supabase Edge Functions

- Supabase Row Level Security

Use Supabase as the only primary application backend.

Do not introduce another database.

Third-party AI:

SARVAM AI

Use Sarvam Document AI for:

- PDF

- PNG

- JPG

- JPEG

Use Sarvam Speech-to-Text for:

- Audio

- Voice

- Extracted audio from video

For video:

- extract audio server-side

- send extracted audio to Sarvam Speech-to-Text

- sample video frames

- analyze frames with an appropriate vision-capable AI service available through secure server-side configuration

- use OCR on frames where appropriate

- combine visual and audio intelligence into one timestamped representation

All third-party API keys must remain server-side.

Never expose Sarvam API keys or other AI secrets in client-side code.

========================================================

3. APPLICATION ARCHITECTURE

========================================================

Build this architecture:

CLIENT

   ↓

SUPABASE AUTH

   ↓

SUPABASE DATABASE / STORAGE

   ↓

SUPABASE EDGE FUNCTIONS

   ↓

SOURCE-SPECIFIC PROCESSORS

   ├── Sarvam Document AI

   ├── Sarvam Speech-to-Text

   ├── Video preprocessing

   └── Vision/OCR processing

   ↓

NORMALIZATION LAYER

   ↓

INTELLIGENCE EXTRACTION

   ↓

ENTITY / EVENT / RELATIONSHIP ENGINE

   ↓

CROSS-SOURCE CORRELATION

   ↓

PATTERN DETECTION

   ↓

FINDING GENERATION

   ↓

EVIDENCE LINKING

   ↓

ANALYST REVIEW

   ↓

SUPABASE PERSISTENCE

========================================================

4. AUTHENTICATION

========================================================

Implement Supabase Authentication.

Support:

- Sign up

- Sign in

- Sign out

- Forgot password

- Session persistence

- Protected routes

Roles:

ANALYST

ADMIN

Analyst:

- create investigations

- upload sources

- process sources

- run analysis

- view entities

- view events

- view relationships

- view knowledge graph

- view findings

- review findings

- add notes

- approve/reject/request investigation

Admin:

- access all authorized data

- manage users/roles

- inspect platform activity

Use secure role management.

Do not rely only on client-side role checks.

========================================================

5. APPLICATION UI

========================================================

Design SAHAYAK as a cinematic, premium, modern intelligence platform.

Visual style:

- dark black / dark navy background

- restrained violet/purple accents

- subtle blue highlights

- glass panels

- subtle borders

- soft shadows

- very light grid/signal texture

- minimal motion

- clean typography

The interface must look advanced but remain simple.

Do not overload users with:

- too many menus

- too many tabs

- too many cards

- excessive animations

- complicated settings

- unnecessary controls

Main navigation:

Dashboard

Investigations

Findings

Reports

Settings

Knowledge Graph and source intelligence should primarily be accessed inside an Investigation Workspace.

========================================================

6. DASHBOARD

========================================================

Create a useful intelligence dashboard.

Show actual database-backed metrics:

- Active investigations

- Sources processed

- Entities identified

- Events identified

- Patterns detected

- Findings awaiting review

Show:

Recent Intelligence Activity

Priority Findings

Recent Analysis Runs

The dashboard must remain simple.

No fake numbers.

No static demo content.

========================================================

7. INVESTIGATIONS

========================================================

Create investigation management.

Actions:

- Create

- Open

- Edit

- Archive

Fields:

- title

- description

- priority

- status

- tags

- created_by

- created_at

- updated_at

Priority:

Critical

High

Medium

Low

Status:

Active

Monitoring

Closed

Archived

Each investigation should show real counts for:

- sources

- entities

- events

- relationships

- findings

========================================================

8. INVESTIGATION WORKSPACE

========================================================

Each investigation should have four primary areas:

1. Overview

2. Intelligence

3. Graph

4. Findings

Keep navigation simple.

========================================================

9. OVERVIEW

========================================================

Show:

- investigation summary

- recent source activity

- key entities

- recent events

- important relationships

- detected patterns

- latest findings

- analysis status

Actions:

Upload Intelligence

Run Analysis

Open Graph

Review Findings

========================================================

10. MULTIMODAL UPLOAD

========================================================

Create a real upload system backed by Supabase Storage.

Support:

PDF

PNG

JPG

JPEG

Audio

Video

TXT

CSV

JSON

Logs

Also support manual text input.

Support multi-file upload.

Show upload progress.

After upload:

1. store original file in Supabase Storage

2. create source database record

3. detect source type

4. store metadata

5. create processing job

6. show processing status

Statuses:

Uploaded

Queued

Processing

Processed

Partially Processed

Failed

Never lose the original uploaded file.

========================================================

11. SOURCE STORAGE

========================================================

Use Supabase Storage with private buckets.

Recommended logical buckets:

intelligence-sources

video-derived

analysis-artifacts

Do not expose sensitive storage publicly.

Use signed URLs when needed.

Enforce Storage access using appropriate RLS/storage policies.

========================================================

12. PDF / PNG / JPG / JPEG PROCESSING

========================================================

Use Sarvam Document AI.

Processing flow:

UPLOAD

↓

SUPABASE STORAGE

↓

EDGE FUNCTION

↓

SARVAM DOCUMENT AI

↓

STRUCTURED OUTPUT

↓

SOURCE RECORD

↓

INTELLIGENCE EXTRACTION

↓

DATABASE

Use current Sarvam Document AI APIs.

Prefer structured JSON output where useful for machine processing.

Preserve:

- original document

- original page order

- extracted content

- page number

- block/section information where available

- bounding boxes where available

- metadata

Never overwrite original source content.

IMPORTANT:

Sarvam Document AI currently has a 10-page maximum per PDF/ZIP job.

If uploaded PDF contains more than the supported limit:

1. detect page count

2. split into chunks of supported size

3. process chunks

4. preserve original page numbering

5. merge results

6. preserve provenance to original source

Do not silently fail large documents.

========================================================

13. IMAGE PROCESSING

========================================================

For PNG/JPG/JPEG document or image inputs:

Use Sarvam Document AI where the source is document/page-oriented.

Extract:

- visible text

- document content

- structured fields where appropriate

- layout information where available

Preserve original image.

Do not invent objects, identities or facts.

For relevant visual interpretation beyond document extraction, use a secure vision-capable AI processing stage where available.

Store:

- original image

- extracted text

- structured observations

- entities

- events

- evidence references

========================================================

14. AUDIO / VOICE PROCESSING

========================================================

Use Sarvam Speech-to-Text.

Processing flow:

AUDIO

↓

SUPABASE STORAGE

↓

EDGE FUNCTION

↓

SARVAM SPEECH-TO-TEXT

↓

TRANSCRIPT

↓

LANGUAGE

↓

TIMESTAMPS / SPEAKER INFORMATION WHERE AVAILABLE

↓

INTELLIGENCE EXTRACTION

Preserve original audio.

Store:

- transcript

- language

- transcript segments

- timestamps

- speaker labels where available

- source references

If speaker diarization is available, preserve speaker labels.

Do not claim that speaker_1 is a known person unless evidence establishes that relationship.

Transcript must continue into:

Entities

Events

Relationships

Evidence

Do not stop at transcription.

========================================================

15. VIDEO PROCESSING

========================================================

Video is a first-class source type.

The application must support video upload.

Store the original video in Supabase Storage.

Process video server-side.

Pipeline:

VIDEO

 ↓

AUDIO EXTRACTION

 ↓

SARVAM SPEECH-TO-TEXT

 ↓

VIDEO FRAME SAMPLING

 ↓

VISION ANALYSIS

 ↓

OCR WHERE APPROPRIATE

 ↓

TIMESTAMP ALIGNMENT

 ↓

MULTIMODAL FUSION

 ↓

STRUCTURED INTELLIGENCE

Do not send every frame blindly to an AI model.

Use practical sampling such as:

- fixed interval sampling

- keyframes

- scene-change-aware sampling where feasible

For each sampled frame preserve:

- video source

- frame timestamp

- frame reference

- extracted observations

- OCR output where available

For audio preserve:

- transcript

- timestamp

- speaker data where available

Then create a unified video timeline.

Example:

00:31

Visual observation

00:47

Person/entity appears

01:12

Transcript segment

01:35

Visible text

01:48

Another event

Do not infer intent from appearance alone.

Do not invent identities.

========================================================

16. TEXT / LOG PROCESSING

========================================================

Support:

TXT

CSV

JSON

structured logs

manual text

For logs:

preserve:

- timestamp

- log line

- event type

- IP

- domain

- device

- relevant identifiers

Normalize timestamps where possible without losing the original representation.

Link extracted entities/events back to exact source location or log line.

========================================================

17. MULTILINGUAL PROCESSING

========================================================

The application must support multilingual intelligence.

For each source:

- detect language where possible

- preserve original language

- preserve original content

- optionally generate normalized/translated representation

- never overwrite original content

Store both:

ORIGINAL

and

NORMALIZED / TRANSLATED

When translated content is used for analysis, retain provenance to the original content.

========================================================

18. COMMON INTELLIGENCE SCHEMA

========================================================

Every source type must ultimately feed a common intelligence model.

Core concepts:

SOURCE

ENTITY

EVENT

OBSERVATION

RELATIONSHIP

PATTERN

EVIDENCE

FINDING

Example:

Source

↓

Entities

↓

Events

↓

Observations

↓

Relationships

↓

Patterns

↓

Findings

↓

Evidence

This common schema is mandatory because the system must correlate information across different modalities.

========================================================

19. ENTITY EXTRACTION

========================================================

Extract entities where supported by evidence:

- Person

- Organization

- Location

- Vehicle

- Device

- IP Address

- Domain

- Email

- Phone

- Account

- Malware

- Threat Actor

- Other

Each entity should include:

- id

- investigation_id

- name

- entity_type

- description

- confidence

- risk where applicable

- first_seen

- last_seen

Every entity must maintain source provenance.

========================================================

20. ENTITY RESOLUTION

========================================================

Detect possible references to the same entity.

Example:

John Smith

John A. Smith

J. Smith

The system should generate:

POSSIBLE MATCH

with:

- confidence

- reason

- supporting evidence

Potential reasons:

- similar name

- shared identifier

- shared email

- shared phone

- shared location

- shared organization

Do not automatically merge uncertain entities.

Analyst actions:

Merge

Keep Separate

Mark Uncertain

Preserve alias history.

========================================================

21. EVENT EXTRACTION

========================================================

Extract:

WHO

WHAT

WHEN

WHERE

Each event should support:

- title

- description

- event type

- participants

- timestamp

- location

- confidence

- evidence references

If a value is unavailable:

store NULL / UNKNOWN.

Do not hallucinate missing information.

========================================================

22. RELATIONSHIP DISCOVERY

========================================================

Discover relationships such as:

Communicated With

Associated With

Connected To

Located At

Used

Accessed

Observed At

Mentioned In

Linked Through

Each relationship must contain:

- source_entity_id

- target_entity_id

- relationship_type

- confidence

- evidence references

- source references

========================================================

23. CROSS-SOURCE CORRELATION

========================================================

This is a core feature.

Do not analyze sources independently and stop.

After source-level extraction, correlate the structured information across ALL sources within an investigation.

Compare:

- entities

- identifiers

- locations

- timestamps

- organizations

- vehicles

- devices

- communications

- infrastructure

- events

- observations

Examples:

Source A:

Person A

Source B:

Person A + Location X

Source C:

Vehicle ABC + Location X

Source D:

Person B + Vehicle ABC

The system should create a connected intelligence picture.

========================================================

24. WEAK SIGNAL CORRELATION

========================================================

Identify patterns that no single source independently establishes.

Examples:

- repeated communication

- shared infrastructure

- common location

- recurring entity appearance

- overlapping events

- repeated vehicle/device

- emerging cluster

- suspicious relationship network

- time-based anomaly

Each pattern must contain:

- title

- pattern type

- description

- entities

- events

- relationships

- source count

- evidence count

- confidence

- uncertainty

Do not treat correlation as proof.

Cross-source patterns should be clearly labeled as:

Potential Pattern

Analytical Inference

Requires Analyst Review

when appropriate.

========================================================

25. KNOWLEDGE GRAPH

========================================================

Build a real interactive knowledge graph based on persisted data.

Nodes:

- people

- organizations

- locations

- vehicles

- devices

- IPs

- accounts

- events

Edges:

- relationships

The graph must use actual database data.

Support:

- zoom

- pan

- search

- entity type filter

- risk filter

- confidence filter

When node clicked:

show:

- entity name

- type

- confidence

- risk

- connected entities

- events

- sources

- evidence

When edge clicked:

show:

- relationship

- source

- target

- confidence

- evidence

Graph must not be decorative.

========================================================

26. FINDINGS

========================================================

Generate explainable findings from patterns and evidence.

Each finding:

- title

- summary

- risk

- confidence

- facts

- inference

- uncertainty

- supporting entities

- supporting events

- supporting relationships

- supporting patterns

- evidence

Statuses:

Draft

Pending Review

Approved

Rejected

Needs Further Investigation

========================================================

27. FACTS / INFERENCE / UNCERTAINTY

========================================================

This distinction is mandatory.

FACT:

Directly supported by source evidence.

INFERENCE:

Analytical interpretation based on connected evidence.

UNCERTAINTY:

What is unknown, ambiguous or not established.

Example:

FACT:

Person A appears in three independent source records.

INFERENCE:

The cross-source relationship may indicate a connected activity pattern.

UNCERTAINTY:

Available evidence does not establish intent or coordination.

Never convert inference into fact.

========================================================

28. EVIDENCE / PROVENANCE

========================================================

Every important finding must have an evidence path.

Required chain:

FINDING

↓

PATTERN

↓

RELATIONSHIP

↓

ENTITY

↓

EVENT

↓

EVIDENCE

↓

ORIGINAL SOURCE

The user must be able to click through the chain.

Evidence must retain:

- source ID

- source type

- relevant content

- location reference

- page number where applicable

- timestamp where applicable

- video frame timestamp where applicable

- audio transcript timestamp where applicable

- log line where applicable

========================================================

29. EVIDENCE VIEWER

========================================================

When opening evidence:

For PDF:

show original document context and relevant page/passage.

For image:

show original image and relevant extracted evidence.

For audio:

show transcript with timestamp.

For video:

show relevant frame/timestamp plus transcript segment.

For logs:

show exact relevant log line.

For text:

show relevant text passage.

Always preserve original source.

========================================================

30. ANALYST REVIEW

========================================================

AI never has final authority.

Every important finding should be reviewable by an analyst.

Actions:

Approve

Reject

Request Further Investigation

Add Analyst Note

Persist:

- decision

- analyst_id

- finding_id

- note

- created_at

Show clear separation between:

AI-generated finding

and

Human analyst decision

========================================================

31. ANALYSIS RUN SYSTEM

========================================================

Create persistent analysis jobs/runs.

Each analysis run stores:

- investigation_id

- status

- started_at

- completed_at

- sources_processed

- entities_found

- events_found

- relationships_found

- patterns_found

- findings_found

- errors

Statuses:

Queued

Running

Completed

Partially Completed

Failed

Allow safe retry.

Repeated analysis should not create uncontrolled duplicates.

Use deterministic identifiers/content fingerprints where appropriate.

========================================================

32. IDEMPOTENCY / DUPLICATE HANDLING

========================================================

Repeated analysis of the same source should not endlessly duplicate:

- entities

- events

- relationships

- evidence

- findings

Use stable source identifiers/content hashes and sensible deduplication logic.

Do not destroy provenance during deduplication.

========================================================

33. DATABASE SCHEMA

========================================================

Create a normalized PostgreSQL schema in Supabase.

TABLE: profiles

- id UUID primary key references auth.users

- full_name

- email

- created_at

- updated_at

TABLE: user_roles

- id

- user_id

- role

- created_at

Allowed roles:

analyst

admin

TABLE: investigations

- id

- title

- description

- priority

- status

- tags

- created_by

- created_at

- updated_at

TABLE: investigation_members

- id

- investigation_id

- user_id

- role

- created_at

TABLE: intelligence_sources

- id

- investigation_id

- title

- source_type

- mime_type

- storage_path

- original_filename

- original_language

- normalized_language

- original_content

- normalized_content

- processing_status

- metadata JSONB

- content_hash

- created_by

- created_at

- updated_at

TABLE: source_processing_jobs

- id

- source_id

- provider

- job_type

- external_job_id

- status

- request_metadata JSONB

- response_metadata JSONB

- error_message

- started_at

- completed_at

- created_at

TABLE: document_pages

- id

- source_id

- page_number

- extracted_content

- structured_content JSONB

- metadata JSONB

- created_at

TABLE: audio_transcripts

- id

- source_id

- language

- transcript

- metadata JSONB

- created_at

TABLE: transcript_segments

- id

- transcript_id

- speaker_label

- start_time

- end_time

- text

- metadata JSONB

- created_at

TABLE: video_frames

- id

- source_id

- timestamp_seconds

- storage_path

- frame_index

- analysis_status

- created_at

TABLE: visual_observations

- id

- frame_id

- observation_type

- observation_text

- confidence

- metadata JSONB

- created_at

TABLE: entities

- id

- investigation_id

- name

- normalized_name

- entity_type

- description

- confidence

- risk_score

- first_seen

- last_seen

- created_at

- updated_at

TABLE: entity_aliases

- id

- entity_id

- alias

- source_id

- confidence

- created_at

TABLE: events

- id

- investigation_id

- title

- description

- event_type

- event_time

- location_text

- confidence

- created_at

- updated_at

TABLE: event_participants

- id

- event_id

- entity_id

- role

TABLE: relationships

- id

- investigation_id

- source_entity_id

- target_entity_id

- relationship_type

- confidence

- created_at

- updated_at

TABLE: evidence

- id

- investigation_id

- source_id

- entity_id

- event_id

- relationship_id

- pattern_id

- finding_id

- evidence_type

- evidence_text

- location_reference

- page_number

- timestamp_seconds

- metadata JSONB

- confidence

- created_at

TABLE: patterns

- id

- investigation_id

- title

- description

- pattern_type

- risk_level

- confidence

- uncertainty

- created_at

- updated_at

TABLE: pattern_entities

- id

- pattern_id

- entity_id

TABLE: pattern_events

- id

- pattern_id

- event_id

TABLE: pattern_relationships

- id

- pattern_id

- relationship_id

TABLE: findings

- id

- investigation_id

- title

- summary

- risk_level

- confidence

- facts JSONB

- inference JSONB

- uncertainty JSONB

- status

- created_at

- updated_at

TABLE: finding_evidence

- id

- finding_id

- evidence_id

TABLE: analyst_reviews

- id

- finding_id

- analyst_id

- decision

- notes

- created_at

TABLE: analysis_runs

- id

- investigation_id

- status

- sources_processed

- entities_found

- events_found

- relationships_found

- patterns_found

- findings_found

- error_summary

- started_at

- completed_at

- created_at

Use foreign keys and indexes.

========================================================

34. ROW LEVEL SECURITY

========================================================

Enable RLS on every application table exposed through Supabase.

Security model:

Authenticated users only.

Analysts can access investigations they created or are members of.

Analysts can access only sources/entities/events/relationships/patterns/findings associated with investigations they can access.

Admins can access all application data according to admin role.

Do not trust frontend role checks.

Implement authorization using secure SQL policies and server-side checks.

Protect storage objects using appropriate policies.

Do not expose private intelligence files publicly.

Supabase recommends combining Auth with RLS for row-level authorization; implement that model throughout the application.

========================================================

35. EDGE FUNCTIONS

========================================================

Create secure server-side Edge Functions for expensive and/or secret operations.

Required logical functions:

upload-source-metadata

process-document

process-audio

process-video

analyze-source

run-investigation-analysis

resolve-entities

discover-relationships

detect-patterns

generate-findings

link-evidence

review-finding

The exact number of functions can be adjusted if a cleaner secure architecture is preferable.

Do not expose Sarvam credentials to the browser.

Store provider credentials in Supabase secrets/environment variables.

========================================================

36. SARVAM DOCUMENT FLOW

========================================================

Implement:

source upload

↓

storage

↓

Edge Function

↓

Sarvam Document AI

↓

job tracking

↓

result retrieval

↓

structured extraction

↓

database

↓

entity/event extraction

↓

evidence linking

Handle:

- API failure

- rate limit

- timeout

- invalid input

- page limit

- partial processing

Do not silently discard errors.

========================================================

37. SARVAM SPEECH-TO-TEXT FLOW

========================================================

Implement:

audio upload

↓

storage

↓

Edge Function

↓

Sarvam Speech-to-Text

↓

transcript

↓

segments

↓

entities/events

↓

relationships

↓

evidence

Preserve timestamps and speaker information where returned.

========================================================

38. VIDEO PIPELINE

========================================================

Implement server-side video preprocessing.

Steps:

1. receive video

2. validate media

3. store original

4. extract audio

5. submit audio to Sarvam STT

6. sample frames

7. store relevant frames/derived artifacts

8. analyze frames

9. OCR visible text where appropriate

10. associate results with timestamps

11. merge audio + visual results

12. create entities/events/observations

13. attach evidence

14. continue investigation-level correlation

Do not modify the original video.

========================================================

39. AI OUTPUT CONTRACT

========================================================

AI processing must return structured machine-readable objects.

Do not save arbitrary unvalidated model text as core intelligence.

Validate outputs before persistence.

Required structured categories:

entities

events

observations

relationships

patterns

findings

evidence

If a field is unknown:

return null/unknown.

Do not guess.

========================================================

40. NO-HALLUCINATION REQUIREMENT

========================================================

The AI must not invent:

- identity

- person name

- location

- timestamp

- relationship

- threat

- intent

- evidence

when unsupported.

Every important claim must have supporting source evidence or be explicitly marked inference.

========================================================

41. FINDING EXPLANATION

========================================================

Every finding page must clearly show:

WHAT WAS FOUND

FACTS

INFERENCE

UNCERTAINTY

WHY THIS WAS DETECTED

SUPPORTING ENTITIES

SUPPORTING EVENTS

SUPPORTING RELATIONSHIPS

EVIDENCE JOURNEY

ANALYST REVIEW

The analyst should understand the finding without reading technical logs.

========================================================

42. EVIDENCE JOURNEY UI

========================================================

Build a visual evidence journey:

FINDING

   ↓

PATTERN

   ↓

RELATIONSHIPS

   ↓

ENTITIES

   ↓

EVENTS

   ↓

EVIDENCE

   ↓

ORIGINAL SOURCE

Each stage should be clickable.

This is a core feature, not decorative UI.

========================================================

43. GLOBAL SEARCH

========================================================

Provide database-backed search across:

- investigations

- sources

- entities

- events

- findings

Do not search only client-side loaded data.

========================================================

44. REPORTS

========================================================

Allow generating an investigation report from actual persisted data.

Report sections:

- Investigation Overview

- Sources

- Key Entities

- Events

- Relationships

- Patterns

- Findings

- Evidence

- Confidence

- Uncertainty

- Analyst Decisions

Do not include unsupported claims.

========================================================

45. ERROR HANDLING

========================================================

Handle:

- unsupported file types

- oversized files

- corrupt files

- API failure

- rate limits

- timeouts

- AI malformed output

- storage failure

- database failure

- partial analysis

- duplicate source

- missing evidence

Provide:

- loading states

- processing states

- failed states

- retry action

- success feedback

- useful error messages

Never silently fail.

========================================================

46. PERFORMANCE

========================================================

Use asynchronous processing for long-running media/AI tasks.

Do not block browser UI during analysis.

Use:

- job status tracking

- pagination

- indexed queries

- incremental graph loading where needed

- lazy loading for source content

Keep UI responsive during processing.

========================================================

47. EMPTY-STATE RULE

========================================================

There must be NO demo/seed intelligence data.

When a user first opens the application, show empty states.

Example:

NO INVESTIGATIONS YET

Create your first investigation to begin.

Another empty state:

NO INTELLIGENCE SOURCES

Upload a PDF, image, audio, video or log to begin analysis.

Do not fabricate sample findings.

========================================================

48. INITIAL APPLICATION EXPERIENCE

========================================================

Landing/login should be minimal.

Show:

SAHAYAK

From Fragmented Signals to Structured Intelligence

Then:

Sign In

Create Account

After login:

Dashboard

No demo investigation should automatically appear.

========================================================

49. NO EXTRA FEATURES

========================================================

Do NOT add unrelated features such as:

- chat assistant

- social features

- messaging

- notifications center beyond necessary status indicators

- unnecessary maps

- task management

- CRM functionality

- unrelated analytics

- e-commerce features

- excessive admin panels

Only build what is required for the intelligence workflow specified above.

========================================================

50. SECURITY REQUIREMENTS

========================================================

Implement:

- Supabase Auth

- RLS

- private Storage

- secure Edge Functions

- server-side secrets

- input validation

- file validation

- access-control checks

- secure signed file access where appropriate

Never expose:

- Sarvam API key

- privileged Supabase secret/service credentials

- internal backend secrets

in frontend code.

========================================================

51. PRODUCTION READINESS

========================================================

The application must be production-ready in architecture.

Use:

- type-safe code

- reusable services

- modular processing

- database constraints

- proper error handling

- logs for backend processing

- safe retries

- idempotency

- secure authorization

- responsive UI

Avoid throwaway prototype logic.

========================================================

52. BUILD ORDER

========================================================

Build in this exact order:

PHASE 1

Supabase setup

PHASE 2

Authentication and roles

PHASE 3

Database schema and RLS

PHASE 4

Storage

PHASE 5

Investigation management

PHASE 6

Multimodal upload

PHASE 7

Source processing job architecture

PHASE 8

Sarvam Document AI

PHASE 9

Sarvam Speech-to-Text

PHASE 10

Video processing

PHASE 11

Unified intelligence schema

PHASE 12

Entity extraction

PHASE 13

Event extraction

PHASE 14

Entity resolution

PHASE 15

Relationship discovery

PHASE 16

Cross-source correlation

PHASE 17

Weak signal detection

PHASE 18

Knowledge graph

PHASE 19

Evidence/provenance

PHASE 20

Explainable findings

PHASE 21

Analyst review

PHASE 22

Reports

PHASE 23

Full end-to-end testing

========================================================

53. ACCEPTANCE TEST

========================================================

Before considering the project complete, verify:

AUTH:

User can sign up, sign in, sign out.

INVESTIGATION:

User can create and open investigation.

PDF:

Upload PDF → Sarvam processing → extracted data persists.

PNG/JPG/JPEG:

Upload → processed → structured data persists.

AUDIO:

Upload → Sarvam STT → transcript → intelligence extraction.

VIDEO:

Upload → audio extraction → Sarvam STT → frame analysis → timestamped observations → structured intelligence.

TEXT/LOG:

Upload → parse → structured intelligence.

MULTI-SOURCE:

Multiple sources can be analyzed within one investigation.

ENTITY:

Entities are stored with provenance.

EVENT:

Events are stored with provenance.

RELATIONSHIP:

Relationships connect actual entities.

PATTERN:

Cross-source patterns are created from multiple supporting signals.

GRAPH:

Knowledge graph uses persisted relationships.

FINDING:

Finding contains Facts, Inference and Uncertainty.

PROVENANCE:

Finding can be traced to original evidence.

EVIDENCE:

Original file/context can be opened.

ANALYST:

Analyst can approve/reject/request further investigation.

PERSISTENCE:

Reloading the app preserves all data.

SECURITY:

Unauthorized user cannot access another investigation's private sources/data.

DUPLICATES:

Repeated analysis does not create uncontrolled duplicate records.

ERRORS:

Failed processing can be retried.

========================================================

54. FINAL PRODUCT DEFINITION

========================================================

SAHAYAK must ultimately provide this experience:

USER UPLOADS

PDF

IMAGE

AUDIO

VIDEO

TEXT

LOG

        ↓

SOURCE-SPECIFIC PROCESSING

Sarvam Document AI

Sarvam Speech-to-Text

Video Processing

Vision/OCR

Text/Log Parsing

        ↓

STRUCTURED INTELLIGENCE

ENTITIES

EVENTS

OBSERVATIONS

        ↓

RELATIONSHIP DISCOVERY

        ↓

CROSS-SOURCE CORRELATION

        ↓

WEAK SIGNAL DETECTION

        ↓

KNOWLEDGE GRAPH

        ↓

EXPLAINABLE FINDING

        ↓

FACTS

INFERENCE

UNCERTAINTY

        ↓

EVIDENCE JOURNEY

        ↓

ORIGINAL SOURCE

        ↓

HUMAN ANALYST DECISION

========================================================

FINAL INSTRUCTION

========================================================

Build SAHAYAK completely from scratch.

Use Supabase for:

- Authentication

- PostgreSQL database

- Storage

- Edge Functions

- Row Level Security

Use Sarvam for:

PDF / PNG / JPG / JPEG document intelligence

and

Audio / Voice speech-to-text.

For video:

extract audio → Sarvam STT

+

sampled frames → vision/OCR

+

timestamped multimodal fusion.

Do not create demo data.

Do not create fake findings.

Do not stop at UI.

Do not stop at database schema.

Do not stop at upload.

Do not stop at transcription.

Do not stop at document extraction.

Implement the entire end-to-end intelligence workflow.

The final application must be a real working platform where uploaded multimodal information becomes:

STRUCTURED INTELLIGENCE

+

CONNECTED RELATIONSHIPS

+

CROSS-SOURCE PATTERNS

+

EXPLAINABLE FINDINGS

+

TRACEABLE EVIDENCE

+

HUMAN ANALYST CONTROL.

Build all required frontend, backend, database, storage, Edge Functions, security policies, AI integrations, processing jobs, data validation, error handling and user workflows needed to make this work as a complete production-ready application.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/43c45873-a820-41d1-a167-1074ad9bed07).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
