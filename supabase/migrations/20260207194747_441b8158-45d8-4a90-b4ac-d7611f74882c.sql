-- Drop old constraint and add new one that includes player_count 3 (for 1v1v1)
ALTER TABLE public.ludo_matches DROP CONSTRAINT ludo_matches_player_count_check;

ALTER TABLE public.ludo_matches ADD CONSTRAINT ludo_matches_player_count_check 
CHECK (player_count = ANY (ARRAY[2, 3, 4]));