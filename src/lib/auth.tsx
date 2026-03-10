import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import styles from '../pages/Landing/Landing.module.css'

interface User {
  id: string
  email: string
}

interface AuthState {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const LOCAL_USER = { id: 'local-user', email: 'local@telexa.app' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(isSupabaseConfigured ? null : LOCAL_USER)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user?.email) {
        setUser({ id: session.user.id, email: session.user.email })
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user?.email) {
        setUser({ id: session.user.id, email: session.user.email })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' }
    })
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut()
    setUser(null)
  }

  // If Supabase is configured but user is not logged in, force them to land/login
  // The router handles redirection, but we can provide the sign in method here
  if (isSupabaseConfigured && loading) {
    return <div className={styles.loadingScreen}>Завантаження Telexa...</div>
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
