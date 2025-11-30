/*
  # Fix SELECT Policies for Admin Updates

  1. Problem
    - SELECT policy only allows reading rows with status = 'pending'
    - When authenticated users UPDATE status to 'approved' or 'rejected', 
      the UPDATE fails because it can't return the updated row
    - RLS checks SELECT policy on the RETURNING clause

  2. Solution
    - Add separate SELECT policy for authenticated users (admins)
    - Authenticated users can read ALL suggestions (any status)
    - Public users can still only read pending suggestions

  3. Security
    - Public: Only pending suggestions visible
    - Authenticated: All suggestions visible (for admin review history)
*/

-- Add SELECT policy for authenticated users on suggested_acronyms
CREATE POLICY "Authenticated users can read all acronym suggestions"
  ON suggested_acronyms FOR SELECT
  TO authenticated
  USING (true);

-- Add SELECT policy for authenticated users on suggested_synonyms
CREATE POLICY "Authenticated users can read all synonym suggestions"
  ON suggested_synonyms FOR SELECT
  TO authenticated
  USING (true);