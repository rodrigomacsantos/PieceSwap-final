-- Drop the still-problematic RLS policy
DROP POLICY IF EXISTS "Users can view participants of own conversations" ON public.conversation_participants;

-- Create a security definer function to check if user is in conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$$;

-- Create a fixed RLS policy using the security definer function
CREATE POLICY "Users can view participants of own conversations" 
ON public.conversation_participants 
FOR SELECT 
USING (public.is_conversation_participant(conversation_id, auth.uid()));