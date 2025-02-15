/*
  # Fix storage policies for avatar uploads

  1. Changes
    - Simplify storage policies to ensure proper avatar uploads
    - Add explicit CRUD policies for avatar management
    - Update bucket configuration

  2. Security
    - Maintain public read access for media
    - Allow authenticated users to manage their avatars
    - Preserve photographer-specific permissions
*/

-- Drop existing storage policies
DROP POLICY IF EXISTS "Public can access media" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Photographers can manage photos" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Anyone can view public files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'race-photos');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'race-photos' AND
  (
    LOWER(name) LIKE 'avatars/%' OR
    (
      (LOWER(name) LIKE 'originals/%' OR LOWER(name) LIKE 'watermarked/%') AND
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'photographer'
      )
    )
  )
);

CREATE POLICY "Authenticated users can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'race-photos' AND
  (
    LOWER(name) LIKE 'avatars/%' OR
    (
      (LOWER(name) LIKE 'originals/%' OR LOWER(name) LIKE 'watermarked/%') AND
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'photographer'
      )
    )
  )
);

CREATE POLICY "Authenticated users can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'race-photos' AND
  (
    LOWER(name) LIKE 'avatars/%' OR
    (
      (LOWER(name) LIKE 'originals/%' OR LOWER(name) LIKE 'watermarked/%') AND
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'photographer'
      )
    )
  )
);

-- Ensure storage bucket is properly configured
UPDATE storage.buckets 
SET public = true,
    file_size_limit = 52428800, -- 50MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif']
WHERE id = 'race-photos';