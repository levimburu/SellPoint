import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  BarChart3, LogOut, ChevronRight, FileText, CreditCard, Settings, TrendingUp, Truck, Menu, X
} from 'lucide-react'
import { LogoIcon } from '../assets/Logo'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const adminNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'checkout', label: 'Checkout', icon: ShoppingCart, desktopOnly: true },
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}


// Small online/offline + pending-sync indicator
function SyncBadge({ compact = false }) {
  const { online, pending } = useOnlineStatus()
  const color = online ? '#16a34a' : '#94a3b8'
  const bg = online ? 'rgba(22,163,74,0.12)' : 'rgba(148,163,184,0.15)'
  return (
    <div title={online ? 'Online' : 'Offline — changes saved locally'}
      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: compact ? '4px 8px' : '6px 10px',
        background: bg, borderRadius: '7px', border: `0.5px solid ${color}40` }}>
      {online ? <Wifi size={13} color={color} /> : <WifiOff size={13} color={color} />}
      <span style={{ fontSize: '11px', color, fontWeight: '600' }}>{online ? 'Online' : 'Offline'}</span>
      {pending > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: 'auto', fontSize: '10px', color: '#EA580C', fontWeight: '700' }}>
          <RefreshCw size={10} /> {pending}
        </span>
      )}
    </div>
  )
}

export default function Layout({ currentPage, onNavigate, children, isAdmin = false }) {
  const { profile, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out')
  }

  function handleNavigate(id) {
    onNavigate(id)
    if (isMobile) setMobileMenuOpen(false)
  }

  // On mobile, filter out checkout for admins
  const navItems = isAdmin
    ? (isMobile ? adminNavItems.filter(i => !i.desktopOnly) : adminNavItems)
    : cashierNavItems

  // If admin on mobile tries to access checkout, redirect to dashboard
  useEffect(() => {
    if (isMobile && isAdmin && currentPage === 'checkout') {
      onNavigate('dashboard')
    }
  }, [isMobile, isAdmin, currentPage])

  // ── MOBILE LAYOUT ──────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="mobile-shell" style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>

        {/* Mobile top bar */}
        <div style={{ background: 'var(--color-sidebar)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogoIcon size={28} color="#F97316" />
            <svg width="90" height="18" viewBox="0 0 90 18" xmlns="http://www.w3.org/2000/svg">
              <text x="0" y="14" fontFamily="system-ui" fontWeight="800" fontSize="14" fill="#ffffff">
                Sell<tspan fill="#F97316">Point</tspan>
              </text>
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SyncBadge compact />
          <button onClick={() => setMobileMenuOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '4px' }}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div style={{ background: 'var(--color-sidebar)', position: 'absolute', top: '52px', left: 0, right: 0, zIndex: 50, borderBottom: '2px solid var(--color-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', maxHeight: '70vh', overflowY: 'auto' }}>
              {navItems.map(({ id, label, icon: Icon }) => {
                const active = currentPage === id
                return (
                  <button key={id} onClick={() => handleNavigate(id)} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px',
                    borderRadius: '8px', fontSize: '13px', fontWeight: active ? '600' : '400',
                    color: active ? '#FB923C' : 'rgba(255,255,255,0.7)',
                    background: active ? 'rgba(249,115,22,0.15)' : 'transparent',
                    border: active ? '0.5px solid rgba(249,115,22,0.3)' : 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <Icon size={16} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                  </button>
                )
              })}
            </div>
            {/* User + sign out */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(249,115,22,0.2)', border: '1.5px solid rgba(249,115,22,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#FB923C' }}>
                  {profile?.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{profile?.full_name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{profile?.role === 'admin' ? 'Admin' : 'Cashier'}</div>
                </div>
              </div>
              <button onClick={handleSignOut} style={{ background: 'rgba(239,68,68,0.12)', border: 'none', borderRadius: '7px', padding: '7px 12px', color: '#f87171', fontSize: '12px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Mobile main content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '14px', background: 'var(--color-bg)' }}>
          {children}
        </main>

        {/* Mobile bottom nav (most used pages) */}
        <div style={{ background: 'var(--color-sidebar)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '6px 0 calc(8px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'space-around', flexShrink: 0, zIndex: 20 }}>
          {[
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'sales', label: 'Sales', icon: FileText },
            { id: 'inventory', label: 'Stock', icon: Package },
            { id: 'analysis', label: 'Analytics', icon: TrendingUp },
            { id: 'customers', label: 'Customers', icon: Users },
          ].map(({ id, label, icon: Icon }) => {
            const active = currentPage === id
            return (
              <button key={id} onClick={() => handleNavigate(id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px',
                color: active ? '#FB923C' : 'rgba(255,255,255,0.45)',
              }}>
                <Icon size={20} />
                <span style={{ fontSize: '10px', fontWeight: active ? '600' : '400' }}>{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── DESKTOP LAYOUT ──────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-bg)' }}>

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

        {/* Decorative leaf pattern */}
        <svg style={{ position: 'absolute', top: 0, left: 0, opacity: 0.06, pointerEvents: 'none' }} width="224" height="100%" viewBox="0 0 220 480" preserveAspectRatio="xMidYMin slice">
          <path d="M30 60 Q10 40 25 15 Q45 5 55 25 Q60 45 30 60Z" fill="#ffffff" />
          <path d="M190 200 Q210 180 200 155 Q180 145 170 165 Q165 185 190 200Z" fill="#ffffff" />
          <path d="M20 350 Q0 330 12 305 Q32 295 42 315 Q47 335 20 350Z" fill="#ffffff" />
        </svg>

        {/* Logo */}
        <div style={{ padding: '0 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px', height: '64px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ width: '34px', height: '34px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogoIcon size={34} color="#F97316" />
          </div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <svg width="100" height="20" viewBox="0 0 100 20" xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="16" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="16" fill="#ffffff">
                  Sell<tspan fill="#F97316">Point</tspan>
                </text>
              </svg>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', fontWeight: '500', marginTop: '-2px' }}>
                Hedge Stores
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '1px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = currentPage === id
            return (
              <button key={id} onClick={() => onNavigate(id)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: sidebarOpen ? '7px 12px' : '7px',
                borderRadius: '8px', fontSize: '13px', fontWeight: active ? '600' : '500',
                color: active ? '#FB923C' : 'rgba(255,255,255,0.55)',
                background: active ? 'rgba(249,115,22,0.15)' : 'transparent',
                border: active ? '0.5px solid rgba(249,115,22,0.2)' : 'none',
                cursor: 'pointer', width: '100%', textAlign: 'left',
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

        {/* User + sign out */}
        <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 1 }}>
          {sidebarOpen && (
            <div style={{ marginBottom: '6px' }}><SyncBadge /></div>
          )}
          {sidebarOpen && profile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', marginBottom: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '9px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, background: 'rgba(249,115,22,0.2)', border: '1.5px solid rgba(249,115,22,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: '#FB923C' }}>
                {profile.full_name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.full_name}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>{profile.role === 'admin' ? 'Admin' : 'Cashier'}</div>
              </div>
              <LogOut size={14} style={{ marginLeft: 'auto', flexShrink: 0, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }} onClick={handleSignOut} />
            </div>
          )}
          <button onClick={handleSignOut} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: sidebarOpen ? '7px 12px' : '7px',
            borderRadius: '8px', fontSize: '13px', fontWeight: '500',
            color: 'rgba(255,255,255,0.55)', background: 'transparent',
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
      <button onClick={() => setSidebarOpen(s => !s)} style={{
        position: 'fixed', left: sidebarOpen ? '208px' : '48px', top: '22px',
        width: '22px', height: '22px', borderRadius: '50%',
        background: 'var(--color-sidebar)', border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 10, transition: 'left 0.2s ease',
        color: 'rgba(255,255,255,0.4)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        <ChevronRight size={11} style={{ transform: sidebarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '16px 20px', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </main>
    </div>
  )
}