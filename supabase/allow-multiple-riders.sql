-- Allow one registrant account to register multiple riders in the same event.
-- Run this in Supabase SQL Editor.

DO $$
DECLARE
  c record;
BEGIN
  -- Drop all known unique constraints that force one row per user/event or email/event.
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.registration_forms'::regclass
      AND conname IN (
        'ux_registration_forms_user_event',
        'registration_forms_user_event_unique',
        'ux_registration_forms_email_event',
        'registration_forms_email_event_unique'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.registration_forms DROP CONSTRAINT %I', c.conname);
  END LOOP;
END
$$;

-- Drop matching unique indexes if they exist.
DROP INDEX IF EXISTS public.ux_registration_forms_user_event;
DROP INDEX IF EXISTS public.registration_forms_user_event_unique;
DROP INDEX IF EXISTS public.ux_registration_forms_email_event;
DROP INDEX IF EXISTS public.registration_forms_email_event_unique;

-- Keep lookups fast without enforcing uniqueness.
CREATE INDEX IF NOT EXISTS ix_registration_forms_user_event
  ON public.registration_forms (user_id, event_id);

CREATE INDEX IF NOT EXISTS ix_registration_forms_email_event
  ON public.registration_forms (registrant_email, event_id);
