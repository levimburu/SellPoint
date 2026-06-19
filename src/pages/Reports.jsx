import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { Loader2 } from 'lucide-react'

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a78bfa', '#ef4444', '#06b6d4']
const PERIODS = ['Today', 'This Week', 'This Month', 'Last 30 Days', 'Last 7 Days']

export default function Reports() {
  const [period, setPeriod] = useState('This Month')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ revenue: 0, profit: 0, orders: 0, avgOrder: 0, topProduct: '', profitMargin: 0 })
  const [revenueChart, setRevenueChart] = useState([])
  const [paymentChart, setPaymentChart] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [categoryChart, setCategoryChart] = useState([])

  useEffect(() => { loadReports() }, [period])

  function getDateRange() {
    const now = new Date()
    switch (period) {
      case 'Today': return { from: startOfDay(now), to: endOfDay(now) }
      case 'This Week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
      case 'This Month': return { from: startOfMonth(now), to: endOfMonth(now) }
      case 'Last 30 Days': return { from: subDays(now, 30), to: now }
      case 'Last 7 Days': return { from: subDays(now, 7), to: now }
      default: return { from: startOfMonth(now), to: endOfMonth(now) }
    }
  }

  async function loadReports() {
    setLoading(true)
    const { from, to } = getDateRange()

    const [salesRes, itemsRes, profitItemsRes] = await Promise.all([
      supabase.from('sales').select('id, total, payment_method, created_at').gte('created_at', from.toISOString()).lte('created_at', to.toISOString()),
      supabase.from('sale_items').select('product_name, quantity, total_price, sales!inner(created_at)').gte('sales.created_at', from.toISOString()).lte('sales.created_at', to.toISOString()),
      supabase.from('sale_items').select('quantity, unit_price, products(cost_price), sales!inner(created_at)').gte('sales.created_at', from.toISOString()).lte('sales.created_at', to.toISOString()),
    ])

    const salesData = salesRes.data || []
    const itemsData = itemsRes.data || []

    // Summary
    const revenue = salesData.reduce((s, r) => s + Number(r.total), 0)
    const orders = salesData.length
    const avgOrder = orders > 0 ? revenue / orders : 0
    const profit = (profitItemsRes.data || []).reduce((sum, item) => {
      const cost = item.products?.cost_price
      if (cost == null) return sum
      return sum + (item.unit_price - cost) * item.quantity
    }, 0)
    const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0

    // Revenue by day
    const byDay = {}
    salesData.forEach(s => {
      const day = format(new Date(s.created_at), period === 'Today' ? 'HH:00' : 'dd MMM')
      byDay[day] = (byDay[day] || 0) + Number(s.total)
    })
    const revChart = Object.entries(byDay).map(([day, revenue]) => ({ day, revenue: parseFloat(revenue.toFixed(2)) }))

    // Payment methods
    const byMethod = {}
    salesData.forEach(s => {
      const m = s.payment_method?.replace('_', ' ') || 'cash'
      byMethod[m] = (byMethod[m] || 0) + 1
    })
    const payChart = Object.entries(byMethod).map(([name, value]) => ({ name: name.toUpperCase(), value }))

    // Top products
    const byProduct = {}
    itemsData.forEach(item => {
      if (!byProduct[item.product_name]) byProduct[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 }
      byProduct[item.product_name].qty += item.quantity
      byProduct[item.product_name].revenue += Number(item.total_price)
    })
    const topProds = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 8)

    setSummary({ revenue, profit, orders, avgOrder, topProduct: topProds[0]?.name || '—', profitMargin })
    setRevenueChart(revChart)
    setPaymentChart(payChart)
    setTopProducts(topProds)
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Business performance overview</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{
                padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                border: `1px solid ${period === p ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: period === p ? 'var(--color-primary-glow)' : 'var(--color-surface-2)',
                color: period === p ? 'var(--color-primary)' : 'var(--color-muted)',
              }}
            >{p}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <div className="stat-card">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value" style={{ fontSize: '20px' }}>KES {summary.revenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Profit</div>
              <div className="stat-value" style={{ fontSize: '20px', color: '#16a34a' }}>KES {summary.profit.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px', fontWeight: '600' }}>{summary.profitMargin}% margin</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Orders</div>
              <div className="stat-value" style={{ fontSize: '20px' }}>{summary.orders}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg. Order Value</div>
              <div className="stat-value" style={{ fontSize: '20px' }}>KES {summary.avgOrder.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', marginBottom: '20px' }}>
            {/* Revenue chart */}
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px' }}>Revenue — {period}</h3>
              {revenueChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={revenueChart}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '13px' }}
                      formatter={v => [`KES ${Number(v).toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: '14px' }}>No data for this period</div>
              )}
            </div>

            {/* Payment methods */}
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px' }}>Payment Methods</h3>
              {paymentChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={paymentChart} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                      {paymentChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '13px' }} />
                    <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: '14px' }}>No data</div>
              )}
            </div>
          </div>

          {/* Top products */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px' }}>Top Products by Revenue</h3>
            {topProducts.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>No product data for this period</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topProducts.map((p, i) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: `${COLORS[i % COLORS.length]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: COLORS[i % COLORS.length], flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>{p.name}</div>
                      <div style={{ height: '4px', background: 'var(--color-surface-2)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(p.revenue / topProducts[0].revenue) * 100}%`, background: COLORS[i % COLORS.length], borderRadius: '99px' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>KES {p.revenue.toLocaleString()}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{p.qty} sold</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
