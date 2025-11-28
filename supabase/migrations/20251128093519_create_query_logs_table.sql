/*
  # Create query logs table for MCP server

  1. New Tables
    - `query_logs`
      - `id` (uuid, primary key) - Unique identifier
      - `portal` (text) - Portal domain (e.g., mfkn.naevneneshus.dk)
      - `query` (text) - Search query
      - `filters` (jsonb) - Filter parameters
      - `result_count` (integer) - Number of results returned
      - `execution_time_ms` (integer) - Query execution time
      - `error_message` (text, nullable) - Error if query failed
      - `created_at` (timestamptz) - When query was made
      - `user_identifier` (text, nullable) - Optional user tracking
      
  2. Indexes
    - Index on created_at for time-based queries
    - Index on portal for filtering by portal
    - Index on result_count for alert queries
    
  3. Security
    - Enable RLS on `query_logs` table
    - Add policy for authenticated users to read all logs
    - Add policy for authenticated users to insert logs
*/

CREATE TABLE IF NOT EXISTS query_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal text NOT NULL,
  query text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  result_count integer DEFAULT 0,
  execution_time_ms integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  user_identifier text
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_logs_portal ON query_logs(portal);
CREATE INDEX IF NOT EXISTS idx_query_logs_result_count ON query_logs(result_count);

-- Enable RLS
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all logs
CREATE POLICY "Users can view all query logs"
  ON query_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert logs
CREATE POLICY "Users can insert query logs"
  ON query_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow public access for the MCP server (if needed)
CREATE POLICY "Public can insert query logs"
  ON query_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can view query logs"
  ON query_logs
  FOR SELECT
  TO anon
  USING (true);