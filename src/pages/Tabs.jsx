import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { generateInvoice } from '../lib/pdf'
import {
  Search, X, Loader2, CreditCard, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Clock, Plus, Phone
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format, differenceInDays } from 'date-fns'

const PAYMENT_METHODS = ['Cash', 'M-Pesa', 'Card', 'Bank Transfer']

export default function Tabs() {
  const { user, profile } = useAuth()
  const [tabs, setTabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [expandedId, setExpandedId] = useState(null)
  const [tabItems, setTabItems] = useState({})
  const [tabPayments, setTabPayments] = useState({})
  const [loadingItems, setLoadingItems] = useState(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedTab, setSelectedTab] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Cash')
  const [mpesaRef, setMpesaRef] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => { loadTabs() }, [statusFilter])

  async function loadTabs() {
    setLoading(true)
    let query = supabase
      .from('credit_sales')
      .select('*, customers(id, name, phone, email, credit_balance, credit_limit)')
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query
    if (error) { toast.error('Failed to load tabs'); setLoading(false); return }
    setTabs(data || [])
    setLoading(false)
  }

  async function toggleExpand(tab) {
    if (expandedId === tab.id) { setExpandedId(null); return }
    setExpandedId(tab.id)
    if (!tabItems[tab.id]) {
      setLoadingItems(tab.id)
      const [itemsRes, paymentsRes] = await Promise.all([
        supabase.from('credit_sale_items').select('*').eq('credit_sale_id', tab.id),
        supabase.from('credit_payments').select('*').eq('credit_sale_id', tab.id).order('created_at', { ascending: false }),
      ])
      setTabItems(prev => ({ ...prev, [tab.id]: itemsRes.data || [] }))
      setTabPayments(prev => ({ ...prev, [tab.id]: paymentsRes.data || [] }))
      setLoadingItems(null)
    }
  }

  function openPayModal(tab) {
    setSelectedTab(tab)
    setPayAmount(tab.balance_due.toString())
    setPayMethod('Cash')
    setMpesaRef('')
    setPayNotes('')
    setShowPayModal(true)
  }

  async function handlePayment(e) {
    e.preventDefault()
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return }
    if (amount > selectedTab.balance_due) { toast.error(`Max payable is KES ${selectedTab.balance_due}`); return }

    setPaying(true)
    try {
      const { data, error } = await supabase.rpc('record_credit_payment', {
        p_credit_sale_id: selectedTab.id,
        p_amount: amount,
        p_payment_method: payMethod.toLowerCase().replace(' ', '_'),
        p_mpesa_ref: mpesaRef || null,
        p_cashier_id: user?.id,
        p_cashier_name: profile?.full_name || 'Cashier',
      })

      if (error) throw error

      if (data.status === 'paid') {
        toast.success('Tab fully paid! Sale recorded in revenue.')
      } else {
        toast.success(`Payment of KES ${amount.toLocaleString()} recorded. Balance: KES ${data.balance_due.toLocaleString()}`)
      }

      setShowPayModal(false)
      setTabItems({})
      setTabPayments({})
      setExpandedId(null)
      loadTabs()
    } catch (err) {
      toast.error(err.message || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  const filtered = tabs.filter(t => {
    const s = search.toLowerCase()
    return !search || t.customers?.name?.toLowerCase().includes(s) || t.customers?.phone?.includes(s)
  })

  const totalOutstanding = tabs
    .filter(t => t.status !== 'paid')
    .reduce((s, t) => s + Number(t.balance_due), 0)

  const statusColors = {
    open: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)', label: 'Unpaid' },
    partial: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', label: 'Partial' },
    paid: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', label: 'Paid' },
    cancelled: { bg: '#f1f5f9', color: 'var(--color-muted)', label: 'Cancelled' },
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Tabs</h1>
          <p className="page-subtitle">
            {filtered.length} tab{filtered.length !== 1 ? 's' : ''} ·{' '}
            <span style={{ color: 'var(--color-danger)', fontWeight: '600' }}>
              KES {totalOutstanding.toLocaleString('en-KE', { minimumFractionDigits: 2 })} outstanding
            </span>
          </p>
        </div>
      </div>

      {/* Outstanding alert */}
      {totalOutstanding > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'var(--color-danger-bg)',
          border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
        }}>
          <AlertTriangle size={18} color="var(--color-danger)" />
          <span style={{ fontSize: '14px', color: 'var(--color-danger)', fontWeight: '500' }}>
            Total outstanding credit: <strong>KES {totalOutstanding.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong>
          </span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer name or phone..." style={{ paddingLeft: '36px' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['open', 'partial', 'paid', 'all'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              border: `1.5px solid ${statusFilter === s ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: statusFilter === s ? 'var(--color-primary-glow)' : 'var(--color-surface)',
              color: statusFilter === s ? 'var(--color-primary)' : 'var(--color-muted)',
            }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <CreditCard size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p>No {statusFilter !== 'all' ? statusFilter : ''} tabs found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(tab => {
            const isExpanded = expandedId === tab.id
            const daysOld = differenceInDays(new Date(), new Date(tab.created_at))
            const isOverdue = tab.status !== 'paid' && daysOld > 30
            const sc = statusColors[tab.status] || statusColors.open

            return (
              <div key={tab.id} style={{
                background: 'var(--color-surface)',
                border: `1px solid ${isOverdue ? 'rgba(220,38,38,0.3)' : 'var(--color-border)'}`,
                borderRadius: '12px', overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
              }}>
                {/* Tab header row */}
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Avatar */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: 'var(--color-primary-glow)',
                    border: '1.5px solid var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: '800', color: 'var(--color-primary)',
                  }}>
                    {tab.customers?.name?.charAt(0).toUpperCase()}
                  </div>

                  {/* Customer info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)' }}>
                        {tab.customers?.name}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 9px', borderRadius: '999px', background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                      {isOverdue && (
                        <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 9px', borderRadius: '999px', background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                          ⚠ {daysOld} days overdue
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '3px', display: 'flex', gap: '12px' }}>
                      {tab.customers?.phone && <span>📞 {tab.customers.phone}</span>}
                      <span>🗓 {format(new Date(tab.created_at), 'dd MMM yyyy')}</span>
                      <span>by {tab.cashier_name}</span>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: tab.status === 'paid' ? 'var(--color-success)' : 'var(--color-danger)', letterSpacing: '-0.5px' }}>
                      KES {Number(tab.balance_due).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                      of KES {Number(tab.total_amount).toLocaleString()} total
                    </div>
                    {tab.amount_paid > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '1px' }}>
                        KES {Number(tab.amount_paid).toLocaleString()} paid
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {tab.status !== 'paid' && tab.status !== 'cancelled' && (
                      <button
                        onClick={() => openPayModal(tab)}
                        className="btn-primary"
                        style={{ padding: '8px 14px', fontSize: '12px' }}
                      >
                        <Plus size={13} /> Record Payment
                      </button>
                    )}
                    <button
                      onClick={() => toggleExpand(tab)}
                      className="btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? 'Hide' : 'View'}
                    </button>
                  </div>
                </div>

                {/* Expanded: items + payment history */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                    {loadingItems === tab.id ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-muted)' }}>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      </div>
                    ) : (
                      <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* Items taken */}
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                            Items Taken on Credit
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(tabItems[tab.id] || []).map(item => (
                              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{item.product_name}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                                    {item.quantity} × KES {Number(item.unit_price).toLocaleString()}
                                  </div>
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: '700' }}>
                                  KES {Number(item.total_price).toLocaleString()}
                                </div>
                              </div>
                            ))}
                            {/* Totals */}
                            <div style={{ padding: '8px 12px', background: 'var(--color-primary-glow)', borderRadius: '8px', border: '1px solid rgba(37,99,235,0.15)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-muted)', marginBottom: '4px' }}>
                                <span>Subtotal</span>
                                <span>KES {Number(tab.subtotal).toLocaleString()}</span>
                              </div>
                              {tab.discount_amount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-danger)', marginBottom: '4px' }}>
                                  <span>Discount</span>
                                  <span>-KES {Number(tab.discount_amount).toLocaleString()}</span>
                                </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', color: 'var(--color-primary)', paddingTop: '4px', borderTop: '1px solid rgba(37,99,235,0.15)' }}>
                                <span>Total</span>
                                <span>KES {Number(tab.total_amount).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Payment history */}
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                            Payment History
                          </div>
                          {(tabPayments[tab.id] || []).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-muted)', fontSize: '13px' }}>
                              No payments yet
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {tabPayments[tab.id].map(payment => (
                                <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                  <div>
                                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-success)' }}>
                                      ✓ KES {Number(payment.amount).toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                                      {format(new Date(payment.created_at), 'dd MMM yyyy, HH:mm')} · {payment.payment_method?.replace('_', ' ').toUpperCase()}
                                    </div>
                                    {payment.mpesa_ref && (
                                      <div style={{ fontSize: '10px', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                                        Ref: {payment.mpesa_ref}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                                    {payment.cashier_name}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Summary */}
                          <div style={{ marginTop: '10px', padding: '10px 12px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                              <span style={{ color: 'var(--color-muted)' }}>Total Paid</span>
                              <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>KES {Number(tab.amount_paid).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                              <span style={{ color: 'var(--color-muted)' }}>Balance Due</span>
                              <span style={{ fontWeight: '800', color: tab.balance_due > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                KES {Number(tab.balance_due).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && selectedTab && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayModal(false)}>
          <div className="modal" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 className="modal-title" style={{ margin: 0 }}>Record Payment</h2>
                <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '3px' }}>
                  {selectedTab.customers?.name} · Balance: <strong style={{ color: 'var(--color-danger)' }}>KES {Number(selectedTab.balance_due).toLocaleString()}</strong>
                </p>
              </div>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePayment}>
              <div className="form-group">
                <label>Amount to Pay (KES)</label>
                <input
                  type="number" min="1" step="0.01"
                  max={selectedTab.balance_due}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                  style={{ fontSize: '20px', fontWeight: '700', padding: '14px' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {[selectedTab.balance_due, selectedTab.balance_due / 2].map((amt, i) => (
                    <button key={i} type="button"
                      onClick={() => setPayAmount(amt.toFixed(2))}
                      style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', cursor: 'pointer', color: 'var(--color-text-2)', fontWeight: '500' }}>
                      {i === 0 ? 'Full amount' : '50%'} (KES {amt.toLocaleString()})
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {PAYMENT_METHODS.map(m => (
                    <button key={m} type="button" onClick={() => setPayMethod(m)} style={{
                      padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      border: `2px solid ${payMethod === m ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: payMethod === m ? 'var(--color-primary-glow)' : 'var(--color-surface-2)',
                      color: payMethod === m ? 'var(--color-primary)' : 'var(--color-muted)',
                    }}>{m}</button>
                  ))}
                </div>
              </div>

              {payMethod === 'M-Pesa' && (
                <div className="form-group">
                  <label>M-Pesa Transaction Code</label>
                  <input value={mpesaRef} onChange={e => setMpesaRef(e.target.value)} placeholder="e.g. QGH7XK9LPO" />
                </div>
              )}

              <div className="form-group">
                <label>Notes (optional)</label>
                <input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Any notes..." />
              </div>

              {/* Preview */}
              <div style={{ background: 'var(--color-surface-2)', borderRadius: '10px', padding: '14px', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Paying now</span>
                  <span style={{ fontWeight: '700', color: 'var(--color-success)' }}>KES {(parseFloat(payAmount) || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Remaining after</span>
                  <span style={{ fontWeight: '700', color: 'var(--color-danger)' }}>
                    KES {Math.max(0, Number(selectedTab.balance_due) - (parseFloat(payAmount) || 0)).toLocaleString()}
                  </span>
                </div>
                {parseFloat(payAmount) >= Number(selectedTab.balance_due) && (
                  <div style={{ marginTop: '8px', padding: '8px', background: 'var(--color-success-bg)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-success)', fontWeight: '600', textAlign: 'center' }}>
                    ✓ This will fully clear the tab and record the sale in revenue
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowPayModal(false)} style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={paying} style={{ flex: 2, justifyContent: 'center', padding: '12px' }}>
                  {paying ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={15} />}
                  {paying ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
