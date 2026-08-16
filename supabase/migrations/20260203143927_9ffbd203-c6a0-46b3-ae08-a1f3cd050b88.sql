-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;

-- Create a more comprehensive SELECT policy that handles newly created conversations
-- (uses security definer function to check participation OR just created)
CREATE POLICY "Users can view own conversations" 
ON public.conversations 
FOR SELECT 
USING (
  is_conversation_participant(id, auth.uid())
);