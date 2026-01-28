-- Create friend_requests table
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Create friendships table (stores accepted friendships)
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Create game challenges table
CREATE TABLE public.game_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('ludo', 'thimble', 'mines')),
  entry_amount NUMERIC NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'completed')),
  room_id UUID NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_challenges ENABLE ROW LEVEL SECURITY;

-- RLS policies for friend_requests
CREATE POLICY "Users can view their own friend requests"
ON public.friend_requests FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
ON public.friend_requests FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update requests they received"
ON public.friend_requests FOR UPDATE
USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

CREATE POLICY "Users can delete their own requests"
ON public.friend_requests FOR DELETE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- RLS policies for friendships
CREATE POLICY "Users can view their friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create friendships"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can delete their friendships"
ON public.friendships FOR DELETE
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS policies for game_challenges
CREATE POLICY "Users can view their challenges"
ON public.game_challenges FOR SELECT
USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

CREATE POLICY "Users can create challenges"
ON public.game_challenges FOR INSERT
WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Users can update their challenges"
ON public.game_challenges FOR UPDATE
USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

-- Enable realtime for challenges
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;

-- Create function to check if users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user1_id = user_a AND user2_id = user_b)
       OR (user1_id = user_b AND user2_id = user_a)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to accept friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS JSON AS $$
DECLARE
  v_request RECORD;
  v_friendship_id UUID;
BEGIN
  -- Get the request
  SELECT * INTO v_request FROM public.friend_requests WHERE id = request_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  IF v_request.receiver_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Request already processed');
  END IF;
  
  -- Update request status
  UPDATE public.friend_requests SET status = 'accepted', updated_at = now() WHERE id = request_id;
  
  -- Create friendship (order IDs to avoid duplicates)
  INSERT INTO public.friendships (user1_id, user2_id)
  VALUES (
    LEAST(v_request.sender_id, v_request.receiver_id),
    GREATEST(v_request.sender_id, v_request.receiver_id)
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_friendship_id;
  
  RETURN json_build_object('success', true, 'friendship_id', v_friendship_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;