-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user1_id = user_a AND user2_id = user_b)
       OR (user1_id = user_b AND user2_id = user_a)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS JSON AS $$
DECLARE
  v_request RECORD;
  v_friendship_id UUID;
BEGIN
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
  
  UPDATE public.friend_requests SET status = 'accepted', updated_at = now() WHERE id = request_id;
  
  INSERT INTO public.friendships (user1_id, user2_id)
  VALUES (
    LEAST(v_request.sender_id, v_request.receiver_id),
    GREATEST(v_request.sender_id, v_request.receiver_id)
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_friendship_id;
  
  RETURN json_build_object('success', true, 'friendship_id', v_friendship_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;