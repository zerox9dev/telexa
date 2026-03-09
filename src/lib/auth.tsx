import { createContext, useContext, useState, type ReactNode } from 'react'

interface AuthState {
  user: { id: string; email: string } | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

// Temporary local user — no Supabase auth required
const LOCAL_USER = { id: 'local-user', email: 'local@telexa.app' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState(LOCAL_USER)

  const signInWithGoogle = async () => {
    // TODO: Supabase Google OAuth
    console.log('Google auth not configured yet')
  }

  const signOut = async () => {
    // TODO: Supabase sign out
    console.log('Sign out not configured yet')
  }

  return (
    <AuthContext.Provider value={{ user, loading: false, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
