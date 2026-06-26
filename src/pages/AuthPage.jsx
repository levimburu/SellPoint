import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { ShoppingBag, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', password: '' })

  function set(field) { return (e) => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(form.username, form.password)
        toast.success('Welcome back!')
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #e8f5e0 0%, #f4f8f0 50%, #faf7f0 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      {/* Farm animals background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <svg style={{ position: 'absolute', bottom: '80px', left: '60px', opacity: 0.07, animation: 'floatAnim 4s ease-in-out infinite' }} width="120" height="80" viewBox="0 0 90 60">
          <ellipse cx="38" cy="38" rx="28" ry="18" fill="#1a3a0f"/>
          <ellipse cx="62" cy="36" rx="12" ry="10" fill="#1a3a0f"/>
          <rect x="16" y="52" width="7" height="10" rx="2" fill="#1a3a0f"/>
          <rect x="28" y="54" width="7" height="8" rx="2" fill="#1a3a0f"/>
          <rect x="42" y="54" width="7" height="8" rx="2" fill="#1a3a0f"/>
          <rect x="54" y="52" width="7" height="10" rx="2" fill="#1a3a0f"/>
          <ellipse cx="70" cy="30" rx="8" ry="6" fill="#1a3a0f"/>
          <path d="M70 24 Q74 14 72 10" stroke="#1a3a0f" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <path d="M66 24 Q62 14 64 10" stroke="#1a3a0f" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <path d="M10 38 Q6 36 8 30" stroke="#1a3a0f" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        </svg>
        <svg style={{ position: 'absolute', bottom: '70px', right: '80px', opacity: 0.07, animation: 'floatAnim 3.5s ease-in-out infinite 0.5s' }} width="100" height="70" viewBox="0 0 70 55">
          <ellipse cx="32" cy="32" rx="22" ry="14" fill="#1a3a0f"/>
          <ellipse cx="52" cy="28" rx="10" ry="9" fill="#1a3a0f"/>
          <rect x="14" y="42" width="6" height="12" rx="2" fill="#1a3a0f"/>
          <rect x="24" y="44" width="6" height="10" rx="2" fill="#1a3a0f"/>
          <rect x="36" y="44" width="6" height="10" rx="2" fill="#1a3a0f"/>
          <rect x="46" y="42" width="6" height="12" rx="2" fill="#1a3a0f"/>
          <path d="M50 20 Q54 10 52 6" stroke="#1a3a0f" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M46 20 Q42 10 44 6" stroke="#1a3a0f" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M8 32 Q4 30 6 24" stroke="#1a3a0f" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
        <svg style={{ position: 'absolute', bottom: '75px', left: '280px', opacity: 0.07, animation: 'floatAnim 2.8s ease-in-out infinite 1s' }} width="55" height="55" viewBox="0 0 40 40">
          <ellipse cx="20" cy="28" rx="13" ry="10" fill="#1a3a0f"/>
          <circle cx="20" cy="14" r="8" fill="#1a3a0f"/>
          <path d="M20 18 L14 22" stroke="#1a3a0f" strokeWidth="2" strokeLinecap="round"/>
          <path d="M20 18 L26 22" stroke="#1a3a0f" strokeWidth="2" strokeLinecap="round"/>
          <line x1="16" y1="37" x2="14" y2="40" stroke="#1a3a0f" strokeWidth="2"/>
          <line x1="24" y1="37" x2="26" y2="40" stroke="#1a3a0f" strokeWidth="2"/>
          <path d="M22 12 Q28 8 26 6 Q24 10 22 12" fill="#1a3a0f"/>
        </svg>
        <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%' }} height="60" viewBox="0 0 1440 60" preserveAspectRatio="none">
          <path d="M0 60 Q80 30 160 50 Q240 28 320 48 Q400 26 480 46 Q560 28 640 50 Q720 24 800 46 Q880 30 960 48 Q1040 24 1120 46 Q1200 28 1280 48 Q1360 30 1440 50 L1440 60 Z" fill="#d4e6c3" opacity="0.5"/>
        </svg>
      </div>
      <style>{`@keyframes floatAnim { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }`}</style>

      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(26,107,47,0.3)',
          }}>
            <ShoppingBag size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--color-text)', letterSpacing: '-0.5px' }}>
            SellPoint
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginTop: '4px', fontWeight: '500' }}>
            Kagai's Agro · Kitale
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--color-surface)', borderRadius: '20px',
          border: '1px solid var(--color-border)',
          padding: '32px', boxShadow: 'var(--shadow-lg)',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--color-text)' }}>
            Sign in to SellPoint
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '24px' }}>
            Enter your username and password to continue
          </p>

          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label>Username</label>
              <input value={form.username} onChange={set('username')} placeholder="Enter your username" required autoComplete="username" />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password} onChange={set('password')}
                placeholder="••••••••" required minLength={6}
                style={{ paddingRight: '44px' }}
              />
              <button type="button" onClick={() => setShowPassword(s => !s)} style={{
                position: 'absolute', right: '12px', bottom: '10px',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)',
              }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '12px', fontSize: '15px', borderRadius: '10px' }}>
              {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Please wait...' : 'Sign In'}
            </button>
          </form>

          <p style={{ fontSize: '12px', color: 'var(--color-muted)', textAlign: 'center', marginTop: '16px' }}>
            Contact your admin if you need access
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}