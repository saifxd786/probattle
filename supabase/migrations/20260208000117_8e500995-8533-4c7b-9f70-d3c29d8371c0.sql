-- Fix search_path warnings for new multi-player functions
ALTER FUNCTION public.check_ludo_room_multiplayer(TEXT) SET search_path TO 'public';
ALTER FUNCTION public.cancel_ludo_room_multiplayer(UUID) SET search_path TO 'public';
ALTER FUNCTION public.leave_ludo_room(UUID) SET search_path TO 'public';