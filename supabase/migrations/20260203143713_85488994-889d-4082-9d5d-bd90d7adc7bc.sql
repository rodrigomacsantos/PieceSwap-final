-- Remove the old recursive policy for viewing participants
DROP POLICY IF EXISTS "Users can view participants of own conversations" ON public.conversation_participants;