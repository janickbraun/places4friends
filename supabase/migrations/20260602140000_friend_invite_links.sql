-- Friend invite links: max 10 uses, 1 month validity, new link per share action.

create table public.friend_invite_links (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  use_count integer not null default 0 check (use_count >= 0),
  max_uses integer not null default 10 check (max_uses > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index friend_invite_links_creator_id_idx on public.friend_invite_links (creator_id);
create index friend_invite_links_token_idx on public.friend_invite_links (token);

alter table public.friend_invite_links enable row level security;

create policy "Users can read own invite links"
  on public.friend_invite_links
  for select
  to authenticated
  using (creator_id = (select auth.uid()));

create policy "Users can create own invite links"
  on public.friend_invite_links
  for insert
  to authenticated
  with check (creator_id = (select auth.uid()));

grant select, insert on public.friend_invite_links to authenticated;
grant select, insert, update on public.friend_invite_links to service_role;

create or replace function public.validate_friend_invite_link(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link friend_invite_links%rowtype;
begin
  select * into v_link
  from public.friend_invite_links
  where token = p_token;

  if not found then
    return jsonb_build_object('valid', false, 'error', 'not_found');
  end if;

  if v_link.expires_at < now() then
    return jsonb_build_object(
      'valid', false,
      'error', 'expired',
      'creator_id', v_link.creator_id
    );
  end if;

  if v_link.use_count >= v_link.max_uses then
    return jsonb_build_object(
      'valid', false,
      'error', 'max_uses',
      'creator_id', v_link.creator_id
    );
  end if;

  return jsonb_build_object(
    'valid', true,
    'creator_id', v_link.creator_id,
    'remaining_uses', v_link.max_uses - v_link.use_count,
    'expires_at', v_link.expires_at
  );
end;
$$;

create or replace function public.redeem_friend_invite_link(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link friend_invite_links%rowtype;
begin
  select * into v_link
  from public.friend_invite_links
  where token = p_token
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_link.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired', 'creator_id', v_link.creator_id);
  end if;

  if v_link.use_count >= v_link.max_uses then
    return jsonb_build_object('ok', false, 'error', 'max_uses', 'creator_id', v_link.creator_id);
  end if;

  update public.friend_invite_links
  set use_count = use_count + 1
  where id = v_link.id;

  return jsonb_build_object('ok', true, 'creator_id', v_link.creator_id);
end;
$$;

revoke all on function public.validate_friend_invite_link(text) from public;
revoke all on function public.redeem_friend_invite_link(text) from public;
grant execute on function public.validate_friend_invite_link(text) to service_role;
grant execute on function public.redeem_friend_invite_link(text) to service_role;
