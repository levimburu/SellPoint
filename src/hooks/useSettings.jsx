import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const SettingsContext = createContext(null)

export const defaultSettings = {
  store_name: "Kagai's Agro",
  tagline: 'Your Trusted Agrovet Partner',
  address: 'Kitale, Trans-Nzoia County',
  phone: '+254 723 482 184',
  email: 'info@kagaisagro.co.ke',
  kra_pin: 'A000000000Z',
  receipt_footer: 'Thank you for your business!',
  currency: 'KES',
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single()
    if (data) setSettings(data)
    setLoading(false)
  }

  async function saveSettings(newSettings) {
    const { error } = await supabase
      .from('store_settings')
      .upsert({ id: 1, ...newSettings })
    if (!error) setSettings(newSettings)
    return { error }
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, saveSettings, loadSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
