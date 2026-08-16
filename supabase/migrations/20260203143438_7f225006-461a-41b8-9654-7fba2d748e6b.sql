-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;

-- Create a simple policy using standard subquery (no function needed)
CREATE POLICY "Users can view own conversations" 
ON public.conversations 
FOR SELECT 
USING (
  id IN (
    SELECT conversation_id 
    FROM public.conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- Ensure conversation_participants policies are correct
DROP POLICY IF EXISTS "Users can view own participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can insert own participation" ON public.conversation_participants;

CREATE POLICY "Users can view own participation" 
ON public.conversation_participants 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own participation" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (user_id = auth.uid());