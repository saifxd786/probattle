-- Allow agents to view profiles (but phone will be hidden in frontend)
CREATE POLICY "Agents can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'agent'::app_role));

-- Allow agents to view all matches
CREATE POLICY "Agents can view all matches" 
ON public.matches 
FOR SELECT 
USING (has_role(auth.uid(), 'agent'::app_role));

-- Allow agents to update matches (for result management)
CREATE POLICY "Agents can update matches" 
ON public.matches 
FOR UPDATE 
USING (has_role(auth.uid(), 'agent'::app_role));

-- Allow agents to view all match registrations
CREATE POLICY "Agents can view all registrations" 
ON public.match_registrations 
FOR SELECT 
USING (has_role(auth.uid(), 'agent'::app_role));

-- Allow agents to update match registrations (approve/reject)
CREATE POLICY "Agents can update registrations" 
ON public.match_registrations 
FOR UPDATE 
USING (has_role(auth.uid(), 'agent'::app_role));

-- Allow agents to view all match results
CREATE POLICY "Agents can view all match results" 
ON public.match_results 
FOR SELECT 
USING (has_role(auth.uid(), 'agent'::app_role));

-- Allow agents to manage match results (create/update for result entry)
CREATE POLICY "Agents can insert match results" 
ON public.match_results 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Agents can update match results" 
ON public.match_results 
FOR UPDATE 
USING (has_role(auth.uid(), 'agent'::app_role));

-- Allow agents to view all transactions (view only)
CREATE POLICY "Agents can view all transactions" 
ON public.transactions 
FOR SELECT 
USING (has_role(auth.uid(), 'agent'::app_role));