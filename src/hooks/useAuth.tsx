import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { jwtDecode } from 'jwt-decode'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types'

interface TokenPayload {
  role?: string
  user_role?: string
}

interface AuthContextValue {
  session: Session | null
  role: UserRole
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const role = useMemo<UserRole>(() => {
    const token = session?.access_token
    if (!token) return 'cyclist'
    try {
      const payload = jwtDecode<TokenPayload>(token)
      return payload.user_role === 'admin' || payload.role === 'admin' ? 'admin' : 'cyclist'
    } catch {
      return 'cyclist'
    }
  }, [session?.access_token])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      role,
      loading,
      login: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      register: async (email, password, fullName) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role: 'cyclist' },
          },
        })
        if (error) throw error
      },
      logout: async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
    }),
    [loading, role, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
