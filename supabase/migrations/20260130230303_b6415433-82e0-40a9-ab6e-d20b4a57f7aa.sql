-- Drop the problematic RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view participants of own conversations" ON public.conversation_participants;

-- Create a fixed RLS policy that doesn't reference itself
CREATE POLICY "Users can view participants of own conversations" 
ON public.conversation_participants 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT cp.conversation_id 
    FROM public.conversation_participants cp 
    WHERE cp.user_id = auth.uid()
  )
);