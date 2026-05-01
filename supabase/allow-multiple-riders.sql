-- Allow one registrant account to register multiple riders in the same event.
-- Run this in Supabase SQL Editor.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ux_registration_forms_user_event'
  ) THEN
    ALTER TABLE public.registration_forms
      DROP CONSTRAINT ux_registration_forms_user_event;
  END IF;
END
$$;

DROP INDEX IF EXISTS public.ux_registration_forms_user_event;

-- Keep lookups fast without enforcing uniqueness.
CREATE INDEX IF NOT EXISTS ix_registration_forms_user_event
  ON public.registration_forms (user_id, event_id);
