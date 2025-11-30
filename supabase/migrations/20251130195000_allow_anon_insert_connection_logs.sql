-- Allow anonymous (anon) role to insert connection logs so monitoring works even without service role key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Public can insert connection logs'
      AND tablename = 'connection_logs'
  ) THEN
    CREATE POLICY "Public can insert connection logs"
      ON connection_logs
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END
$$;
