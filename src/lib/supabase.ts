import { createClient } from '@supabase/supabase-js'

const databaseUrl = import.meta.env.VITE_SUPABASE_URL
const databaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(
  databaseUrl,
  databaseAnonKey
)