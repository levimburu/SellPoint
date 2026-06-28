import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { TrendingUp, ShoppingCart, Package, Users, AlertTriangle, ArrowUpRight, DollarSign } from 'lucide-react'
import { format, startOfDay, endOfDay, startOfMonth } from 'date-fns'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard({ onNavigate }) {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    todayRevenue: 0, todayProfit: 0, todayOrders: 0,
    totalProducts: 0, totalCustomers: 0, lowStock: 0,
  })
  const [recentSales, setRecentSales] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    setLoading(true)
    const todayStart = startOfDay(new Date()).toISOString()
    const todayEnd = endOfDay(new Date()).toISOString()
    const monthStart = startOfMonth(new Date()).toISOString()

    const [todaySalesRes, productsRes, customersRes, recentRes, chartRes, todayItemsRes] = await Promise.all([
      supabase.from('sales').select('id, total').gte('created_at', todayStart).lte('created_at', todayEnd),
      supabase.from('products').select('id, stock_qty, low_stock_alert').eq('is_active', true),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('sales').select('id, total, payment_method, created_at, customers(name)').order('created_at', { ascending: false }).limit(6),
      supabase.from('sales').select('total, created_at').gte('created_at', monthStart).order('created_at', { ascending: true }),
      supabase.from('sale_items').select('quantity, unit_price, products(cost_price)').gte('created_at', todayStart).lte('created_at', todayEnd),
    ])

    const todayRevenue = todaySalesRes.data?.reduce((s, r) => s + Number(r.total), 0) || 0
    const todayOrders = todaySalesRes.data?.length || 0
    const todayProfit = (todayItemsRes.data || []).reduce((sum, item) => {
      const cost = item.products?.cost_price
      if (cost == null) return sum
      return sum + (item.unit_price - cost) * item.quantity
    }, 0)
    const totalProducts = productsRes.data?.length || 0
    const lowStock = productsRes.data?.filter(p => p.stock_qty <= (p.low_stock_alert || 5)).length || 0
    const totalCustomers = customersRes.count || 0

    const grouped = {}
    chartRes.data?.forEach(s => {
      const day = format(new Date(s.created_at), 'dd MMM')
      grouped[day] = (grouped[day] || 0) + Number(s.total)
    })
    const chart = Object.entries(grouped).map(([day, revenue]) => ({ day, revenue }))

    setStats({ todayRevenue, todayProfit, todayOrders, totalProducts, totalCustomers, lowStock })
    setRecentSales(recentRes.data || [])
    setChartData(chart)
    setLoading(false)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const profitMargin = stats.todayRevenue > 0 ? ((stats.todayProfit / stats.todayRevenue) * 100).toFixed(1) : 0

  if (loading) return <LoadingState />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting()}, {profile?.full_name?.split(' ')[0] || 'there'} 👋</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, d MMMM yyyy')} — Today's overview</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={() => onNavigate('analysis')}>
            <TrendingUp size={16} /> Sales Analysis
          </button>
          <button className="btn-primary hide-mobile" onClick={() => onNavigate('checkout')}>
            <ShoppingCart size={16} /> New Sale
          </button>
        </div>
      </div>

      {/* Today stats */}
      <div className="responsive-stats">
        <StatCard label="Today's Revenue" value={`KES ${stats.todayRevenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`} icon={TrendingUp} color="var(--color-primary)" />
        <StatCard label="Today's Profit" value={`KES ${stats.todayProfit.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`} icon={DollarSign} color="#16a34a" sub={`${profitMargin}% margin`} />
        <StatCard label="Orders Today" value={stats.todayOrders} icon={ShoppingCart} color="#0891b2" />
        <StatCard label="Customers" value={stats.totalCustomers} icon={Users} color="#a78bfa" />
      </div>

      {/* Low stock alert */}
      {stats.lowStock > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-warning-bg)', border: '1px solid rgba(146,64,14,0.2)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
          <AlertTriangle size={18} color="var(--color-warning)" />
          <span style={{ fontSize: '14px', color: 'var(--color-warning)', fontWeight: '500' }}>
            {stats.lowStock} product{stats.lowStock > 1 ? 's are' : ' is'} running low on stock
          </span>
          <button onClick={() => onNavigate('inventory')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-warning)', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View Inventory <ArrowUpRight size={14} />
          </button>
        </div>
      )}

      <div className="responsive-2col">
        {/* Revenue chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Revenue This Month</h3>
            <button onClick={() => onNavigate('analysis')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Full Analysis <ArrowUpRight size={13} />
            </button>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={v => [`KES ${Number(v).toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: '14px' }}>
              No sales data this month yet
            </div>
          )}
        </div>

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
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-text)', marginTop: '6px', letterSpacing: '-0.5px' }}>{value}</div>
          {sub && <div style={{ fontSize: '11px', color, marginTop: '4px', fontWeight: '600' }}>{sub}</div>}
        </div>
        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={color} />
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ height: '90px', background: 'var(--color-surface)', borderRadius: '12px', opacity: 0.5 }} />
      ))}
    </div>
  )
}