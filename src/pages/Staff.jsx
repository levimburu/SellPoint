import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Plus, Edit2, X, Loader2, Users, Eye, EyeOff, Shield, UserX, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const emptyForm = { fullName: '', username: '', password: '', role: 'cashier' }

export default function Staff() {
  const { profile, createStaffAccount, setStaffStatus } = useAuth()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  useEffect(() => { loadStaff() }, [])

  async function loadStaff() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    setStaff(data || [])
    setLoading(false)
  }

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.fullName.trim()) { toast.error('Full name is required'); return }
    if (!form.username.trim()) { toast.error('Username is required'); return }
    if (form.username.includes(' ')) { toast.error('Username cannot contain spaces'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }

    setSaving(true)
    try {
      await createStaffAccount({
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        role: form.role,
      })
      toast.success(`Account created for ${form.fullName}`)
      setShowModal(false)
      setForm(emptyForm)
      loadStaff()
    } catch (err) {
      toast.error(err.message || 'Failed to create account')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus(member) {
    const newStatus = member.status === 'active' ? 'suspended' : 'active'
    const action = newStatus === 'active' ? 'activate' : 'suspend'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${member.full_name}?`)) return

    setTogglingId(member.id)
    try {
      await setStaffStatus(member.id, newStatus)
      toast.success(`${member.full_name} ${newStatus === 'active' ? 'activated' : 'suspended'}`)
      loadStaff()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setTogglingId(null)
    }
  }

  if (profile?.role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Shield size={48} style={{ color: 'var(--color-muted)', marginBottom: '16px', opacity: 0.4 }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Admin Access Only</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Only administrators can manage staff accounts.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">{staff.length} account{staff.length !== 1 ? 's' : ''} on this system</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setShowModal(true) }}>
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(member => (
                <tr key={member.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                        background: member.role === 'admin' ? 'rgba(26,107,47,0.15)' : 'rgba(8,145,178,0.1)',
                        border: `1.5px solid ${member.role === 'admin' ? 'var(--color-primary)' : '#0891b2'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: '800',
                        color: member.role === 'admin' ? 'var(--color-primary)' : '#0891b2',
                      }}>
                        {member.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: '500' }}>{member.full_name}</span>
                      {member.id === profile?.id && (
                        <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>(you)</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>@{member.username || member.email?.split('@')[0]}</td>
                  <td>
                    <span className={member.role === 'admin' ? 'badge-green' : 'badge-blue'}>
                      {member.role === 'admin' ? '★ Admin' : 'Cashier'}
                    </span>
                  </td>
                  <td>
                    <span className={member.status === 'active' || !member.status ? 'badge-green' : 'badge-red'}>
                      {member.status === 'suspended' ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-muted)', fontSize: '13px' }}>
                    {format(new Date(member.created_at), 'dd MMM yyyy')}
                  </td>
                  <td>
                    {member.id !== profile?.id && (
                      <button
                        onClick={() => handleToggleStatus(member)}
                        disabled={togglingId === member.id}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                          color: member.status === 'suspended' ? 'var(--color-success)' : 'var(--color-danger)',
                        }}
                        title={member.status === 'suspended' ? 'Activate account' : 'Suspend account'}
                      >
                        {togglingId === member.id
                          ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                          : member.status === 'suspended'
                            ? <UserCheck size={15} />
                            : <UserX size={15} />
                        }
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create staff modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Add New Staff</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Full Name *</label>
                <input value={form.fullName} onChange={set('fullName')} placeholder="e.g. Mary Wanjiru" required />
              </div>

              <div className="form-group">
                <label>Username *</label>
                <input
                  value={form.username}
                  onChange={set('username')}
                  placeholder="e.g. mary (no spaces)"
                  required
                  style={{ fontFamily: 'monospace' }}
                />
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                  They'll log in with this. No spaces, no special characters.
                </div>
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label>Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  style={{ paddingRight: '44px' }}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} style={{
                  position: 'absolute', right: '12px', bottom: '10px',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)',
                }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="form-group">
                <label>Role *</label>
                <select value={form.role} onChange={set('role')}>
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin / Manager</option>
                </select>
              </div>

              <div style={{
                background: 'var(--color-surface-2)', borderRadius: '8px',
                padding: '12px 14px', marginBottom: '16px',
                border: '1px solid var(--color-border)',
                fontSize: '12px', color: 'var(--color-muted)', lineHeight: '1.6'
              }}>
                <strong style={{ color: 'var(--color-text)' }}>Note:</strong> Share the username and password with the staff member directly. They can change their password later from their profile.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                  {saving ? 'Creating...' : 'Create Account'}
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