/*
  # Add Dual Query Logging Support

  1. Schema Changes
    - Add `original_query` column to store user's raw input
    - Add `optimized_query` column to store AI-optimized search string
    - Keep existing `query` column for backwards compatibility

  2. Purpose
    - Enable quality assurance by comparing user input vs AI optimization
    - Identify patterns where optimization fails (result_count = 0)
    - Data-driven prompt improvement through logging analysis

  3. Notes
    - Both columns are nullable to support gradual rollout
    - Indexes remain on result_count and created_at for analytics
    - RLS policies unchanged
*/

-- Add new columns for dual query tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_logs' AND column_name = 'original_query'
  ) THEN
    ALTER TABLE query_logs ADD COLUMN original_query text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_logs' AND column_name = 'optimized_query'
  ) THEN
    ALTER TABLE query_logs ADD COLUMN optimized_query text;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN query_logs.original_query IS 'User''s original input (unmodified)';
COMMENT ON COLUMN query_logs.optimized_query IS 'AI-optimized search string with synonyms, acronyms expanded, filler words removed';
COMMENT ON COLUMN query_logs.query IS 'Legacy field - now redundant, kept for backwards compatibility';