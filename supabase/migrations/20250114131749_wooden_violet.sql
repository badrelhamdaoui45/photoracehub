/*
  # Add function for getting event photo counts

  1. New Functions
    - `get_event_counts`: Returns event names and photo counts for a photographer
*/

CREATE OR REPLACE FUNCTION get_event_counts(photographer_id uuid)
RETURNS TABLE (
  event_name text,
  count bigint
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT event_name, COUNT(*) as count
  FROM photos
  WHERE photographer_id = $1
  GROUP BY event_name
  ORDER BY event_name;
$$;