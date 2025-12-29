-- Keep matches.filled_slots in sync with approved registrations (auto-count on join)

CREATE OR REPLACE FUNCTION public.update_match_filled_slots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_approved = true THEN
      UPDATE public.matches
      SET filled_slots = filled_slots + 1
      WHERE id = NEW.match_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_approved = true AND (OLD.is_approved IS DISTINCT FROM true) THEN
      UPDATE public.matches
      SET filled_slots = filled_slots + 1
      WHERE id = NEW.match_id;
    ELSIF (NEW.is_approved IS DISTINCT FROM true) AND OLD.is_approved = true THEN
      UPDATE public.matches
      SET filled_slots = GREATEST(filled_slots - 1, 0)
      WHERE id = OLD.match_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_approved = true THEN
      UPDATE public.matches
      SET filled_slots = GREATEST(filled_slots - 1, 0)
      WHERE id = OLD.match_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_registrations_slots ON public.match_registrations;

CREATE TRIGGER trg_match_registrations_slots
AFTER INSERT OR UPDATE OF is_approved OR DELETE ON public.match_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_match_filled_slots();
