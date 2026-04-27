import { supabase } from '../lib/supabase'
import type { Event } from '../types'

export const api = {
  async upcomingEvents(raceType?: string) {
    let query = supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('event_date', { ascending: true })

    if (raceType && raceType !== 'all') query = query.eq('race_type', raceType)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Event[]
  },

  async eventDetails(id: string) {
    const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data as Event | null
  },
}
