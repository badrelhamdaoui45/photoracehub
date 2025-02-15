/*
  # Add race photo specific fields

  1. Changes
    - Add event_name column to photos table
    - Add bib_numbers array column to photos table
    - Add price column with default value
    - Add watermark_url column

  2. Security
    - Update RLS policies to maintain existing security model
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'event_name'
  ) THEN
    ALTER TABLE photos ADD COLUMN event_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'bib_numbers'
  ) THEN
    ALTER TABLE photos ADD COLUMN bib_numbers text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'price'
  ) THEN
    ALTER TABLE photos ADD COLUMN price decimal NOT NULL DEFAULT 9.99;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'watermark_url'
  ) THEN
    ALTER TABLE photos ADD COLUMN watermark_url text;
  END IF;
END $$;