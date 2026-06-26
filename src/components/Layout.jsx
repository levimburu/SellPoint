import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  BarChart3, ShoppingBag, LogOut, ChevronRight, FileText, CreditCard, Settings, TrendingUp, Truck
} from 'lucide-react'
import toast from 'react-hot-toast'

const adminNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'checkout', label: 'Checkout', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'tabs', label: 'Customer Tabs', icon: CreditCard },
  { id: 'analysis', label: 'Sales Analysis', icon: TrendingUp },
  { id: 'sales', label: 'Sales History', icon: FileText },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'purchases', label: 'Stock Purchases', icon: Package },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const cashierNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'checkout', label: 'Checkout', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'tabs', label: 'Customer Tabs', icon: CreditCard },
  { id: 'sales', label: 'Sales History', icon: FileText },
]

export default function Layout({ currentPage, onNavigate, children, isAdmin = false }) {
  const { profile, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-bg)' }}>

      {/* Sidebar — dark green, white text */}
      <aside style={{
        width: sidebarOpen ? '224px' : '64px',
        background: 'var(--color-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 5,
      }}>

        {/* Decorative leaf pattern background */}
        <svg style={{ position: 'absolute', top: 0, left: 0, opacity: 0.06, pointerEvents: 'none' }} width="224" height="100%" viewBox="0 0 220 480" preserveAspectRatio="xMidYMin slice">
          <path d="M30 60 Q10 40 25 15 Q45 5 55 25 Q60 45 30 60Z" fill="#ffffff" />
          <path d="M190 200 Q210 180 200 155 Q180 145 170 165 Q165 185 190 200Z" fill="#ffffff" />
          <path d="M20 350 Q0 330 12 305 Q32 295 42 315 Q47 335 20 350Z" fill="#ffffff" />
        </svg>

        {/* Logo */}
        <div style={{
          padding: '0 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          height: '64px',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShoppingBag size={17} color="#ffffff" />
          </div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', whiteSpace: 'nowrap', letterSpacing: '-0.3px' }}>
                SellPoint
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', fontWeight: '500' }}>
                Hedge Stores
              </div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '1px', overflowY: 'hidden', position: 'relative', zIndex: 1 }}>
          {(isAdmin ? adminNavItems : cashierNavItems).map(({ id, label, icon: Icon }) => {
            const active = currentPage === id
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: sidebarOpen ? '7px 12px' : '7px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: active ? '600' : '500',
                  color: active ? '#FB923C' : 'rgba(255,255,255,0.55)',
                  background: active ? 'rgba(249,115,22,0.15)' : 'transparent',
                  cursor: 'pointer',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' } }}
                title={!sidebarOpen ? label : undefined}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                {sidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
              </button>
            )
          })}
        </nav>


        {/* Settings + User + Sign out */}
        <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 1 }}>
          {sidebarOpen && profile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', marginBottom: '6px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '9px',
              border: '0.5px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(125,218,88,0.25)',
                border: '1px solid rgba(125,218,88,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '800', color: '#ffffff',
              }}>
                {profile.full_name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile.full_name}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontWeight: '500' }}>
                  {profile.role === 'admin' ? 'Admin' : 'Cashier'}
                </div>
              </div>
            </div>
          )}




          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: sidebarOpen ? '7px 12px' : '7px',
              borderRadius: '8px',
              fontSize: '13px', fontWeight: '500',
              color: 'rgba(255,255,255,0.75)',
              background: 'transparent',
              cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title={!sidebarOpen ? 'Sign Out' : undefined}
          >
            <LogOut size={17} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarOpen(s => !s)}
        style={{
          position: 'fixed',
          left: sidebarOpen ? '208px' : '48px',
          top: '22px',
          width: '22px', height: '22px',
          borderRadius: '50%',
          background: 'var(--color-sidebar)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 10,
          transition: 'left 0.2s ease',
          color: 'rgba(255,255,255,0.4)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <ChevronRight size={11} style={{ transform: sidebarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '20px 24px', height: '100vh', background: 'var(--color-bg)' }}>
        {children}
      </main>


    </div>
  )
}