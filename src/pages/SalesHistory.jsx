import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { generateReceipt, generateInvoice } from '../lib/pdf'
import { useSettings } from '../hooks/useSettings'
import { Search, FileText, Loader2, Eye, X } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function SalesHistory() {
  const { settings } = useSettings()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('All')
  const [viewSale, setViewSale] = useState(null)
  const [saleItems, setSaleItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => { loadSales() }, [])

  async function loadSales() {
    setLoading(true)
    const { data, error } = await supabase
      .from('sales')
      .select('*, customers(name, phone)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) { toast.error('Failed to load sales'); setLoading(false); return }
    setSales(data || [])
    setLoading(false)
  }

  async function openSale(sale) {
    setViewSale(sale)
    setLoadingItems(true)
    const { data } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id)
    setSaleItems(data || [])
    setLoadingItems(false)
  }

  const filtered = sales.filter(s => {
    const matchSearch = !search || s.receipt_number?.toLowerCase().includes(search.toLowerCase()) || s.customers?.name?.toLowerCase().includes(search.toLowerCase())
    const matchMethod = methodFilter === 'All' || s.payment_method === methodFilter.toLowerCase().replace(' ', '_')
    const matchFrom = !dateFrom || new Date(s.created_at) >= new Date(dateFrom)
    const matchTo = !dateTo || new Date(s.created_at) <= new Date(dateTo + 'T23:59:59')
    return matchSearch && matchMethod && matchFrom && matchTo
  })

  const totalRevenue = filtered.reduce((s, r) => s + Number(r.total), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales History</h1>
          <p className="page-subtitle">{filtered.length} transactions · KES {totalRevenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })} total</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search receipt or customer..." style={{ paddingLeft: '36px' }} />
        </div>
        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} style={{ width: 'auto', minWidth: '140px' }}>
          {['All', 'Cash', 'M-Pesa', 'Card', 'Bank Transfer'].map(m => <option key={m}>{m}</option>)}
        </select>
        <div>
          <label style={{ marginBottom: '4px' }}>From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 'auto' }} />
        </div>
        <div>
          <label style={{ marginBottom: '4px' }}>To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 'auto' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <FileText size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>No sales found</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Payment</th>
                <th>M-Pesa Ref</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sale => (
                <tr key={sale.id}>
                  <td data-label="Receipt" style={{ fontWeight: '600', fontSize: '13px', fontFamily: 'monospace' }}>{sale.receipt_number}</td>
                  <td data-label="Date" style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{format(new Date(sale.created_at), 'dd MMM yyyy, HH:mm')}</td>
                  <td data-label="Customer" style={{ fontSize: '13px' }}>{sale.customers?.name || 'Walk-in'}</td>
                  <td data-label="Payment">
                    <span className={sale.payment_method === 'cash' ? 'badge-green' : sale.payment_method?.includes('mpesa') ? 'badge-yellow' : 'badge-green'}>
                      {sale.payment_method?.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td data-label="M-Pesa Ref" style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'monospace' }}>{sale.mpesa_ref || '—'}</td>
                  <td data-label="Total" style={{ fontWeight: '700', color: 'var(--color-primary)' }}>KES {Number(sale.total).toLocaleString()}</td>
                  <td data-label="Status"><span className="badge-green">Completed</span></td>
                  <td data-label="">
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openSale(sale)} title="View" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '4px' }}>
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sale detail modal */}
      {viewSale && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewSale(null)}>
          <div className="modal" style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: '700' }}>Sale #{viewSale.receipt_number}</h2>
                <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                  {format(new Date(viewSale.created_at), 'dd MMM yyyy, HH:mm')} · {viewSale.cashier_name}
                </p>
              </div>
              <button onClick={() => setViewSale(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {loadingItems ? (
              <div style={{ textAlign: 'center', padding: '30px' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
            ) : (
              <>
                <div className="table-container" style={{ marginBottom: '16px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleItems.map(item => (
                        <tr key={item.id}>
                          <td style={{ fontSize: '13px' }}>{item.product_name}</td>
                          <td style={{ fontSize: '13px' }}>{item.quantity}</td>
                          <td style={{ fontSize: '13px' }}>KES {Number(item.unit_price).toLocaleString()}</td>
                          <td style={{ fontSize: '13px', fontWeight: '600' }}>KES {Number(item.total_price).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ background: 'var(--color-surface-2)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-muted)', marginBottom: '6px' }}>
                    <span>Subtotal</span><span>KES {Number(viewSale.subtotal).toLocaleString()}</span>
                  </div>
                  {viewSale.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-danger)', marginBottom: '6px' }}>
                      <span>Discount</span><span>-KES {Number(viewSale.discount_amount).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '15px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                    <span>Total</span><span style={{ color: 'var(--color-primary)' }}>KES {Number(viewSale.total).toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" onClick={() => generateReceipt({ ...viewSale, items: saleItems, customer_name: viewSale.customers?.name }, settings)} style={{ flex: 1, justifyContent: 'center' }}>
                    🧾 Receipt
                  </button>
                  <button className="btn-secondary" onClick={() => generateInvoice({ ...viewSale, items: saleItems, customer_name: viewSale.customers?.name, customer_phone: viewSale.customers?.phone, invoice_number: `INV-${viewSale.receipt_number?.replace('HSR-', '')}` }, settings)} style={{ flex: 1, justifyContent: 'center' }}>
                    📄 Invoice
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}