/*
  # Fix RLS policies for profiles and storage

  1. Changes
    - Simplify storage bucket policies
    - Update profile policies to be more permissive
    - Add explicit mime type checks for uploads
    - Increase file size limits
    
  2. Security
    - Maintain RLS while fixing permission issues
    - Ensure proper access control for files
    - Allow public access to necessary files
*/

-- Drop existing storage policies
DROP POLICY IF EXISTS "Anyone can view public files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their files" ON storage.objects;

-- Create simplified storage policies
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'race-photos');

CREATE POLICY "Authenticated upload access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'race-photos');

CREATE POLICY "Authenticated update access"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'race-photos');

CREATE POLICY "Authenticated delete access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'race-photos');

-- Update storage bucket configuration
UPDATE storage.buckets 
SET public = true,
    file_size_limit = 104857600, -- 100MB
    allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ]
WHERE id = 'race-photos';

-- Drop existing profile policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new profile policies
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Ensure storage bucket exists with proper configuration
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('race-photos', 'race-photos', true)
  ON CONFLICT (id) DO UPDATE
  SET public = true;
END $$;