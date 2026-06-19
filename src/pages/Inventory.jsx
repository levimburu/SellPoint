import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Loader2, Package } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = ['General', 'Electronics', 'Clothing', 'Food & Beverages', 'Stationery', 'Household', 'Cosmetics', 'Pharmacy', 'Other']

const emptyForm = { name: '', sku: '', category: 'General', price: '', cost_price: '', stock_qty: '', low_stock_alert: 5, unit: 'pcs', description: '' }

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => { loadProducts() }, [])

  useEffect(() => {
    let list = products
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))
    if (categoryFilter !== 'All') list = list.filter(p => p.category === categoryFilter)
    setFiltered(list)
  }, [products, search, categoryFilter])

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('name')
    if (error) { toast.error('Failed to load products'); setLoading(false); return }
    setProducts(data || [])
    setLoading(false)
  }

  function openAdd() {
    setEditProduct(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(product) {
    setEditProduct(product)
    setForm({
      name: product.name, sku: product.sku || '', category: product.category || 'General',
      price: product.price, cost_price: product.cost_price || '', stock_qty: product.stock_qty,
      low_stock_alert: product.low_stock_alert || 5, unit: product.unit || 'pcs', description: product.description || ''
    })
    setShowModal(true)
  }

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Product name is required'); return }
    if (!form.price || isNaN(form.price)) { toast.error('Valid selling price is required'); return }
    if (!form.cost_price || isNaN(form.cost_price)) { toast.error('Cost price is required to track profit'); return }
    if (form.stock_qty === '' || isNaN(form.stock_qty)) { toast.error('Stock quantity is required'); return }

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      category: form.category,
      price: parseFloat(form.price),
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      stock_qty: parseInt(form.stock_qty),
      low_stock_alert: parseInt(form.low_stock_alert) || 5,
      unit: form.unit,
      description: form.description || null,
      is_active: true,
    }

    let error
    if (editProduct) {
      ;({ error } = await supabase.from('products').update(payload).eq('id', editProduct.id))
    } else {
      ;({ error } = await supabase.from('products').insert(payload))
    }

    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(editProduct ? 'Product updated' : 'Product added')
    setShowModal(false)
    loadProducts()
    setSaving(false)
  }

  async function handleDelete(product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setDeletingId(product.id)
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', product.id)
    if (error) { toast.error('Delete failed'); setDeletingId(null); return }
    toast.success('Product removed')
    setProducts(p => p.filter(x => x.id !== product.id))
    setDeletingId(null)
  }

  const categories = ['All', ...CATEGORIES]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">{products.length} products · {products.filter(p => p.stock_qty <= p.low_stock_alert).length} low stock</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ paddingLeft: '36px' }} />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: 'auto', minWidth: '140px' }}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <Package size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>{search ? 'No products match your search' : 'No products yet. Add your first product.'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Selling Price</th>
                <th>Cost Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(product => {
                const isLow = product.stock_qty <= (product.low_stock_alert || 5)
                const isOut = product.stock_qty === 0
                return (
                  <tr key={product.id}>
                    <td>
                      <div style={{ fontWeight: '500' }}>{product.name}</div>
                      {product.description && <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>{product.description}</div>}
                    </td>
                    <td style={{ color: 'var(--color-muted)', fontSize: '13px' }}>{product.sku || '—'}</td>
                    <td><span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{product.category}</span></td>
                    <td style={{ fontWeight: '600' }}>KES {Number(product.price).toLocaleString()}</td>
                    <td style={{ color: 'var(--color-muted)' }}>{product.cost_price ? `KES ${Number(product.cost_price).toLocaleString()}` : '—'}</td>
                    <td style={{ fontWeight: '500' }}>{product.stock_qty} {product.unit}</td>
                    <td>
                      {isOut ? <span className="badge-red">Out of Stock</span>
                        : isLow ? <span className="badge-yellow">Low Stock</span>
                          : <span className="badge-green">In Stock</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openEdit(product)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '4px' }}>
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(product)} disabled={deletingId === product.id} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: '4px' }}>
                          {deletingId === product.id ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>{editProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Product Name *</label>
                <input value={form.name} onChange={set('name')} placeholder="e.g. Rexona Deodorant" required />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>SKU / Barcode</label>
                  <input value={form.sku} onChange={set('sku')} placeholder="e.g. REX-001" />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={set('category')}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Selling Price (KES) *</label>
                  <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" required />
                </div>
                <div className="form-group">
                  <label>Cost Price (KES) *</label>
                  <input type="number" min="0" step="0.01" value={form.cost_price} onChange={set('cost_price')} placeholder="0.00" required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Stock Quantity *</label>
                  <input type="number" min="0" value={form.stock_qty} onChange={set('stock_qty')} placeholder="0" required />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <select value={form.unit} onChange={set('unit')}>
                    {['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'pack', 'dozen', 'pair'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Low Stock Alert (trigger at)</label>
                <input type="number" min="0" value={form.low_stock_alert} onChange={set('low_stock_alert')} />
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea value={form.description} onChange={set('description')} placeholder="Brief description..." rows={2} style={{ resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  {saving ? 'Saving...' : editProduct ? 'Save Changes' : 'Add Product'}
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
