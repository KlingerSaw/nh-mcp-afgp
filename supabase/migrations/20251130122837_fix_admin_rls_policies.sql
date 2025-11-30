/*
  # Fix RLS Policies for Admin Panel

  1. Problem
    - authenticated users cannot update suggested_acronyms (approve/reject)
    - authenticated users cannot insert into portal_acronyms table (after approval)
    - Only service_role can modify data, but admin panel runs as authenticated user

  2. Solution
    - Add UPDATE policy for authenticated users on suggested_acronyms
    - Add INSERT, UPDATE, DELETE policies for authenticated users on portal_acronyms
    - Add INSERT policy for authenticated users on suggestion_review_log
    - Add UPDATE policy for authenticated users on suggested_synonyms

  3. Security
    - Only authenticated users (logged in admins) can modify data
    - Public users can only read
    - Service role retains full access
*/

-- Add authenticated user policies for suggested_acronyms
CREATE POLICY "Authenticated users can update acronym suggestions"
  ON suggested_acronyms FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add authenticated user policies for portal_acronyms table
CREATE POLICY "Authenticated users can insert acronyms"
  ON portal_acronyms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update acronyms"
  ON portal_acronyms FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete acronyms"
  ON portal_acronyms FOR DELETE
  TO authenticated
  USING (true);

-- Add authenticated user policy for suggestion_review_log
CREATE POLICY "Authenticated users can insert review log"
  ON suggestion_review_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add similar policies for suggested_synonyms
CREATE POLICY "Authenticated users can update synonym suggestions"
  ON suggested_synonyms FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add authenticated user policies for portal_synonyms table
CREATE POLICY "Authenticated users can insert synonyms"
  ON portal_synonyms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update synonyms"
  ON portal_synonyms FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete synonyms"
  ON portal_synonyms FOR DELETE
  TO authenticated
  USING (true);