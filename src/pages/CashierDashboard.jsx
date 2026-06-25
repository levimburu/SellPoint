import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ShoppingCart, Package, Users, AlertTriangle } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'

export default function CashierDashboard({ onNavigate }) {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ todayOrders: 0, lowStock: 0, totalCustomers: 0 })
  const [recentSales, setRecentSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    setLoading(true)
    const todayStart = startOfDay(new Date()).toISOString()
    const todayEnd = endOfDay(new Date()).toISOString()

    const [salesRes, productsRes, customersRes, recentRes] = await Promise.all([
      supabase.from('sales').select('id').gte('created_at', todayStart).lte('created_at', todayEnd),
      supabase.from('products').select('id, stock_qty, low_stock_alert').eq('is_active', true),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('sales').select('id, total, payment_method, created_at, customers(name)').order('created_at', { ascending: false }).limit(5),
    ])

    const todayOrders = salesRes.data?.length || 0
    const lowStock = productsRes.data?.filter(p => p.stock_qty <= (p.low_stock_alert || 5)).length || 0
    const totalCustomers = customersRes.count || 0

    setStats({ todayOrders, lowStock, totalCustomers })
    setRecentSales(recentRes.data || [])
    setLoading(false)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting()}, {profile?.full_name?.split(' ')[0] || 'there'} 👋</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, d MMMM yyyy')} — Ready to serve customers</p>
        </div>
        <button className="btn-primary" onClick={() => onNavigate('checkout')}>
          <ShoppingCart size={16} /> New Sale
        </button>
      </div>

      {/* Simple stat cards - no revenue/profit */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Orders Today</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-text)', marginTop: '6px' }}>{stats.todayOrders}</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(8,145,178,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={18} color="#0891b2" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Customers</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-text)', marginTop: '6px' }}>{stats.totalCustomers}</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#a78bfa" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Low Stock Items</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: stats.lowStock > 0 ? 'var(--color-warning)' : 'var(--color-text)', marginTop: '6px' }}>{stats.lowStock}</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(146,64,14,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} color="var(--color-warning)" />
            </div>
          </div>
        </div>
      </div>

      {/* Low stock alert */}
      {stats.lowStock > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-warning-bg)', border: '1px solid rgba(146,64,14,0.2)', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px' }}>
          <AlertTriangle size={18} color="var(--color-warning)" />
          <span style={{ fontSize: '14px', color: 'var(--color-warning)', fontWeight: '500' }}>
            {stats.lowStock} product{stats.lowStock > 1 ? 's are' : ' is'} running low on stock — notify your manager
          </span>
        </div>
      )}

      {/* Recent sales */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Recent Sales</h3>
          <button onClick={() => onNavigate('sales')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '500' }}>
            View all
          </button>
        </div>
        {recentSales.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: '13px', padding: '30px 0' }}>No sales yet today</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentSales.map(sale => (
              <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'var(--color-surface-2)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{sale.customers?.name || 'Walk-in'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                    {format(new Date(sale.created_at), 'HH:mm')} · {sale.payment_method?.replace('_', ' ')}
                  </div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-primary)' }}>
                  KES {Number(sale.total).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}