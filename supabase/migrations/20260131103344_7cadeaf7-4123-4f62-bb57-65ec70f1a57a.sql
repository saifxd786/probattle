-- Add unique match_code column to matches table
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_code VARCHAR(5);

-- Create function to generate 5 character alphanumeric code
CREATE OR REPLACE FUNCTION generate_match_code()
RETURNS VARCHAR(5) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(5) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..5 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate match_code on insert
CREATE OR REPLACE FUNCTION set_match_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(5);
  code_exists BOOLEAN;
BEGIN
  IF NEW.match_code IS NULL THEN
    LOOP
      new_code := generate_match_code();
      SELECT EXISTS(SELECT 1 FROM matches WHERE match_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.match_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_set_match_code ON public.matches;
CREATE TRIGGER trigger_set_match_code
  BEFORE INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION set_match_code();

-- Generate codes for existing matches that don't have one
UPDATE public.matches 
SET match_code = generate_match_code() 
WHERE match_code IS NULL;

-- Create unique index on match_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_match_code ON public.matches(match_code) WHERE match_code IS NOT NULL;