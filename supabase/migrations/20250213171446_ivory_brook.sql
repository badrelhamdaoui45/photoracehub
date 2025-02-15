/*
  # Fix photo upload and storage policies

  1. Changes
    - Update storage policies to allow photographers to upload original and watermarked photos
    - Fix RLS policies for photo table
    - Add policies for copying files between folders

  2. Security
    - Maintain RLS for storage objects
    - Restrict photo uploads to photographers only
    - Allow public access to watermarked photos
*/

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow public access to photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload photos" ON storage.objects;

-- Create comprehensive storage policies
CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'race-photos' AND
  (
    LOWER(name) LIKE 'watermarked/%' OR
    LOWER(name) LIKE 'public/%' OR
    LOWER(name) LIKE 'avatars/%'
  )
);

CREATE POLICY "Photographers can upload and manage photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'race-photos' AND
  (
    -- Allow photographers to upload to originals and watermarked folders
    (
      (LOWER(name) LIKE 'originals/%' OR LOWER(name) LIKE 'watermarked/%') AND
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'photographer'
      )
    ) OR
    -- Allow all authenticated users to upload avatars
    LOWER(name) LIKE 'avatars/%'
  )
);

-- Add policy for copying files (needed for watermark process)
CREATE POLICY "Photographers can copy photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'race-photos' AND
  LOWER(name) LIKE 'watermarked/%' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'photographer'
  )
);

-- Update photos table policies
DROP POLICY IF EXISTS "Photos are viewable by everyone" ON photos;
DROP POLICY IF EXISTS "Photographers can insert own photos" ON photos;
DROP POLICY IF EXISTS "Photographers can update own photos" ON photos;
DROP POLICY IF EXISTS "Photographers can delete own photos" ON photos;

CREATE POLICY "Anyone can view photos"
ON photos FOR SELECT
TO public
USING (true);

CREATE POLICY "Photographers can insert photos"
ON photos FOR INSERT
TO authenticated
WITH CHECK (
  photographer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'photographer'
  )
);

CREATE POLICY "Photographers can update own photos"
ON photos FOR UPDATE
TO authenticated
USING (
  photographer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'photographer'
  )
);

CREATE POLICY "Photographers can delete own photos"
ON photos FOR DELETE
TO authenticated
USING (
  photographer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'photographer'
  )
);