-- Seller document storage and approval guardrails.
-- Private bucket: uploads are performed server-side using the service role;
-- admin previews are short-lived signed URLs only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seller-verification-documents','seller-verification-documents',false,10485760,
  array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public=false,
  file_size_limit=10485760,
  allowed_mime_types=excluded.allowed_mime_types;

create index if not exists seller_verifications_store_submitted_idx
  on public.seller_verifications(store_id, submitted_at desc);

create or replace function public.app_review_seller_verification(
  target_verification_id uuid,
  requested_decision text,
  requested_review_note text default null
)
returns table(verification_id uuid, store_id uuid, decision text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  reviewed_id uuid;
  reviewed_store_id uuid;
  owner_id uuid;
  document_key text;
begin
  if not public.app_is_admin() then raise exception 'FORBIDDEN'; end if;
  if requested_decision not in ('approved','rejected') then raise exception 'INVALID_DECISION'; end if;
  if length(coalesce(requested_review_note,'')) > 1000 then raise exception 'INVALID_REVIEW_NOTE'; end if;
  if requested_decision='rejected' and length(btrim(coalesce(requested_review_note,''))) < 3 then
    raise exception 'REJECTION_NOTE_REQUIRED';
  end if;

  select sv.document_object_key into document_key
  from public.seller_verifications sv
  where sv.id=target_verification_id and sv.status='pending'
  for update;

  if not found then raise exception 'VERIFICATION_NOT_PENDING'; end if;
  if requested_decision='approved' and (document_key is null or length(document_key)<10) then
    raise exception 'VERIFICATION_DOCUMENT_REQUIRED';
  end if;

  update public.seller_verifications sv
  set status=requested_decision,
      review_note=nullif(btrim(requested_review_note),''),
      reviewer_user_id=public.app_current_user_id(),
      reviewed_at=now()
  where sv.id=target_verification_id and sv.status='pending'
  returning sv.id,sv.store_id into reviewed_id,reviewed_store_id;
  if reviewed_id is null then raise exception 'VERIFICATION_NOT_PENDING'; end if;

  if requested_decision='approved' then
    update public.stores s
    set status='active',approved_at=now(),updated_at=now()
    where s.id=reviewed_store_id
    returning s.owner_user_id into owner_id;
    if not found then raise exception 'STORE_NOT_FOUND'; end if;
    insert into public.user_roles(user_id,role) values(owner_id,'seller')
    on conflict (user_id,role) do nothing;
  end if;

  insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,metadata)
  values(public.app_current_user_id(),
    case when requested_decision='approved' then 'seller_application_approved' else 'seller_application_rejected' end,
    'seller_verification',reviewed_id,
    jsonb_build_object('store_id',reviewed_store_id,'decision',requested_decision));
  return query select reviewed_id,reviewed_store_id,requested_decision;
end;
$$;

create or replace function public.enforce_active_store_listing_publish()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare store_state public.store_status;
begin
  select s.status into store_state from public.stores s where s.id=new.store_id;
  if store_state is null then raise exception 'STORE_NOT_FOUND'; end if;
  if new.status='active' and store_state <> 'active' then
    raise exception 'STORE_NOT_APPROVED_FOR_PUBLISH';
  end if;
  return new;
end;
$$;

drop trigger if exists listings_require_approved_store on public.listings;
create trigger listings_require_approved_store
before insert or update of status,store_id on public.listings
for each row execute function public.enforce_active_store_listing_publish();
