-- Leaving (or being removed from) a college must also forget the rider's saved stop.
-- Otherwise their "alert at 5 minutes" setting survives, and claim_arrival_alerts keeps
-- notifying someone who is no longer a member about that college's buses.
-- Written to be safe to run twice.

create or replace function private.forget_rider_prefs() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.rider_prefs where user_id = old.user_id and college_id = old.college_id;
  return old;
end $$;

drop trigger if exists memberships_forget_rider_prefs on public.memberships;
create trigger memberships_forget_rider_prefs
  after delete on public.memberships
  for each row execute function private.forget_rider_prefs();

-- Clean up preferences left behind before this trigger existed.
delete from public.rider_prefs p
where not exists (
  select 1 from public.memberships m where m.user_id = p.user_id and m.college_id = p.college_id
);
