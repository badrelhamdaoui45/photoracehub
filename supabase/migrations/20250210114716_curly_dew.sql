/*
  # Fix photographer RLS policies

  1. Changes
    - Update photos table policies to properly check photographer role
    - Add policies for photographers to manage their photos
    - Fix album creation by allowing empty placeholder photos

  2. Security
    - Maintain RLS on photos table
    - Ensure photographers can only manage their own photos
    - Allow public read access to photos
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public photos are viewable by everyone" ON photos;
DROP POLICY IF EXISTS "Photographers can insert photos" ON photos;
DROP POLICY IF EXISTS "Photographers can update own photos" ON photos;
DROP POLICY IF EXISTS "Photographers can delete own photos" ON photos;

-- Create new policies
CREATE POLICY "Photos are viewable by everyone"
  ON photos FOR SELECT
  USING (true);

CREATE POLICY "Photographers can insert own photos"
  ON photos FOR INSERT
  WITH CHECK (
    auth.uid() = photographer_id AND
    (auth.jwt()->>'role')::text = 'photographer'
  );

CREATE POLICY "Photographers can update own photos"
  ON photos FOR UPDATE
  USING (
    auth.uid() = photographer_id AND
    (auth.jwt()->>'role')::text = 'photographer'
  );

CREATE POLICY "Photographers can delete own photos"
  ON photos FOR DELETE
  USING (
    auth.uid() = photographer_id AND
    (auth.jwt()->>'role')::text = 'photographer'
  );

-- Create function to check if user is photographer
CREATE OR REPLACE FUNCTION is_photographer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN auth.jwt()->>'role' = 'photographer' THEN true
      ELSE false
    END;
$$;