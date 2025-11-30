/*
  # Create unknown_acronyms tracking table

  1. New Tables
    - `unknown_acronyms`
      - `id` (uuid, primary key)
      - `portal` (text) - which portal the acronym was seen on
      - `acronym` (text) - the acronym string (e.g., "MBL", "NBL")
      - `context_query` (text) - example query where it was used
      - `frequency` (integer) - how many times seen
      - `last_seen` (timestamptz) - when last encountered
      - `reviewed` (boolean) - whether admin has reviewed it
      - `mapped_to_category_id` (uuid) - if mapped to existing category
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `unknown_acronyms` table
    - Add policy for public SELECT (for monitoring dashboard)
    - Add policy for anon INSERT (for logging from edge function)
    - Add policy for authenticated UPDATE (for admin review)
    
  3. Indexes
    - Index on portal for fast filtering
    - Index on reviewed for admin workflow
    - Unique constraint on (portal, acronym)
*/

CREATE TABLE IF NOT EXISTS unknown_acronyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal text NOT NULL,
  acronym text NOT NULL,
  context_query text,
  frequency integer DEFAULT 1,
  last_seen timestamptz DEFAULT now(),
  reviewed boolean DEFAULT false,
  mapped_to_category_id uuid,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_portal_acronym UNIQUE(portal, acronym)
);

CREATE INDEX IF NOT EXISTS idx_unknown_acronyms_portal ON unknown_acronyms(portal);
CREATE INDEX IF NOT EXISTS idx_unknown_acronyms_reviewed ON unknown_acronyms(reviewed);
CREATE INDEX IF NOT EXISTS idx_unknown_acronyms_frequency ON unknown_acronyms(frequency DESC);

ALTER TABLE unknown_acronyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public SELECT on unknown_acronyms"
  ON unknown_acronyms FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow anon INSERT on unknown_acronyms"
  ON unknown_acronyms FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated UPDATE on unknown_acronyms"
  ON unknown_acronyms FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);