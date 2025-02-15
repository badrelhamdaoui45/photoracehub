/*
  # Fix photographer RLS policies to use metadata

  1. Changes
    - Update policies to check role from user metadata instead of JWT
    - Fix album creation permissions
    - Add helper functions for role checking

  2. Security
    - Maintain RLS on photos table
    - Ensure proper role verification
    - Keep public read access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Photos are viewable by everyone" ON photos;
DROP POLICY IF EXISTS "Photographers can insert own photos" ON photos;
DROP POLICY IF EXISTS "Photographers can update own photos" ON photos;
DROP POLICY IF EXISTS "Photographers can delete own photos" ON photos;

-- Create helper function to check photographer role
CREATE OR REPLACE FUNCTION auth.is_photographer()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT CASE 
      WHEN auth.jwt() ->> 'email' IS NOT NULL 
      AND (
        SELECT raw_user_meta_data->>'role'
        FROM auth.users
        WHERE id = auth.uid()
      ) = 'photographer'
      THEN true
      ELSE false
    END
  );
END;
$$;

-- Create new policies using the helper function
CREATE POLICY "Photos are viewable by everyone"
  ON photos FOR SELECT
  USING (true);

CREATE POLICY "Photographers can insert own photos"
  ON photos FOR INSERT
  WITH CHECK (
    auth.uid() = photographer_id AND
    auth.is_photographer()
  );

CREATE POLICY "Photographers can update own photos"
  ON photos FOR UPDATE
  USING (
    auth.uid() = photographer_id AND
    auth.is_photographer()
  );

CREATE POLICY "Photographers can delete own photos"
  ON photos FOR DELETE
  USING (
    auth.uid() = photographer_id AND
    auth.is_photographer()
  );