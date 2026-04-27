import { createClient } from '@supabase/supabase-js'

const databaseUrl = import.meta.env.VITE_DATABASE_URL
const databaseAnonKey = import.meta.env.VITE_DATABASE_ANON_KEY

export const supabase = createClient(
  databaseUrl,
  databaseAnonKey
)