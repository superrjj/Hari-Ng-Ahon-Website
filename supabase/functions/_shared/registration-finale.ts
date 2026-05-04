// @ts-nocheck
// Shared PayMongo-paid finalization helpers (bundles + bib assignment).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export function extractBibSequenceByPrefix(bibNumber: string, prefix: string) {
  const value = String(bibNumber ?? '').trim()
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = value.match(new RegExp(`^${escapedPrefix}(\\d+)$`))
  if (!match) return 0
  const n = Number.parseInt(match[1], 10)
  return Number.isFinite(n) ? n : 0
}

/** Assign bib for one registration if missing; registration should already be status confirmed when paid. */
export async function assignBibIfMissing(supabase: SupabaseClient, registrationId: string) {
  const now = new Date().toISOString()
  const { data: registration, error: registrationError } = await supabase
    .from('registration_forms')
    .select('id, race_category_id, bib_number')
    .eq('id', registrationId)
    .maybeSingle()
  if (registrationError) throw registrationError
  if (!registration?.id) throw new Error('Registration not found while assigning bib.')
  if (String(registration.bib_number ?? '').trim()) return
  if (!registration.race_category_id) throw new Error('Missing race category for registration.')

  const { data: raceCategory, error: raceCategoryError } = await supabase
    .from('race_categories')
    .select('code, category_name, rider_limit')
    .eq('id', registration.race_category_id)
    .maybeSingle()
  if (raceCategoryError) throw raceCategoryError
  const categoryCode = String(raceCategory?.code ?? '').trim()
  if (!categoryCode) throw new Error('Missing category code for registration category.')

  const { data: existingBibs, error: bibError } = await supabase
    .from('registration_forms')
    .select('bib_number')
    .eq('race_category_id', registration.race_category_id)
    .eq('status', 'confirmed')
    .not('bib_number', 'is', null)
    .order('created_at', { ascending: true })
    .limit(5000)
  if (bibError) throw bibError

  const maxSequence = (existingBibs ?? []).reduce((max: number, row: { bib_number: string }) => {
    const seq = extractBibSequenceByPrefix(row.bib_number, categoryCode)
    return seq > max ? seq : max
  }, 0)
  const nextSequence = maxSequence + 1
  const riderLimit = Number(raceCategory?.rider_limit ?? 0)
  if (Number.isFinite(riderLimit) && riderLimit > 0 && nextSequence > riderLimit) {
    throw new Error(
      `Category limit reached for ${String(raceCategory?.category_name ?? categoryCode)}. Max riders: ${riderLimit}.`,
    )
  }
  if (nextSequence > 99) {
    throw new Error(`Category bib sequence exceeded 2 digits for category code ${categoryCode}.`)
  }
  const nextBib = `${categoryCode}${String(nextSequence).padStart(2, '0')}`

  const { error: updateError } = await supabase
    .from('registration_forms')
    .update({ bib_number: nextBib, updated_at: now })
    .eq('id', registrationId)
  if (updateError) throw updateError
}

export async function markRegistrationConfirmed(
  supabase: SupabaseClient,
  registrationId: string,
  paidNow: string,
) {
  const { error } = await supabase
    .from('registration_forms')
    .update({
      status: 'confirmed',
      confirmed_at: paidNow,
      updated_at: paidNow,
    })
    .eq('id', registrationId)
  if (error) throw error
}

/**
 * Confirm + bib for every registration row in the same PayMongo checkout bundle (same `checkout_bundle_id` + `user_id`).
 * The primary row is usually already confirmed by the caller; this keeps sibling rows in sync.
 */
export async function finalizeBundleSiblingsPaid(supabase: SupabaseClient, primaryRegistrationId: string) {
  const { data: primary, error: pErr } = await supabase
    .from('registration_forms')
    .select('id, checkout_bundle_id, user_id')
    .eq('id', primaryRegistrationId)
    .maybeSingle()
  if (pErr) throw pErr
  const bundleId = primary?.checkout_bundle_id ? String(primary.checkout_bundle_id) : ''
  const userId = primary?.user_id ? String(primary.user_id) : ''
  if (!bundleId || !userId || !primary?.id) return

  const paidNow = new Date().toISOString()
  const { error: bundleConfirmErr } = await supabase
    .from('registration_forms')
    .update({
      status: 'confirmed',
      confirmed_at: paidNow,
      updated_at: paidNow,
    })
    .eq('checkout_bundle_id', bundleId)
    .eq('user_id', userId)
  if (bundleConfirmErr) throw bundleConfirmErr

  const { data: bundleRows, error: listErr } = await supabase
    .from('registration_forms')
    .select('id')
    .eq('checkout_bundle_id', bundleId)
    .eq('user_id', userId)
  if (listErr) throw listErr

  const bibErrors: string[] = []
  for (const row of bundleRows ?? []) {
    if (!row?.id) continue
    try {
      await assignBibIfMissing(supabase, row.id)
    } catch (e) {
      // Collect per-row errors so one failure doesn't block the rest of the bundle.
      bibErrors.push(`[${row.id}] ${(e as Error).message}`)
      console.error('[finalizeBundleSiblingsPaid] assignBibIfMissing failed for', row.id, e)
    }
  }
  if (bibErrors.length > 0) {
    throw new Error(`Bib assignment failed for some registrations: ${bibErrors.join('; ')}`)
  }
}
