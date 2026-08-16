-- Fix the conversations RLS policy that also has recursion issues
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;

-- Create a fixed RLS policy for conversations using the security definer function
CREATE POLICY "Users can view own conversations" 
ON public.conversations 
FOR SELECT 
USING (public.is_conversation_participant(id, auth.uid()));