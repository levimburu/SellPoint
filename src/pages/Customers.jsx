import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Edit2, Users, X, Loader2, Phone, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const emptyForm = { name: '', phone: '', email: '', address: '', notes: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewCustomer, setViewCustomer] = useState(null)
  const [customerSales, setCustomerSales] = useState([])
  const [loadingSales, setLoadingSales] = useState(false)

  useEffect(() => { loadCustomers() }, [])
  useEffect(() => {
    const s = search.toLowerCase()
    setFiltered(customers.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.phone?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s)
    ))
  }, [customers, search])

  async function loadCustomers() {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data || [])
    setLoading(false)
  }

  async function loadCustomerSales(customerId) {
    setLoadingSales(true)
    const { data } = await supabase
      .from('sales')
      .select('id, total, payment_method, created_at, receipt_number')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10)
    setCustomerSales(data || [])
    setLoadingSales(false)
  }

  function openAdd() {
    setEditCustomer(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(c) {
    setEditCustomer(c)
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' })
    setShowModal(true)
  }

  function openView(c) {
    setViewCustomer(c)
    loadCustomerSales(c.id)
  }

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Customer name is required'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    }
    let error
    if (editCustomer) {
      ;({ error } = await supabase.from('customers').update(payload).eq('id', editCustomer.id))
    } else {
      ;({ error } = await supabase.from('customers').insert(payload))
    }
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(editCustomer ? 'Customer updated' : 'Customer added')
    setShowModal(false)
    loadCustomers()
    setSaving(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{customers.length} registered customers</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone or email..." style={{ paddingLeft: '36px', maxWidth: '400px' }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <Users size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>{search ? 'No customers match your search' : 'No customers yet.'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <button onClick={() => openView(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', color: 'var(--color-primary)', fontSize: '14px', padding: 0 }}>
                      {c.name}
                    </button>
                  </td>
                  <td>
                    {c.phone ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-muted)' }}>
                        <Phone size={12} /> {c.phone}
                      </div>
                    ) : '—'}
                  </td>
                  <td>
                    {c.email ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-muted)' }}>
                        <Mail size={12} /> {c.email}
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ color: 'var(--color-muted)', fontSize: '13px' }}>{c.address || '—'}</td>
                  <td style={{ color: 'var(--color-muted)', fontSize: '13px' }}>{format(new Date(c.created_at), 'dd MMM yyyy')}</td>
                  <td>
                    <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '4px' }}>
                      <Edit2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>{editCustomer ? 'Edit Customer' : 'New Customer'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Full Name *</label>
                <input value={form.name} onChange={set('name')} placeholder="e.g. Mary Wanjiru" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={set('phone')} placeholder="0712 345 678" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={set('email')} placeholder="mary@email.com" />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input value={form.address} onChange={set('address')} placeholder="e.g. Westlands, Nairobi" />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={set('notes')} placeholder="Any notes about this customer..." rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  {saving ? 'Saving...' : editCustomer ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Customer Modal */}
      {viewCustomer && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewCustomer(null)}>
          <div className="modal" style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{viewCustomer.name}</h2>
                <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '2px' }}>Customer Profile</p>
              </div>
              <button onClick={() => setViewCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: 'Phone', value: viewCustomer.phone },
                { label: 'Email', value: viewCustomer.email },
                { label: 'Address', value: viewCustomer.address },
                { label: 'Joined', value: format(new Date(viewCustomer.created_at), 'dd MMM yyyy') },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--color-surface-2)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>{value || '—'}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Purchase History</h3>
            {loadingSales ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-muted)' }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /></div>
            ) : customerSales.length === 0 ? (
              <p style={{ fontSize: '14px', color: 'var(--color-muted)', padding: '12px 0' }}>No purchases yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {customerSales.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>#{s.receipt_number || s.id.slice(0, 8).toUpperCase()}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                        {format(new Date(s.created_at), 'dd MMM yyyy, HH:mm')} · {s.payment_method}
                      </div>
                    </div>
                    <div style={{ fontWeight: '600', color: 'var(--color-primary)' }}>KES {Number(s.total).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
