import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  // Sign in with username — converts to internal email behind the scenes
  async function signIn(username, password) {
    const email = username.toLowerCase().includes('@')
      ? username  // allow email login for existing admin accounts
      : `${username.toLowerCase()}@sellpoint.internal`

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // Give a friendly message instead of Supabase's technical one
      if (error.message.includes('Invalid login')) {
        throw new Error('Incorrect username or password')
      }
      throw error
    }
    return data
  }

  // Admin creates a new staff account
  async function createStaffAccount({ username, password, fullName, role }) {
    const { data, error } = await supabase.rpc('create_staff_account', {
      p_username: username.toLowerCase(),
      p_password: password,
      p_full_name: fullName,
      p_role: role,
      p_created_by: user?.id,
    })
    if (error) throw error
    return data
  }

  // Admin updates a staff member's profile
  async function updateStaffProfile(userId, updates) {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
    if (error) throw error
  }

  // Admin suspends or activates a staff account
  async function setStaffStatus(userId, status) {
    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', userId)
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signOut,
      createStaffAccount, updateStaffProfile, setStaffStatus,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}