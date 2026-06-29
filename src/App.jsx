import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import CashierDashboard from './pages/CashierDashboard'
import Checkout from './pages/Checkout'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import SalesHistory from './pages/SalesHistory'
import Reports from './pages/Reports'
import Tabs from './pages/Tabs'
import Settings from './pages/Settings'
import SalesAnalysis from './pages/SalesAnalysis'
import Staff from './pages/Staff'
import Suppliers from './pages/Suppliers'
import Purchases from './pages/Purchases'
import { SettingsProvider } from './hooks/useSettings'
import { pullAll, drainQueue } from './lib/sync'
import './index.css'

function AppContent() {
  const { user, profile, loading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')

  // Mirror cloud data into the local store on login and whenever
  // the connection comes back, so pages can read offline.
  useEffect(() => {
    if (!user) return
    // Push up any offline changes first, then pull fresh cloud data down.
    const sync = async () => { await drainQueue(); await pullAll() }
    sync()
    const onReconnect = () => sync()
    window.addEventListener('online', onReconnect)
    return () => window.removeEventListener('online', onReconnect)
  }, [user])

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Loading SellPoint...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return <AuthPage />

  const isAdmin = profile?.role === 'admin'
  const isSuspended = profile?.status === 'suspended'

  // Suspended account screen
  if (isSuspended) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', flexDirection: 'column', gap: '12px', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text)' }}>Account Suspended</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px', maxWidth: '320px' }}>Your account has been suspended. Please contact your administrator.</p>
      </div>
    )
  }

  // Admin pages — full access
  const adminPages = {
    dashboard: <Dashboard onNavigate={setCurrentPage} />,
    checkout: <Checkout />,
    inventory: <Inventory />,
    customers: <Customers />,
    sales: <SalesHistory />,
    tabs: <Tabs />,
    analysis: <SalesAnalysis />,
    reports: <Reports />,
    settings: <Settings />,
    staff: <Staff />,
    suppliers: <Suppliers />,
    purchases: <Purchases />,
  }

  // Cashier pages — restricted access
  const cashierPages = {
    dashboard: <CashierDashboard onNavigate={setCurrentPage} />,
    checkout: <Checkout />,
    inventory: <Inventory readOnly />,
    customers: <Customers />,
    sales: <SalesHistory />,
    tabs: <Tabs />,
  }

  const pages = isAdmin ? adminPages : cashierPages

  // If cashier tries to access a restricted page, redirect to dashboard
  const currentContent = pages[currentPage] || pages['dashboard']

  function handleNavigate(page) {
    if (!isAdmin && !cashierPages[page]) return // block restricted pages
    setCurrentPage(page)
  }

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate} isAdmin={isAdmin}>
      {currentContent}
    </Layout>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: 'var(--color-primary)', secondary: '#fff' } },
          }}
        />
        <AppContent />
      </AuthProvider>
    </SettingsProvider>
  )
}