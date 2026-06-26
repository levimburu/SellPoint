import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Plus, X, Loader2, Truck, ChevronDown, ChevronUp, Trash2, Shield, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function Purchases() {
  const { user, profile } = useAuth()
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [purchaseItems, setPurchaseItems] = useState({})
  const [loadingItems, setLoadingItems] = useState(null)
  const [supplierFilter, setSupplierFilter] = useState('all')

  // New purchase form
  const [form, setForm] = useState({
    supplier_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
  })
  const [items, setItems] = useState([{ product_id: '', product_name: '', quantity: '', unit_cost: '' }])

  useEffect(() => { loadData() }, [])

  if (profile?.role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Shield size={48} style={{ color: 'var(--color-muted)', marginBottom: '16px', opacity: 0.4 }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Admin Access Only</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Only administrators can manage stock purchases.</p>
      </div>
    )
  }

  async function loadData() {
    setLoading(true)
    const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
      supabase.from('purchases').select('*, suppliers(name, location)').order('delivery_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
      supabase.from('products').select('id, name, unit, cost_price').eq('is_active', true).order('name'),
    ])
    setPurchases(purchasesRes.data || [])
    setSuppliers(suppliersRes.data || [])
    setProducts(productsRes.data || [])
    setLoading(false)
  }

  async function toggleExpand(purchase) {
    if (expandedId === purchase.id) { setExpandedId(null); return }
    setExpandedId(purchase.id)
    if (!purchaseItems[purchase.id]) {
      setLoadingItems(purchase.id)
      const { data } = await supabase.from('purchase_items').select('*').eq('purchase_id', purchase.id)
      setPurchaseItems(prev => ({ ...prev, [purchase.id]: data || [] }))
      setLoadingItems(null)
    }
  }

  function addItem() {
    setItems(prev => [...prev, { product_id: '', product_name: '', quantity: '', unit_cost: '' }])
  }

  function removeItem(index) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function updateItem(index, field, value) {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: value }
      if (field === 'product_id') {
        const product = products.find(p => p.id === value)
        if (product) {
          updated.product_name = product.name
          updated.unit_cost = product.cost_price || ''
        }
      }
      return updated
    }))
  }

  const totalCost = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    const cost = parseFloat(item.unit_cost) || 0
    return sum + qty * cost
  }, 0)

  async function handleSave(e) {
    e.preventDefault()
    if (!form.supplier_id) { toast.error('Select a supplier'); return }
    const validItems = items.filter(i => i.product_id && i.quantity && i.unit_cost)
    if (validItems.length === 0) { toast.error('Add at least one item'); return }

    setSaving(true)
    try {
      const itemsPayload = validItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: parseInt(item.quantity),
        unit_cost: parseFloat(item.unit_cost),
        total_cost: parseInt(item.quantity) * parseFloat(item.unit_cost),
      }))

      const { data, error } = await supabase.rpc('record_purchase', {
        p_supplier_id: form.supplier_id,
        p_delivery_date: form.delivery_date,
        p_reference_number: form.reference_number || null,
        p_notes: form.notes || null,
        p_recorded_by: user?.id,
        p_recorded_by_name: profile?.full_name || 'Admin',
        p_items: itemsPayload,
      })

      if (error) throw error
      toast.success(`Delivery recorded — KES ${data.total_cost?.toLocaleString()} total`)
      setShowModal(false)
      setForm({ supplier_id: '', delivery_date: new Date().toISOString().split('T')[0], reference_number: '', notes: '' })
      setItems([{ product_id: '', product_name: '', quantity: '', unit_cost: '' }])
      setPurchaseItems({})
      loadData()
    } catch (err) {
      toast.error(err.message || 'Failed to record delivery')
    } finally {
      setSaving(false)
    }
  }

  const filtered = supplierFilter === 'all'
    ? purchases
    : purchases.filter(p => p.supplier_id === supplierFilter)

  const totalSpent = filtered.reduce((s, p) => s + Number(p.total_cost), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Purchases</h1>
          <p className="page-subtitle">
            {filtered.length} deliveries · KES {totalSpent.toLocaleString('en-KE', { minimumFractionDigits: 2 })} total spent
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Record Delivery
        </button>
      </div>

      {/* Supplier filter */}
      <div style={{ marginBottom: '20px' }}>
        <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} style={{ width: 'auto', minWidth: '200px' }}>
          <option value="all">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <Truck size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>No deliveries recorded yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(purchase => (
            <div key={purchase.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              {/* Header row */}
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-primary-glow)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Truck size={18} color="var(--color-primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)' }}>
                    {purchase.suppliers?.name || 'Unknown Supplier'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px', display: 'flex', gap: '12px' }}>
                    <span>📅 {format(new Date(purchase.delivery_date), 'dd MMM yyyy')}</span>
                    {purchase.reference_number && <span>Ref: {purchase.reference_number}</span>}
                    <span>by {purchase.recorded_by_name}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-primary)' }}>
                    KES {Number(purchase.total_cost).toLocaleString()}
                  </div>
                </div>
                <button onClick={() => toggleExpand(purchase)} className="btn-secondary" style={{ padding: '7px 12px', fontSize: '12px', flexShrink: 0 }}>
                  {expandedId === purchase.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {expandedId === purchase.id ? 'Hide' : 'View Items'}
                </button>
              </div>

              {/* Expanded items */}
              {expandedId === purchase.id && (
                <div style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-2)', padding: '14px 18px' }}>
                  {loadingItems === purchase.id ? (
                    <div style={{ textAlign: 'center', padding: '16px' }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /></div>
                  ) : (
                    <>
                      <div className="table-container" style={{ boxShadow: 'none' }}>
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Quantity</th>
                              <th>Unit Cost</th>
                              <th>Total Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(purchaseItems[purchase.id] || []).map(item => (
                              <tr key={item.id}>
                                <td style={{ fontWeight: '500' }}>{item.product_name}</td>
                                <td>{item.quantity}</td>
                                <td>KES {Number(item.unit_cost).toLocaleString()}</td>
                                <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>KES {Number(item.total_cost).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {purchase.notes && (
                        <div style={{ marginTop: '10px', padding: '10px 12px', background: 'var(--color-surface)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                          📝 {purchase.notes}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Record Delivery Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '620px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Record Stock Delivery</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              {/* Delivery details */}
              <div className="form-row">
                <div className="form-group">
                  <label>Supplier *</label>
                  <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} required>
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Delivery Date *</label>
                  <input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} required />
                </div>
              </div>

              <div className="form-group">
                <label>Reference / Invoice Number</label>
                <input value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="e.g. INV-2026-001" />
              </div>

              {/* Items section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'var(--color-text-2)' }}>Items Received *</label>
                  <button type="button" onClick={addItem} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} /> Add Item
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map((item, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 32px', gap: '8px', alignItems: 'center' }}>
                      <select
                        value={item.product_id}
                        onChange={e => updateItem(index, 'product_id', e.target.value)}
                        style={{ fontSize: '13px', padding: '8px 10px' }}
                      >
                        <option value="">Select product...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input
                        type="number" min="1"
                        value={item.quantity}
                        onChange={e => updateItem(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        style={{ fontSize: '13px', padding: '8px 10px', textAlign: 'center' }}
                      />
                      <input
                        type="number" min="0" step="0.01"
                        value={item.unit_cost}
                        onChange={e => updateItem(index, 'unit_cost', e.target.value)}
                        placeholder="Cost/unit"
                        style={{ fontSize: '13px', padding: '8px 10px' }}
                      />
                      <button type="button" onClick={() => removeItem(index)} disabled={items.length === 1}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: '4px', opacity: items.length === 1 ? 0.3 : 1 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Column labels */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 32px', gap: '8px', marginTop: '4px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Product</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', textAlign: 'center' }}>Quantity</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Cost/Unit (KES)</div>
                </div>
              </div>

              {/* Total */}
              <div style={{ background: 'var(--color-primary-glow)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(26,107,47,0.15)' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)' }}>Total Delivery Cost</span>
                <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--color-primary)' }}>
                  KES {totalCost.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this delivery..." rows={2} style={{ resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Truck size={14} />}
                  {saving ? 'Recording...' : 'Record Delivery'}
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