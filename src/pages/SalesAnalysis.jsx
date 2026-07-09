import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TrendingUp, DollarSign, ShoppingCart, Percent, Loader2 } from 'lucide-react'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Line } from 'recharts'

const COLORS = ['#1a6b2f', '#0891b2', '#92400e', '#a78bfa', '#dc2626', '#0ea5e9']
const PERIODS = ['Today', 'This Week', 'This Month', 'This Year', 'Last 30 Days', 'All Time']

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return isMobile
}

export default function SalesAnalysis() {
  const [period, setPeriod] = useState('This Month')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ revenue: 0, profit: 0, orders: 0, avgOrder: 0, profitMargin: 0, itemsSold: 0 })
  const [revenueProfitChart, setRevenueProfitChart] = useState([])
  const [paymentChart, setPaymentChart] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [categoryBreakdown, setCategoryBreakdown] = useState([])
  const isMobile = useIsMobile()

  useEffect(() => { loadAnalysis() }, [period])

  function getDateRange() {
    const now = new Date()
    switch (period) {
      case 'Today': return { from: startOfDay(now), to: endOfDay(now) }
      case 'This Week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
      case 'This Month': return { from: startOfMonth(now), to: endOfMonth(now) }
      case 'This Year': return { from: startOfYear(now), to: endOfYear(now) }
      case 'Last 30 Days': return { from: subDays(now, 30), to: now }
      case 'All Time': return { from: new Date(2020, 0, 1), to: now }
      default: return { from: startOfMonth(now), to: endOfMonth(now) }
    }
  }

  async function loadAnalysis() {
    setLoading(true)
    const { from, to } = getDateRange()
    const [salesRes, itemsRes] = await Promise.all([
      supabase.from('sales').select('id, total, payment_method, created_at').gte('created_at', from.toISOString()).lte('created_at', to.toISOString()),
      supabase.from('sale_items').select('product_name, quantity, unit_price, total_price, products(cost_price, category), sales!inner(created_at)').gte('sales.created_at', from.toISOString()).lte('sales.created_at', to.toISOString()),
    ])
    const salesData = salesRes.data || []
    const itemsData = itemsRes.data || []
    const revenue = salesData.reduce((s, r) => s + Number(r.total), 0)
    const orders = salesData.length
    const avgOrder = orders > 0 ? revenue / orders : 0
    const itemsSold = itemsData.reduce((s, i) => s + i.quantity, 0)
    const profit = itemsData.reduce((sum, item) => {
      const cost = item.products?.cost_price
      if (cost == null) return sum
      return sum + (item.unit_price - cost) * item.quantity
    }, 0)
    const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0
    const byDay = {}
    salesData.forEach(s => {
      const day = format(new Date(s.created_at), period === 'Today' ? 'HH:00' : 'dd MMM')
      if (!byDay[day]) byDay[day] = { day, revenue: 0 }
      byDay[day].revenue += Number(s.total)
    })
    const profitByDay = {}
    itemsData.forEach(item => {
      const cost = item.products?.cost_price
      if (cost == null) return
      const day = format(new Date(item.sales.created_at), period === 'Today' ? 'HH:00' : 'dd MMM')
      profitByDay[day] = (profitByDay[day] || 0) + (item.unit_price - cost) * item.quantity
    })
    const chart = Object.values(byDay).map(d => ({ ...d, profit: parseFloat((profitByDay[d.day] || 0).toFixed(2)) }))
    const byMethod = {}
    salesData.forEach(s => {
      const m = s.payment_method?.replace('_', ' ') || 'cash'
      byMethod[m] = (byMethod[m] || 0) + 1
    })
    const payChart = Object.entries(byMethod).map(([name, value]) => ({ name: name.toUpperCase(), value }))
    const byProduct = {}
    itemsData.forEach(item => {
      if (!byProduct[item.product_name]) byProduct[item.product_name] = { name: item.product_name, qty: 0, revenue: 0, profit: 0, unit_price: item.unit_price }
      byProduct[item.product_name].qty += item.quantity
      byProduct[item.product_name].revenue += Number(item.total_price)
      const cost = item.products?.cost_price
      if (cost != null) byProduct[item.product_name].profit += (item.unit_price - cost) * item.quantity
    })
    const topProds = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 8)
    const byCategory = {}
    itemsData.forEach(item => {
      const cat = item.products?.category || 'Other'
      byCategory[cat] = (byCategory[cat] || 0) + Number(item.total_price)
    })
    const catChart = Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    setSummary({ revenue, profit, orders, avgOrder, profitMargin, itemsSold })
    setRevenueProfitChart(chart)
    setPaymentChart(payChart)
    setTopProducts(topProds)
    setCategoryBreakdown(catChart)
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Analysis</h1>
          <p className="page-subtitle">Revenue, profit, and sales trends</p>
        </div>
        {/* Period selector — scrollable on mobile */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? '4px' : '0', width: '100%', marginTop: isMobile ? '4px' : '0' }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '7px 14px', borderRadius: '8px', fontSize: isMobile ? '12px' : '13px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap',
              border: `1px solid ${period === p ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: period === p ? 'var(--color-primary-glow)' : 'var(--color-surface)',
              color: period === p ? 'var(--color-primary)' : 'var(--color-muted)',
              flexShrink: 0,
            }}>{p}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* Summary cards — 2 cols on mobile, auto-fit on desktop */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(170px, 1fr))', gap: isMobile ? '10px' : '14px', marginBottom: '20px' }}>
            {[
              { label: 'Revenue', value: `KES ${summary.revenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, sub: null },
              { label: 'Profit', value: `KES ${summary.profit.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, sub: `${summary.profitMargin}% margin`, color: summary.profit >= 0 ? '#16a34a' : '#dc2626' },
              { label: 'Orders', value: summary.orders, sub: null },
              { label: 'Avg. Order', value: `KES ${summary.avgOrder.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, sub: null },
              { label: 'Items Sold', value: summary.itemsSold, sub: null },
            ].map(card => (
              <div key={card.label} className="stat-card">
                <div className="stat-label">{card.label}</div>
                <div className="stat-value" style={{ fontSize: isMobile ? '16px' : '20px', color: card.color }}>{card.value}</div>
                {card.sub && <div style={{ fontSize: '11px', color: card.color, marginTop: '4px', fontWeight: '600' }}>{card.sub}</div>}
              </div>
            ))}
          </div>

          {/* Revenue vs Profit chart */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Revenue vs Profit — {period}</h3>
            {revenueProfitChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 180 : 260}>
                <ComposedChart data={revenueProfitChart}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} width={isMobile ? 45 : 60} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(v, name) => [`KES ${Number(v).toLocaleString()}`, name === 'revenue' ? 'Revenue' : 'Profit']}
                  />
                  <Legend formatter={v => v === 'revenue' ? 'Revenue' : 'Profit'} />
                  <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="profit" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: isMobile ? '180px' : '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: '14px' }}>No data for this period</div>
            )}
          </div>

          {/* Payment methods + Category — stacked on mobile, side by side on desktop */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Payment Methods</h3>
              {paymentChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={paymentChart} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                      {paymentChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: '14px' }}>No data</div>
              )}
            </div>
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Sales by Category</h3>
              {categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categoryBreakdown} layout="vertical" margin={{ left: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={v => [`KES ${Number(v).toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: '14px' }}>No data</div>
              )}
            </div>
          </div>

          {/* Top products */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Top Products</h3>
            {topProducts.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>No product data for this period</p>
            ) : isMobile ? (
              /* Mobile: name + price only */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {topProducts.map((p, i) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: i < topProducts.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-primary)', flexShrink: 0, marginLeft: '8px' }}>KES {p.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              /* Desktop: full table */
              <div className="table-container" style={{ boxShadow: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product</th>
                      <th>Qty Sold</th>
                      <th>Revenue</th>
                      <th>Profit</th>
                      <th>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={p.name}>
                        <td style={{ color: 'var(--color-muted)' }}>{i + 1}</td>
                        <td style={{ fontWeight: '500' }}>{p.name}</td>
                        <td>{p.qty}</td>
                        <td style={{ fontWeight: '600' }}>KES {p.revenue.toLocaleString()}</td>
                        <td style={{ fontWeight: '600', color: p.profit >= 0 ? '#16a34a' : '#dc2626' }}>KES {p.profit.toLocaleString()}</td>
                        <td>
                          <span className={p.profit >= 0 ? 'badge-green' : 'badge-red'}>{p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : 0}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}