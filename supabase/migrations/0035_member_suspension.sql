-- Sospensione/blocco account da parte dell'azienda. Un membro sospeso viene
-- disconnesso automaticamente al primo caricamento di una pagina del back
-- office (vedi (dashboard)/layout.tsx) e non può più accedere finché non
-- viene riattivato. L'account aziendale (activity_code = 0) non è mai
-- sospendibile.
alter table members add column if not exists suspended boolean not null default false;
alter table members add column if not exists suspended_at timestamptz;
alter table members add column if not exists suspended_by integer references members (activity_code);
alter table members add column if not exists suspended_reason text;

create or replace function admin_suspend_member(p_target_code integer, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if p_target_code = 0 then
    raise exception 'Non è possibile sospendere l''account aziendale';
  end if;
  if not exists (select 1 from members where activity_code = p_target_code) then
    raise exception 'Membro % non trovato', p_target_code;
  end if;

  update members set
    suspended = true,
    suspended_at = now(),
    suspended_by = caller,
    suspended_reason = nullif(trim(p_reason), '')
  where activity_code = p_target_code;

  perform log_admin_action('member_suspended', p_target_code, jsonb_strip_nulls(jsonb_build_object('reason', p_reason)));
end;
$$;

revoke all on function admin_suspend_member(integer, text) from public, anon;
grant execute on function admin_suspend_member(integer, text) to authenticated;

create or replace function admin_unsuspend_member(p_target_code integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;

  update members set
    suspended = false,
    suspended_at = null,
    suspended_by = null,
    suspended_reason = null
  where activity_code = p_target_code;

  perform log_admin_action('member_unsuspended', p_target_code, null);
end;
$$;

revoke all on function admin_unsuspend_member(integer) from public, anon;
grant execute on function admin_unsuspend_member(integer) to authenticated;
