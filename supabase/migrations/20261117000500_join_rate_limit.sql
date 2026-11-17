-- A wrong code must not raise: raising rolls back the recorded attempt, which silently
-- disabled the rate limit. An unknown code now returns zero rows instead.
create or replace function public.join_college(p_code text, p_display_name text)
returns table (college_id uuid, college_name text, role public.member_role)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
  v_invite public.invite_codes;
  v_existing public.memberships;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if (select count(*) from private.join_attempts a
      where a.user_id = v_uid and a.attempted_at > now() - interval '10 minutes') >= 10 then
    raise exception 'too_many_attempts' using errcode = '54000';
  end if;
  insert into private.join_attempts (user_id) values (v_uid);

  select * into v_invite from public.invite_codes where code = v_code;
  if not found then return; end if;

  select * into v_existing from public.memberships where user_id = v_uid;
  if found then
    if v_existing.college_id <> v_invite.college_id then
      raise exception 'already_member' using errcode = '23505';
    end if;
  else
    insert into public.memberships (user_id, college_id, role, display_name)
    values (v_uid, v_invite.college_id, v_invite.role, btrim(p_display_name));
    perform private.bump(v_invite.college_id, 'member_joined');
  end if;

  return query
    select c.id, c.name, m.role
    from public.colleges c join public.memberships m on m.college_id = c.id
    where m.user_id = v_uid;
end $$;
