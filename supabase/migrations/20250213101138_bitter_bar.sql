/*
  # Update storage policies for public access

  1. Changes
    - Update storage bucket policies to allow public read access
    - Add policy for public access to watermarked photos
    - Keep upload restrictions for authenticated photographers only

  2. Security
    - Maintain secure upload restrictions
    - Allow public read access only for watermarked photos
*/

-- Make the race-photos bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'race-photos';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public access to photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload photos" ON storage.objects;

-- Create new policies for public access
CREATE POLICY "Public can view watermarked photos"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'race-photos' AND
  (name LIKE 'watermarked/%' OR name LIKE 'public/%')
);

-- Keep the upload policy for authenticated photographers
CREATE POLICY "Photographers can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'race-photos' AND
  (auth.jwt()->>'role' = 'photographer')
);