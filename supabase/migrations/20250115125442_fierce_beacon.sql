/*
  # Add storage and photo upload policies

  1. Storage Policies
    - Create storage bucket if not exists
    - Add policies for authenticated users to upload and read photos
  
  2. Photo Table Policies
    - Update policies to allow authenticated photographers to insert photos
    - Add policy for reading watermarked photos
*/

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
SELECT 'race-photos', 'race-photos'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'race-photos'
);

-- Enable RLS for the storage bucket
UPDATE storage.buckets 
SET public = false 
WHERE id = 'race-photos';

-- Storage policies for race-photos bucket
CREATE POLICY "Allow authenticated users to upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'race-photos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow public access to photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'race-photos');

-- Update photos table policies
CREATE POLICY "Photographers can upload photos"
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

CREATE POLICY "Anyone can view watermarked photos"
ON photos FOR SELECT
TO public
USING (true);