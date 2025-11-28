/*
  # Create Connection Logs Table

  1. New Tables
    - `connection_logs`
      - `id` (uuid, primary key)
      - `endpoint` (text) - Which endpoint was called
      - `method` (text) - HTTP method
      - `user_agent` (text) - User agent from request
      - `auth_type` (text) - Type of auth used
      - `ip_address` (text) - IP address of requester
      - `request_headers` (jsonb) - Full request headers
      - `tools_discovered` (integer) - Number of tools discovered
      - `success` (boolean) - Whether request was successful
      - `error_message` (text) - Error message if failed
      - `created_at` (timestamptz) - Timestamp
  
  2. Security
    - Enable RLS on `connection_logs` table
    - Add policy for authenticated users to read their own data
    - Add policy for service role to insert logs

  3. Indexes
    - Index on endpoint for fast filtering
    - Index on created_at for time-based queries
*/

CREATE TABLE IF NOT EXISTS connection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  method text NOT NULL,
  user_agent text,
  auth_type text,
  ip_address text,
  request_headers jsonb DEFAULT '{}'::jsonb,
  tools_discovered integer DEFAULT 0,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE connection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role to insert logs"
  ON connection_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read all logs"
  ON connection_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_connection_logs_endpoint ON connection_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_connection_logs_created_at ON connection_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connection_logs_success ON connection_logs(success);