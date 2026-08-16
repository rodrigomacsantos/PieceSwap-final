-- Create the function to get email by username or email for login
CREATE OR REPLACE FUNCTION public.get_email_by_username_or_email(identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- If identifier looks like an email, return it directly
  IF identifier LIKE '%@%' THEN
    RETURN identifier;
  ELSE
    -- Otherwise, look up the email by username
    SELECT au.email INTO user_email
    FROM auth.users au
    JOIN public.profiles p ON au.id = p.id
    WHERE p.username = identifier;

    RETURN user_email;
  END IF;
END;
$$;