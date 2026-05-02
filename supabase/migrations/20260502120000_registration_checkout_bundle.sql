-- Multi-entry checkout: tie several registration_forms to one PayMongo payment.
alter table public.registration_forms
  add column if not exists checkout_bundle_id uuid,
  add column if not exists entry_event_type_slug text,
  add column if not exists entry_event_type_label text;

create index if not exists ix_registration_forms_checkout_bundle
  on public.registration_forms (checkout_bundle_id)
  where checkout_bundle_id is not null;

alter table public.payment_orders
  add column if not exists checkout_bundle_id uuid;

create index if not exists ix_payment_orders_checkout_bundle_id
  on public.payment_orders (checkout_bundle_id)
  where checkout_bundle_id is not null;

comment on column public.registration_forms.entry_event_type_label is 'Rider-selected event type label for certificates (one row per selection).';
comment on column public.registration_forms.checkout_bundle_id is 'Links multiple registrations paid together with payment_orders.checkout_bundle_id.';
