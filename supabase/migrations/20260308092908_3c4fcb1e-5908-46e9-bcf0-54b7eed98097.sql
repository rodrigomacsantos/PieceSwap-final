
-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own participation" ON public.conversation_participants;

-- Create a new policy that allows viewing all participants in conversations you belong to
CREATE POLICY "Users can view participants in own conversations"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  public.is_conversation_participant(conversation_id, auth.uid())
);
