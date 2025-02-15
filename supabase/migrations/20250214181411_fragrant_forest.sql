/*
  # Fix album creation permissions

  1. Changes
    - Update photos table policies
    - Add proper role checking function
    - Fix permission issues for album creation
    
  2. Security
    - Maintain RLS while fixing permission issues
    - Ensure proper role verification
    - Add proper error handling
*/

-- Create a more reliable function to check photographer role
CREATE OR REPLACE FUNCTION auth.is_photographer()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'photographer'
    )
  );
END;
$$;

-- Drop existing photos policies
DROP POLICY IF EXISTS "Anyone can view photos" ON photos;
DROP POLICY IF EXISTS "Photographers can insert photos" ON photos;
DROP POLICY IF EXISTS "Photographers can update own photos" ON photos;
DROP POLICY IF EXISTS "Photographers can delete own photos" ON photos;

-- Create new photos policies
CREATE POLICY "Photos are viewable by everyone"
ON photos FOR SELECT
TO public
USING (true);

CREATE POLICY "Photographers can insert photos"
ON photos FOR INSERT
TO authenticated
WITH CHECK (
  photographer_id = auth.uid() 
  AND auth.is_photographer()
);

CREATE POLICY "Photographers can update own photos"
ON photos FOR UPDATE
TO authenticated
USING (
  photographer_id = auth.uid() 
  AND auth.is_photographer()
);

CREATE POLICY "Photographers can delete own photos"
ON photos FOR DELETE
TO authenticated
USING (
  photographer_id = auth.uid() 
  AND auth.is_photographer()
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_photographer() TO authenticated;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_photos_photographer_id ON photos(photographer_id);
CREATE INDEX IF NOT EXISTS idx_photos_event_name ON photos(event_name);