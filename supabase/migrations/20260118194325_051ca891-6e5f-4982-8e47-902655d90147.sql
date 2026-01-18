-- Add DELETE policies for admins on tables that are missing them
-- This allows admins to delete user data when deleting a user

-- notifications table
CREATE POLICY "Admins can delete notifications" 
ON public.notifications 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- support_tickets table
CREATE POLICY "Admins can delete tickets" 
ON public.support_tickets 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- support_messages table
CREATE POLICY "Admins can delete messages" 
ON public.support_messages 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- mines_games table
CREATE POLICY "Admins can delete mines games" 
ON public.mines_games 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- thimble_games table
CREATE POLICY "Admins can delete thimble games" 
ON public.thimble_games 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- spin_wheel table
CREATE POLICY "Admins can delete spin records" 
ON public.spin_wheel 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- daily_login_bonus table
CREATE POLICY "Admins can delete daily login bonus" 
ON public.daily_login_bonus 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- ludo_transactions table
CREATE POLICY "Admins can delete ludo transactions" 
ON public.ludo_transactions 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- ludo_match_players table
CREATE POLICY "Admins can delete ludo match players" 
ON public.ludo_match_players 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- weekly_login_rewards table
CREATE POLICY "Admins can delete weekly login rewards" 
ON public.weekly_login_rewards 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));