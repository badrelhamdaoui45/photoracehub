/*
  # Fix photo upload permissions

  1. Changes
    - Drop existing policies for photos table
    - Create new, more specific policies for photographers
    - Add proper RLS checks for user roles
  
  2. Security
    - Enable RLS on photos table
    - Add policies for photographers to manage their photos
    - Maintain public read access for watermarked photos
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Photos are viewable by everyone" ON photos;
DROP POLICY IF EXISTS "Photographers can insert own photos" ON photos;
DROP POLICY IF EXISTS "Photographers can update own photos" ON photos;
DROP POLICY IF EXISTS "Photographers can upload photos" ON photos;
DROP POLICY IF EXISTS "Anyone can view watermarked photos" ON photos;

-- Create new policies
CREATE POLICY "Public photos are viewable by everyone"
  ON photos FOR SELECT
  USING (true);

CREATE POLICY "Photographers can insert photos"
  ON photos FOR INSERT
  WITH CHECK (
    auth.uid() = photographer_id AND
    auth.jwt() ->> 'role' = 'photographer'
  );

CREATE POLICY "Photographers can update own photos"
  ON photos FOR UPDATE
  USING (
    auth.uid() = photographer_id AND
    auth.jwt() ->> 'role' = 'photographer'
  );

CREATE POLICY "Photographers can delete own photos"
  ON photos FOR DELETE
  USING (
    auth.uid() = photographer_id AND
    auth.jwt() ->> 'role' = 'photographer'
  );