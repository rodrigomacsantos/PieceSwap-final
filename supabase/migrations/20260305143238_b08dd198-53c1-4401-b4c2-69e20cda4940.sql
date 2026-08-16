-- Function to find existing conversation between two users for a specific listing
CREATE OR REPLACE FUNCTION public.find_existing_conversation(
  _user1_id uuid,
  _user2_id uuid,
  _listing_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv_id uuid;
BEGIN
  -- Find conversations where both users are participants
  IF _listing_id IS NOT NULL THEN
    SELECT c.id INTO _conv_id
    FROM conversations c
    WHERE c.listing_id = _listing_id
      AND EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = _user1_id)
      AND EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = _user2_id)
    LIMIT 1;
  ELSE
    SELECT c.id INTO _conv_id
    FROM conversations c
    WHERE EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = _user1_id)
      AND EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = _user2_id)
    ORDER BY c.updated_at DESC
    LIMIT 1;
  END IF;

  RETURN _conv_id;
END;
$$;

-- Function to mark messages as read by a conversation participant
CREATE OR REPLACE FUNCTION public.mark_messages_read(_conversation_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  -- Mark all messages from OTHER users as read
  UPDATE messages
  SET read = true
  WHERE conversation_id = _conversation_id
    AND sender_id != _user_id
    AND read = false;
END;
$$;