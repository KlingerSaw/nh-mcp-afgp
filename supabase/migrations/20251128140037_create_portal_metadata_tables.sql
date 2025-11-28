/*
  # Portal Metadata Tables for Query Optimization

  1. New Tables
    - `portal_metadata`
      - `portal` (text, primary key) - Portal hostname
      - `name` (text) - Display name
      - `description` (text) - Portal description
      - `domain_focus` (text) - Main focus area
      - `common_terms` (jsonb) - Array of common search terms
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `portal_synonyms`
      - `id` (uuid, primary key)
      - `portal` (text, foreign key to portal_metadata)
      - `term` (text) - The canonical term
      - `synonyms` (jsonb) - Array of synonym variations
      - `category` (text) - Optional category association
      - `created_at` (timestamptz)

    - `portal_acronyms`
      - `id` (uuid, primary key)
      - `portal` (text, foreign key to portal_metadata)
      - `acronym` (text) - The short form
      - `full_term` (text) - The expanded form
      - `context` (text) - Context where it's used
      - `created_at` (timestamptz)

    - `legal_areas`
      - `id` (uuid, primary key)
      - `portal` (text, foreign key to portal_metadata)
      - `area_name` (text) - Name of the legal area
      - `area_slug` (text) - URL-friendly slug
      - `keywords` (jsonb) - Array of related keywords
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated read access
    - Add policies for service role write access

  3. Indexes
    - Add indexes for common query patterns
    - Add GIN indexes for JSONB columns
*/

-- Create portal_metadata table
CREATE TABLE IF NOT EXISTS portal_metadata (
  portal text PRIMARY KEY,
  name text NOT NULL,
  description text,
  domain_focus text,
  common_terms jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE portal_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read portal metadata"
  ON portal_metadata FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can insert portal metadata"
  ON portal_metadata FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update portal metadata"
  ON portal_metadata FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create portal_synonyms table
CREATE TABLE IF NOT EXISTS portal_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal text NOT NULL REFERENCES portal_metadata(portal) ON DELETE CASCADE,
  term text NOT NULL,
  synonyms jsonb DEFAULT '[]'::jsonb,
  category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE portal_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read portal synonyms"
  ON portal_synonyms FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can manage portal synonyms"
  ON portal_synonyms FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_portal_synonyms_portal ON portal_synonyms(portal);
CREATE INDEX IF NOT EXISTS idx_portal_synonyms_term ON portal_synonyms(term);
CREATE INDEX IF NOT EXISTS idx_portal_synonyms_synonyms ON portal_synonyms USING gin(synonyms);

-- Create portal_acronyms table
CREATE TABLE IF NOT EXISTS portal_acronyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal text NOT NULL REFERENCES portal_metadata(portal) ON DELETE CASCADE,
  acronym text NOT NULL,
  full_term text NOT NULL,
  context text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE portal_acronyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read portal acronyms"
  ON portal_acronyms FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can manage portal acronyms"
  ON portal_acronyms FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_portal_acronyms_portal ON portal_acronyms(portal);
CREATE INDEX IF NOT EXISTS idx_portal_acronyms_acronym ON portal_acronyms(acronym);

-- Create legal_areas table
CREATE TABLE IF NOT EXISTS legal_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal text NOT NULL REFERENCES portal_metadata(portal) ON DELETE CASCADE,
  area_name text NOT NULL,
  area_slug text,
  keywords jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE legal_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read legal areas"
  ON legal_areas FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can manage legal areas"
  ON legal_areas FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_legal_areas_portal ON legal_areas(portal);
CREATE INDEX IF NOT EXISTS idx_legal_areas_keywords ON legal_areas USING gin(keywords);

-- Add columns to existing site_categories table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_categories' AND column_name = 'keywords'
  ) THEN
    ALTER TABLE site_categories ADD COLUMN keywords jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_categories' AND column_name = 'common_phrases'
  ) THEN
    ALTER TABLE site_categories ADD COLUMN common_phrases jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_categories' AND column_name = 'parent_category'
  ) THEN
    ALTER TABLE site_categories ADD COLUMN parent_category text;
  END IF;
END $$;