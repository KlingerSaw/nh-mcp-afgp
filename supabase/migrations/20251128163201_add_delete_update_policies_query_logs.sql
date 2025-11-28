/*
  # Add DELETE and UPDATE policies for query_logs

  1. Changes
    - Add DELETE policy for authenticated users
    - Add DELETE policy for anon users (for dashboard)
    - Add UPDATE policies for completeness

  2. Security
    - Allow authenticated users to delete logs
    - Allow anon users to delete logs (dashboard uses anon key)
    - This enables the "Slet alle logs" button to work
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can delete query logs" ON query_logs;
  DROP POLICY IF EXISTS "Anon users can delete query logs" ON query_logs;
  DROP POLICY IF EXISTS "Authenticated users can update query logs" ON query_logs;
  DROP POLICY IF EXISTS "Anon users can update query logs" ON query_logs;
END $$;

-- Allow authenticated users to delete logs
CREATE POLICY "Authenticated users can delete query logs"
  ON query_logs
  FOR DELETE
  TO authenticated
  USING (true);

-- Allow anon users to delete logs (for dashboard)
CREATE POLICY "Anon users can delete query logs"
  ON query_logs
  FOR DELETE
  TO anon
  USING (true);

-- Allow authenticated users to update logs (for completeness)
CREATE POLICY "Authenticated users can update query logs"
  ON query_logs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anon users to update logs (for completeness)
CREATE POLICY "Anon users can update query logs"
  ON query_logs
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
