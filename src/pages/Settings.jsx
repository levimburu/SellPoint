import { useState, useEffect } from 'react'
import { useSettings } from '../hooks/useSettings'
import { useAuth } from '../hooks/useAuth'
import { Save, Loader2, Store, Phone, Mail, MapPin, FileText, Receipt, DollarSign, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
  const { settings, saveSettings } = useSettings()
  const { profile } = useAuth()
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(settings) }, [settings])

  if (profile?.role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Shield size={48} style={{ color: 'var(--color-muted)', marginBottom: '16px', opacity: 0.4 }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Admin Access Only</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Only administrators can access system settings.</p>
      </div>
    )
  }

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.store_name?.trim()) { toast.error('Store name is required'); return }
    setSaving(true)
    const { error } = await saveSettings(form)
    if (error) { toast.error('Failed to save settings'); setSaving(false); return }
    toast.success('Settings saved! Receipts and invoices will use these details.')
    setSaving(false)
  }

  const sections = [
    {
      title: 'Store Information',
      icon: Store,
      fields: [
        { key: 'store_name', label: 'Store / Business Name', placeholder: "e.g. Kagai's Agro", required: true },
        { key: 'tagline', label: 'Tagline / Slogan', placeholder: 'e.g. Your Trusted Agrovet Partner' },
      ]
    },
    {
      title: 'Contact Details',
      icon: Phone,
      fields: [
        { key: 'phone', label: 'Phone Number', placeholder: 'e.g. +254 723 482 184' },
        { key: 'email', label: 'Email Address', placeholder: 'e.g. info@kagaisagro.co.ke' },
        { key: 'address', label: 'Physical Address', placeholder: 'e.g. Kitale, Trans-Nzoia County' },
      ]
    },
    {
      title: 'Tax & Compliance',
      icon: FileText,
      fields: [
        { key: 'kra_pin', label: 'KRA PIN', placeholder: 'e.g. A000000000Z' },
        { key: 'currency', label: 'Currency Code', placeholder: 'e.g. KES' },
      ]
    },
    {
      title: 'Receipt Customization',
      icon: Receipt,
      fields: [
        { key: 'receipt_footer', label: 'Receipt Footer Message', placeholder: 'e.g. Thank you for your business!' },
      ]
    },
  ]

  return (
    <div style={{ maxWidth: '680px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Store details used on receipts and invoices</p>
        </div>
      </div>

      {/* Live preview card */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
        borderRadius: '14px', padding: '20px 24px', marginBottom: '28px',
        color: 'white',
      }}>
        <div style={{ fontSize: '11px', fontWeight: '600', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Receipt Preview
        </div>
        <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '-0.3px' }}>
          {form.store_name || 'Store Name'}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '3px' }}>
          {form.tagline || 'Your tagline here'}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
          {form.address && <span style={{ fontSize: '11px', opacity: 0.75 }}>📍 {form.address}</span>}
          {form.phone && <span style={{ fontSize: '11px', opacity: 0.75 }}>📞 {form.phone}</span>}
          {form.email && <span style={{ fontSize: '11px', opacity: 0.75 }}>✉ {form.email}</span>}
        </div>
        {form.kra_pin && (
          <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '6px' }}>KRA PIN: {form.kra_pin}</div>
        )}
      </div>

      <form onSubmit={handleSave}>
        {sections.map(({ title, icon: Icon, fields }) => (
          <div key={title} className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-primary-glow)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color="var(--color-primary)" />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text)' }}>{title}</h3>
            </div>
            {fields.map(field => (
              <div key={field.key} className="form-group">
                <label>{field.label}{field.required && <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>}</label>
                <input
                  value={form[field.key] || ''}
                  onChange={set(field.key)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              </div>
            ))}
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '12px 28px', fontSize: '15px' }}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
