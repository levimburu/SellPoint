import { useState, useEffect } from 'react'
import { pendingSyncCount } from '../lib/localdb'

// Tracks whether the device currently has internet, plus how many
// local changes are waiting to be pushed to the cloud.
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    // Poll the pending-sync count every few seconds so the badge stays current.
    let active = true
    const tick = async () => {
      try {
        const n = await pendingSyncCount()
        if (active) setPending(n)
      } catch { /* db not ready yet */ }
    }
    tick()
    const interval = setInterval(tick, 4000)

    return () => {
      active = false
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(interval)
    }
  }, [])

  return { online, pending }
}