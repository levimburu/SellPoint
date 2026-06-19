import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Checkout from './pages/Checkout'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import SalesHistory from './pages/SalesHistory'
import Reports from './pages/Reports'
import Tabs from './pages/Tabs'
import Settings from './pages/Settings'
import SalesAnalysis from './pages/SalesAnalysis'
import { SettingsProvider } from './hooks/useSettings'
import './index.css'

function AppContent() {
  const { user, loading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Loading Hedge Stores POS...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return <AuthPage />

  const pages = {
    dashboard: <Dashboard onNavigate={setCurrentPage} />,
    checkout: <Checkout />,
    inventory: <Inventory />,
    customers: <Customers />,
    sales: <SalesHistory />,
    tabs: <Tabs />,
    analysis: <SalesAnalysis />,
    reports: <Reports />,
    settings: <Settings />,
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {pages[currentPage] || pages.dashboard}
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
            background: 'var(--color-surface-2)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: 'var(--color-primary)', secondary: '#000' } },
        }}
      />
      <AppContent />
    </AuthProvider>
    </SettingsProvider>
  )
}
