-- Pending payment records can expire after checkout window (application-enforced).
alter table public.registration_forms
  add column if not exists expires_at timestamptz;

comment on column public.registration_forms.expires_at is 'Optional expiry for pending_payment registrations (e.g. +30 minutes from creation).';
