/*
  # Add Payload and Response Logging

  1. Changes
    - Add `search_payload` column to store the exact payload sent to portal API
    - Add `api_response` column to store the raw response from portal API
    
  2. Purpose
    - Enable debugging by seeing exact requests and responses
    - Track what data was sent vs what was received
    - Help diagnose search issues
    
  3. Notes
    - Both columns are JSONB for flexible storage
    - Nullable to not break existing logs
    - Can be queried for analysis
*/

-- Add payload and response columns
ALTER TABLE query_logs 
ADD COLUMN IF NOT EXISTS search_payload jsonb,
ADD COLUMN IF NOT EXISTS api_response jsonb;