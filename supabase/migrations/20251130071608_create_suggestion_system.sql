/*
  # Create Suggestion System for AI-Driven Metadata Learning

  1. New Tables
    - `suggested_acronyms`
      - `id` (uuid, primary key)
      - `portal` (text, foreign key to portal_metadata)
      - `acronym` (text) - The short form detected
      - `full_term_suggestion` (text) - AI's suggested expansion (nullable)
      - `example_query` (text) - Query where it was found
      - `status` (text) - pending, approved, rejected
      - `suggested_by` (text) - openwebui, user, etc.
      - `created_at` (timestamptz)

    - `suggested_synonyms`
      - `id` (uuid, primary key)
      - `portal` (text, foreign key to portal_metadata)
      - `term` (text) - The canonical term
      - `synonym_suggestions` (jsonb) - Array of suggested synonyms
      - `example_query` (text) - Query where it was found
      - `status` (text) - pending, approved, rejected
      - `suggested_by` (text) - openwebui, user, etc.
      - `created_at` (timestamptz)

    - `suggestion_review_log`
      - `id` (uuid, primary key)
      - `suggestion_type` (text) - acronym or synonym
      - `suggestion_id` (uuid) - References suggested item
      - `action` (text) - approved or rejected
      - `reviewed_by` (text) - Admin identifier
      - `review_notes` (text) - Optional notes
      - `reviewed_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public can read pending suggestions
    - Service role can write suggestions
    - Authenticated users can review (admin function)

  3. Indexes
    - Status indexes for fast filtering
    - Portal indexes for portal-specific queries
    - Created_at indexes for sorting
*/

-- Create suggested_acronyms table
CREATE TABLE IF NOT EXISTS suggested_acronyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal text NOT NULL REFERENCES portal_metadata(portal) ON DELETE CASCADE,
  acronym text NOT NULL,
  full_term_suggestion text,
  example_query text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  suggested_by text DEFAULT 'openwebui',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suggested_acronyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pending acronym suggestions"
  ON suggested_acronyms FOR SELECT
  TO public
  USING (status = 'pending');

CREATE POLICY "Service role can insert acronym suggestions"
  ON suggested_acronyms FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update acronym suggestions"
  ON suggested_acronyms FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_suggested_acronyms_status ON suggested_acronyms(status);
CREATE INDEX IF NOT EXISTS idx_suggested_acronyms_portal ON suggested_acronyms(portal);
CREATE INDEX IF NOT EXISTS idx_suggested_acronyms_created_at ON suggested_acronyms(created_at DESC);

-- Create suggested_synonyms table
CREATE TABLE IF NOT EXISTS suggested_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal text NOT NULL REFERENCES portal_metadata(portal) ON DELETE CASCADE,
  term text NOT NULL,
  synonym_suggestions jsonb DEFAULT '[]'::jsonb,
  example_query text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  suggested_by text DEFAULT 'openwebui',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suggested_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pending synonym suggestions"
  ON suggested_synonyms FOR SELECT
  TO public
  USING (status = 'pending');

CREATE POLICY "Service role can insert synonym suggestions"
  ON suggested_synonyms FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update synonym suggestions"
  ON suggested_synonyms FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_suggested_synonyms_status ON suggested_synonyms(status);
CREATE INDEX IF NOT EXISTS idx_suggested_synonyms_portal ON suggested_synonyms(portal);
CREATE INDEX IF NOT EXISTS idx_suggested_synonyms_created_at ON suggested_synonyms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggested_synonyms_suggestions ON suggested_synonyms USING gin(synonym_suggestions);

-- Create suggestion_review_log table
CREATE TABLE IF NOT EXISTS suggestion_review_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_type text NOT NULL CHECK (suggestion_type IN ('acronym', 'synonym')),
  suggestion_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('approved', 'rejected')),
  reviewed_by text,
  review_notes text,
  reviewed_at timestamptz DEFAULT now()
);

ALTER TABLE suggestion_review_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read review log"
  ON suggestion_review_log FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can insert review log"
  ON suggestion_review_log FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_review_log_type ON suggestion_review_log(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_review_log_reviewed_at ON suggestion_review_log(reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_log_suggestion_id ON suggestion_review_log(suggestion_id);
