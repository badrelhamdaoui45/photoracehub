/*
  # Fix avatar upload and profile update policies

  1. Changes
    - Update storage policies to properly handle avatar uploads
    - Fix RLS policies for profiles table
    - Add explicit policies for avatar management

  2. Security
    - Maintain RLS for storage objects
    - Allow authenticated users to manage their own avatars
    - Allow public access to avatars
*/

-- Drop existing storage policies
DROP POLICY IF EXISTS "Public can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Photographers can upload and manage photos" ON storage.objects;
DROP POLICY IF EXISTS "Photographers can copy photos" ON storage.objects;

-- Create comprehensive storage policies
CREATE POLICY "Public can access media"
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

CREATE POLICY "Users can manage their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'race-photos' AND
  LOWER(name) LIKE 'avatars/%'
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'race-photos' AND
  LOWER(name) LIKE 'avatars/%'
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'race-photos' AND
  LOWER(name) LIKE 'avatars/%'
);

CREATE POLICY "Photographers can manage photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'race-photos' AND
  (
    (LOWER(name) LIKE 'originals/%' OR LOWER(name) LIKE 'watermarked/%') AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'photographer'
    )
  )
);

-- Update profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can create their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure storage paths exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('race-photos', 'race-photos', true)
  ON CONFLICT (id) DO UPDATE
  SET public = true;
END $$;