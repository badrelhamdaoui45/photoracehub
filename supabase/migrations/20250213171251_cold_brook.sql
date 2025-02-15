/*
  # Fix storage and profile policies

  1. Changes
    - Add storage policies for avatar uploads
    - Update profile policies to allow authenticated users to update their own profiles
    - Add storage bucket policy for avatars folder

  2. Security
    - Enable RLS for storage objects
    - Restrict avatar uploads to authenticated users
    - Allow users to update their own profiles
*/

-- Update storage bucket policies
DROP POLICY IF EXISTS "Photographers can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view watermarked photos" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Allow public access to photos"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'race-photos' AND
  (LOWER(name) LIKE 'watermarked/%' OR LOWER(name) LIKE 'public/%' OR LOWER(name) LIKE 'avatars/%')
);

CREATE POLICY "Allow authenticated users to upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'race-photos' AND
  (
    (LOWER(name) LIKE 'originals/%' AND auth.jwt()->>'role' = 'photographer') OR
    (LOWER(name) LIKE 'avatars/%')
  )
);

-- Update profile policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure storage bucket exists and is configured correctly
INSERT INTO storage.buckets (id, name, public)
VALUES ('race-photos', 'race-photos', true)
ON CONFLICT (id) DO UPDATE
SET public = true;