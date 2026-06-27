import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Plus, Edit2, Trash2, X, Loader2, Truck, Phone, Mail, MapPin, User, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const emptyForm = { name: '', location: '', phone: '', email: '', contact_person: '', notes: '', selectedProducts: [] }

export default function Suppliers() {
  const { profile } = useAuth()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editSupplier, setEditSupplier] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [products, setProducts] = useState([])
  const [supplierProducts, setSupplierProducts] = useState({})

  useEffect(() => { loadSuppliers(); loadProducts() }, [])

  if (profile?.role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Shield size={48} style={{ color: 'var(--color-muted)', marginBottom: '16px', opacity: 0.4 }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Admin Access Only</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Only administrators can manage suppliers.</p>
      </div>
    )
  }

  async function loadProducts() {
    const { data } = await supabase.from('products').select('id, name, supplier_id').eq('is_active', true).order('name')
    const prods = data || []
    setProducts(prods)
    // Group by supplier
    const grouped = {}
    prods.forEach(p => {
      if (p.supplier_id) {
        if (!grouped[p.supplier_id]) grouped[p.supplier_id] = []
        grouped[p.supplier_id].push(p)
      }
    })
    setSupplierProducts(grouped)
  }

  async function loadSuppliers() {
    setLoading(true)
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setSuppliers(data || [])
    setLoading(false)
  }

  function openAdd() {
    setEditSupplier(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(supplier) {
    setEditSupplier(supplier)
    setForm({
      name: supplier.name,
      location: supplier.location || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      contact_person: supplier.contact_person || '',
      notes: supplier.notes || '',
      selectedProducts: (supplierProducts[supplier.id] || []).map(p => p.id),
    })
    setShowModal(true)
  }

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Supplier name is required'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      location: form.location.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      contact_person: form.contact_person.trim() || null,
      notes: form.notes.trim() || null,
      is_active: true,
    }
    let supplierId
    let error
    if (editSupplier) {
      ;({ error } = await supabase.from('suppliers').update(payload).eq('id', editSupplier.id))
      supplierId = editSupplier.id
    } else {
      const { data: newSupplier, error: insertError } = await supabase.from('suppliers').insert(payload).select().single()
      error = insertError
      supplierId = newSupplier?.id
    }
    if (error) { toast.error(error.message); setSaving(false); return }

    // Update product supplier links
    if (supplierId) {
      // Remove this supplier from all products first
      await supabase.from('products').update({ supplier_id: null }).eq('supplier_id', supplierId)
      // Then assign selected products to this supplier
      if (form.selectedProducts.length > 0) {
        await supabase.from('products').update({ supplier_id: supplierId }).in('id', form.selectedProducts)
      }
    }

    toast.success(editSupplier ? 'Supplier updated' : 'Supplier added')
    setShowModal(false)
    loadSuppliers()
    loadProducts()
    setSaving(false)
  }

  async function handleDelete(supplier) {
    if (!confirm(`Remove "${supplier.name}"?`)) return
    setDeletingId(supplier.id)
    const { error } = await supabase.from('suppliers').update({ is_active: false }).eq('id', supplier.id)
    if (error) { toast.error('Failed to remove supplier'); setDeletingId(null); return }
    toast.success('Supplier removed')
    setSuppliers(s => s.filter(x => x.id !== supplier.id))
    setDeletingId(null)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : suppliers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <Truck size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>No suppliers yet. Add your first supplier.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {suppliers.map(supplier => (
            <div key={supplier.id} className="card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                    background: 'var(--color-primary-glow)',
                    border: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Truck size={18} color="var(--color-primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)' }}>{supplier.name}</div>
                    {supplier.location && (
                      <div style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={11} /> {supplier.location}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => openEdit(supplier)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '4px' }}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(supplier)} disabled={deletingId === supplier.id} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: '4px' }}>
                    {deletingId === supplier.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {supplier.contact_person && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-2)' }}>
                    <User size={13} color="var(--color-muted)" />
                    {supplier.contact_person}
                  </div>
                )}
                {supplier.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-2)' }}>
                    <Phone size={13} color="var(--color-muted)" />
                    {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-2)' }}>
                    <Mail size={13} color="var(--color-muted)" />
                    {supplier.email}
                  </div>
                )}
                {supplier.notes && (
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px', padding: '8px', background: 'var(--color-surface-2)', borderRadius: '6px' }}>
                    {supplier.notes}
                  </div>
                )}
              </div>

              {supplierProducts[supplier.id]?.length > 0 && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supplies</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {supplierProducts[supplier.id].map(p => (
                      <span key={p.id} style={{ background: 'var(--color-primary-glow)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '999px', padding: '2px 10px', fontSize: '11px', color: 'var(--color-primary)', fontWeight: '500' }}>
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                Added {format(new Date(supplier.created_at), 'dd MMM yyyy')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>{editSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Company / Supplier Name *</label>
                <input value={form.name} onChange={set('name')} placeholder="e.g. Farmer's Choice Ltd" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Location</label>
                  <input value={form.location} onChange={set('location')} placeholder="e.g. Nairobi, CBD" />
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input value={form.contact_person} onChange={set('contact_person')} placeholder="e.g. John Kamau" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={set('phone')} placeholder="e.g. 0712 345 678" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={set('email')} placeholder="supplier@email.com" />
                </div>
              </div>
              <div className="form-group">
                <label>Products Supplied</label>
                <div style={{ border: '1.5px solid var(--color-border)', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto', background: 'var(--color-surface)' }}>
                  {products.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: '13px', color: 'var(--color-muted)' }}>No products in inventory yet</div>
                  ) : (
                    products.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <input type="checkbox"
                          checked={form.selectedProducts.includes(p.id)}
                          onChange={e => {
                            const checked = e.target.checked
                            setForm(f => ({
                              ...f,
                              selectedProducts: checked
                                ? [...f.selectedProducts, p.id]
                                : f.selectedProducts.filter(id => id !== p.id)
                            }))
                          }}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{p.name}</span>
                      </label>
                    ))
                  )}
                </div>
                {form.selectedProducts.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '4px', fontWeight: '600' }}>
                    {form.selectedProducts.length} product{form.selectedProducts.length > 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={set('notes')} placeholder="Any notes about this supplier..." rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  {saving ? 'Saving...' : editSupplier ? 'Save Changes' : 'Add Supplier'}
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