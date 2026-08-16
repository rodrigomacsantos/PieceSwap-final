create function public.get_email_by_username_or_email(identifier text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  user_email text;
begin
  if identifier like '%@%' then
    return identifier;
  else
    select au.email into user_email
    from auth.users au
    join public.profiles p on au.id = p.id
    where p.username = identifier;

    return user_email;
  end if;
end;
$$;
