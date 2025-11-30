/*
  # Add AI tracking columns to query_logs

  1. Changes
    - Add `ai_detected_acronym` (text) - acronym AI identified and sent
    - Add `matched_category_id` (uuid) - category GUID matched from acronym
    - Add `matched_category_title` (text) - human-readable category name
    - Add `ai_missed_acronym` (boolean) - true if edge function found acronym AI missed
    
  2. Purpose
    - Track AI's performance in query optimization
    - Measure how often AI correctly identifies acronyms
    - Identify patterns where AI misses acronyms for improvement
*/

ALTER TABLE query_logs
ADD COLUMN IF NOT EXISTS ai_detected_acronym text,
ADD COLUMN IF NOT EXISTS matched_category_id uuid,
ADD COLUMN IF NOT EXISTS matched_category_title text,
ADD COLUMN IF NOT EXISTS ai_missed_acronym boolean DEFAULT false;