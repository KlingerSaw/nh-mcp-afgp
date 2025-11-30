-- Allow anonymous (anon) role to read connection logs for monitoring UI
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Public can view connection logs'
      AND tablename = 'connection_logs'
  ) THEN
    CREATE POLICY "Public can view connection logs"
      ON connection_logs
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END
$$;
