import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { initiateStkPush, checkStkStatus } from '../lib/mpesa'
import { generateReceipt, generateInvoice } from '../lib/pdf'
import { useSettings } from '../hooks/useSettings'
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, Loader2, X, User, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

const PAYMENT_METHODS = [
  { id: 'Cash', label: 'Cash', color: '#16a34a' },
  { id: 'M-Pesa', label: 'M-Pesa', color: '#15803d' },
  { id: 'Card', label: 'Card', color: '#1d4ed8' },
  { id: 'Bank Transfer', label: 'Bank', color: '#7c3aed' },
  { id: 'Credit', label: 'Credit Tab', color: '#dc2626' },
]

export default function Checkout() {
  const { profile, user } = useAuth()
  const { settings } = useSettings()
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [filtered, setFiltered] = useState([])
  const [cart, setCart] = useState([])
  const [discount, setDiscount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerDropdown, setCustomerDropdown] = useState(false)
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [processing, setProcessing] = useState(false)
  const [stkPending, setStkPending] = useState(false)
  const [completedSale, setCompletedSale] = useState(null)
  const [showNumpad, setShowNumpad] = useState(false)
  const [numpadTarget, setNumpadTarget] = useState(null)
  const [numpadValue, setNumpadValue] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const searchRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => { loadProducts(); loadCustomers() }, [])

  useEffect(() => {
    const s = search.toLowerCase()
    let list = products
    if (activeCategory !== 'All') list = list.filter(p => p.category === activeCategory)
    if (s) list = list.filter(p => p.name.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s))
    setFiltered(list)
  }, [search, products, activeCategory])

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('#customer-search-wrapper')) setCustomerDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').eq('is_active', true).gt('stock_qty', 0).order('name')
    setProducts(data || [])
    setFiltered(data || [])
  }

  async function loadCustomers() {
    const { data } = await supabase.from('customers').select('id, name, phone, email').order('name')
    setCustomers(data || [])
  }

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))]

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock_qty) { toast.error('Max stock reached'); return prev }
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...product, quantity: 1, unit_price: product.price }]
    })
  }

  function updateQty(id, delta) {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i
      const newQty = i.quantity + delta
      if (newQty < 1) return i
      const product = products.find(p => p.id === id)
      if (product && newQty > product.stock_qty) { toast.error('Insufficient stock'); return i }
      return { ...i, quantity: newQty }
    }))
  }

  function removeFromCart(id) { setCart(prev => prev.filter(i => i.id !== id)) }

  function openNumpad(target, currentValue = '') {
    setNumpadTarget(target)
    setNumpadValue(String(currentValue))
    setShowNumpad(true)
  }

  function numpadPress(val) {
    if (val === 'DEL') { setNumpadValue(v => v.slice(0, -1)) }
    else if (val === 'CLR') { setNumpadValue('') }
    else if (val === '.' && numpadValue.includes('.')) { return }
    else { setNumpadValue(v => v + val) }
  }

  function numpadConfirm() {
    const val = parseFloat(numpadValue) || 0
    if (numpadTarget === 'discount') {
      setDiscount(numpadValue)
    } else {
      setCart(prev => prev.map(i => {
        if (i.id !== numpadTarget) return i
        const product = products.find(p => p.id === numpadTarget)
        const newQty = Math.max(1, Math.floor(val))
        if (product && newQty > product.stock_qty) { toast.error('Insufficient stock'); return i }
        return { ...i, quantity: newQty }
      }))
    }
    setShowNumpad(false)
    setNumpadTarget(null)
    setNumpadValue('')
  }

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const discountAmount = discount ? parseFloat(discount) : 0
  const total = Math.max(0, subtotal - discountAmount)

  const filteredCustomers = customerSearch
    ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch))
    : customers.slice(0, 6)

  async function handleCompleteSale() {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    if (paymentMethod === 'M-Pesa' && !mpesaPhone) { toast.error('Enter M-Pesa phone number'); return }
    if (paymentMethod === 'Credit' && !selectedCustomer) { toast.error('Select a customer for credit tab'); return }
    setProcessing(true)
    try {
      if (paymentMethod === 'Credit') {
        const { data: creditSale, error: csError } = await supabase
          .from('credit_sales').insert({
            customer_id: selectedCustomer.id, cashier_id: user?.id,
            cashier_name: profile?.full_name || 'Cashier',
            subtotal, discount_amount: discountAmount,
            total_amount: total, amount_paid: 0,
            balance_due: total, status: 'open',
          }).select().single()
        if (csError) throw csError
        const creditItems = cart.map(i => ({
          credit_sale_id: creditSale.id, product_id: i.id,
          product_name: i.name, quantity: i.quantity,
          unit_price: i.unit_price, total_price: i.unit_price * i.quantity,
        }))
        const { error: ciError } = await supabase.from('credit_sale_items').insert(creditItems)
        if (ciError) throw ciError
        for (const item of cart) {
          await supabase.rpc('decrement_stock', { product_id: item.id, qty: item.quantity })
        }
        const { data: custData } = await supabase.from('customers').select('credit_balance').eq('id', selectedCustomer.id).single()
        await supabase.from('customers').update({ credit_balance: (custData?.credit_balance || 0) + total }).eq('id', selectedCustomer.id)
        setCompletedSale({
          ...creditSale, isCreditSale: true,
          items: cart.map(i => ({ ...i, product_name: i.name })),
          customer_name: selectedCustomer?.name,
          customer_phone: selectedCustomer?.phone,
          total, receipt_number: 'TAB-' + creditSale.id.slice(0, 8).toUpperCase(),
        })
        loadProducts()
        toast.success('Credit tab created for ' + selectedCustomer.name)
        setProcessing(false)
        return
      }
      if (paymentMethod === 'M-Pesa') {
        toast.loading('Sending M-Pesa prompt...', { id: 'stk' })
        try {
          const stkResult = await initiateStkPush({
            phone: mpesaPhone, amount: total,
            reference: `SP-${Date.now()}`, description: 'Purchase',
          })
          setStkPending(true)
          toast.success('Check your phone for M-Pesa prompt', { id: 'stk' })
          startPolling(stkResult.CheckoutRequestID)
          setProcessing(false)
          return
        } catch (mpesaErr) {
          toast.dismiss('stk')
          toast.error(`M-Pesa: ${mpesaErr.message}. Recording manually.`)
        }
      }
      await recordSale(null)
    } catch (err) {
      toast.error(err.message)
      setProcessing(false)
    }
  }

  function startPolling(reqId) {
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const status = await checkStkStatus(reqId)
        if (status.ResultCode === '0') {
          clearInterval(pollRef.current); setStkPending(false)
          await recordSale(status.MpesaReceiptNumber)
        } else if (status.ResultCode && status.ResultCode !== '1032') {
          clearInterval(pollRef.current); setStkPending(false)
          toast.error('M-Pesa payment failed or cancelled')
          setProcessing(false)
        }
      } catch {}
      if (attempts >= 12) {
        clearInterval(pollRef.current); setStkPending(false)
        toast.error('M-Pesa timed out.')
        setProcessing(false)
      }
    }, 5000)
  }

  async function recordSale(mpesaRef) {
    setProcessing(true)
    const receiptNumber = `HSR-${Date.now().toString(36).toUpperCase()}`
    const { data: saleData, error: saleError } = await supabase
      .from('sales').insert({
        customer_id: selectedCustomer?.id || null,
        cashier_id: user?.id,
        cashier_name: profile?.full_name || 'Cashier',
        subtotal, discount_amount: discountAmount, total,
        payment_method: paymentMethod.toLowerCase().replace(' ', '_'),
        mpesa_ref: mpesaRef || null,
        receipt_number: receiptNumber, status: 'completed',
      }).select().single()
    if (saleError) throw saleError
    const items = cart.map(i => ({
      sale_id: saleData.id, product_id: i.id, product_name: i.name,
      quantity: i.quantity, unit_price: i.unit_price,
      total_price: i.unit_price * i.quantity,
    }))
    const { error: itemsError } = await supabase.from('sale_items').insert(items)
    if (itemsError) throw itemsError
    for (const item of cart) {
      await supabase.rpc('decrement_stock', { product_id: item.id, qty: item.quantity })
    }
    const invoiceNumber = `INV-${receiptNumber.replace('HSR-', '')}`
    await supabase.from('invoices').insert({ sale_id: saleData.id, invoice_number: invoiceNumber })
    setCompletedSale({
      ...saleData,
      items: cart.map(i => ({ ...i, product_name: i.name })),
      customer_name: selectedCustomer?.name || null,
      customer_phone: selectedCustomer?.phone || null,
      invoice_number: invoiceNumber,
    })
    loadProducts()
    toast.success('Sale complete!')
    setProcessing(false)
  }

  function resetCheckout() {
    setCart([]); setDiscount(''); setPaymentMethod('Cash')
    setSelectedCustomer(null); setCustomerSearch(''); setMpesaPhone('')
    setCompletedSale(null); setStkPending(false)
    if (pollRef.current) clearInterval(pollRef.current)
    setTimeout(() => searchRef.current?.focus(), 100)
  }

  // ── Completed sale ──────────────────────────────────────────
  if (completedSale) {
    return (
      <div style={{ maxWidth: '440px', margin: '40px auto', textAlign: 'center', padding: '20px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(22,163,74,0.12)', border: '3px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={40} color="var(--color-success)" />
        </div>
        <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
          {completedSale.isCreditSale ? 'Credit Tab Created!' : 'Sale Complete!'}
        </h2>
        <p style={{ color: 'var(--color-muted)', marginBottom: '8px', fontSize: '14px' }}>
          {completedSale.isCreditSale
            ? <span style={{ color: 'var(--color-danger)', fontWeight: '600' }}>Not in revenue — pending payment</span>
            : <>Receipt #{completedSale.receipt_number}</>
          }
        </p>
        <div style={{ fontSize: '48px', fontWeight: '900', color: 'var(--color-primary)', margin: '16px 0 28px', letterSpacing: '-2px' }}>
          KES {Number(completedSale.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
          {completedSale.items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span>{item.product_name} x{item.quantity}</span>
              <span style={{ fontWeight: '600' }}>KES {(item.unit_price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <button className="btn-secondary" onClick={() => generateReceipt(completedSale, settings)} style={{ flex: 1, justifyContent: 'center' }}>Receipt</button>
          <button className="btn-secondary" onClick={() => generateInvoice(completedSale, settings)} style={{ flex: 1, justifyContent: 'center' }}>Invoice</button>
        </div>
        <button className="btn-primary" onClick={resetCheckout} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '16px', fontWeight: '700' }}>
          New Sale
        </button>
      </div>
    )
  }

  // ── STK pending ──────────────────────────────────────────────
  if (stkPending) {
    return (
      <div style={{ maxWidth: '360px', margin: '80px auto', textAlign: 'center', padding: '20px' }}>
        <Loader2 size={40} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>Waiting for M-Pesa...</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '24px' }}>
          Prompt sent to <strong>{mpesaPhone}</strong>.<br />
          Enter PIN to confirm <strong style={{ color: 'var(--color-primary)' }}>KES {total.toLocaleString()}</strong>.
        </p>
        <button className="btn-secondary" onClick={() => { setStkPending(false); if (pollRef.current) clearInterval(pollRef.current) }}>Cancel</button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Main Checkout ─────────────────────────────────────────────
  const now = new Date()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '14px', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* LEFT: Products */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden', height: '100%' }}>
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search product or scan barcode..." autoFocus
              style={{ paddingLeft: '38px', fontSize: '13px', background: '#fff' }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ background: '#fff', border: '1.5px solid var(--color-border)', borderRadius: '8px', padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '12px', color: 'var(--color-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {now.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', flexShrink: 0 }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', flexShrink: 0,
              border: `1px solid ${activeCategory === cat ? 'var(--color-sidebar)' : 'var(--color-border)'}`,
              background: activeCategory === cat ? 'var(--color-sidebar)' : '#fff',
              color: activeCategory === cat ? '#FB923C' : 'var(--color-muted)', cursor: 'pointer',
            }}>{cat}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
              <ShoppingCart size={36} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p>{search ? 'No products found' : 'No products in stock'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '9px' }}>
              {filtered.map(product => {
                const inCart = cart.find(i => i.id === product.id)
                return (
                  <button key={product.id} onClick={() => addToCart(product)} style={{
                    background: inCart ? '#FFF7ED' : '#fff',
                    border: `1.5px solid ${inCart ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: '12px', padding: '13px', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.12s', position: 'relative',
                  }}>
                    {inCart && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--color-primary)', color: 'white', borderRadius: '999px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>
                        {inCart.quantity}
                      </div>
                    )}
                    <div style={{ display: 'inline-flex', padding: '2px 8px', background: '#F1F5F9', borderRadius: '999px', fontSize: '10px', color: 'var(--color-muted)', fontWeight: '500', marginBottom: '7px' }}>{product.category}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text)', marginBottom: '7px', lineHeight: '1.3' }}>{product.name}</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-primary)', letterSpacing: '-0.3px' }}>KES {Number(product.price).toLocaleString()}</div>
                    <div style={{ fontSize: '10px', color: product.stock_qty <= 5 ? 'var(--color-warning)' : 'var(--color-muted)', marginTop: '4px' }}>
                      {product.stock_qty} {product.unit} left
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Customer display + cashier controls */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>

        {/* ── CUSTOMER DISPLAY (top, dark, customer-facing) ── */}
        <div style={{ background: 'var(--color-sidebar)', padding: '16px', flexShrink: 0, borderBottom: '3px solid var(--color-primary)' }}>
          {/* Store name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ width: '24px', height: '24px', background: 'var(--color-primary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShoppingCart size={12} color="#fff" />
            </div>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
              {settings?.store_name || 'SellPoint'}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
              {now.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} · {now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px', minHeight: '60px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>
                No items yet
              </div>
            ) : (
              cart.slice(-4).map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '7px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 8px', flexShrink: 0 }}>×{item.quantity}</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>KES {(item.unit_price * item.quantity).toLocaleString()}</span>
                </div>
              ))
            )}
            {cart.length > 4 && (
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>+{cart.length - 4} more items</div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.1)', marginBottom: '14px' }} />

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Total Due</div>
              <div style={{ fontSize: '38px', fontWeight: '900', color: '#fff', letterSpacing: '-2px', lineHeight: '1' }}>
                {total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>Kenyan Shillings</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(249,115,22,0.15)', border: '0.5px solid rgba(249,115,22,0.3)', borderRadius: '7px', padding: '6px 10px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: cart.length > 0 ? 'var(--color-primary)' : 'rgba(255,255,255,0.2)', animation: cart.length > 0 ? 'pulse 2s infinite' : 'none' }} />
              <span style={{ fontSize: '11px', color: cart.length > 0 ? '#FB923C' : 'rgba(255,255,255,0.3)', fontWeight: '500' }}>
                {cart.length > 0 ? 'Awaiting payment' : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        {/* ── CASHIER CONTROLS (bottom, white, cashier-facing) ── */}
        <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

          {/* Cart header */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <ShoppingCart size={15} color="var(--color-primary)" />
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text)' }}>Order</span>
              {cart.length > 0 && (
                <span style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: '999px', padding: '1px 7px', fontSize: '10px', fontWeight: '700' }}>
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '11px', fontWeight: '500' }}>Clear</button>
            )}
          </div>

          {/* Customer search */}
          <div id="customer-search-wrapper" style={{ padding: '7px 12px', borderBottom: '1px solid #F1F5F9', position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <User size={12} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
              <input
                value={selectedCustomer ? selectedCustomer.name : customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setCustomerDropdown(true) }}
                onFocus={() => setCustomerDropdown(true)}
                placeholder="Customer (optional)"
                style={{ paddingLeft: '28px', fontSize: '12px', padding: '6px 10px 6px 28px' }}
              />
              {selectedCustomer && (
                <button onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }}
                  style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                  <X size={12} />
                </button>
              )}
            </div>
            {customerDropdown && !selectedCustomer && filteredCustomers.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: '12px', right: '12px', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '10px', zIndex: 30, maxHeight: '150px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                {filteredCustomers.map(c => (
                  <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerDropdown(false) }}
                    style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontWeight: '500' }}>{c.name}</span>
                    {c.phone && <span style={{ color: 'var(--color-muted)' }}>{c.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart items */}
          <div style={{ flex: '1 1 0', overflowY: 'auto', minHeight: '80px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--color-muted)' }}>
                <ShoppingCart size={28} style={{ marginBottom: '8px', opacity: 0.2 }} />
                <p style={{ fontSize: '12px' }}>Tap products to add</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} style={{ padding: '8px 12px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                    <button onClick={() => { if (item.quantity === 1) removeFromCart(item.id); else updateQty(item.id, -1) }}
                      style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F1F5F9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.quantity === 1 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                      {item.quantity === 1 ? <Trash2 size={10} /> : <Minus size={10} />}
                    </button>
                    <button onClick={() => openNumpad(item.id, item.quantity)}
                      style={{ width: '26px', height: '24px', borderRadius: '6px', background: '#FFF7ED', border: '1px solid #FED7AA', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '700' }}>
                      {item.quantity}
                    </button>
                    <button onClick={() => updateQty(item.id, 1)}
                      style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F1F5F9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text)' }}>
                      <Plus size={10} />
                    </button>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>{item.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-muted)' }}>KES {Number(item.unit_price).toLocaleString()} each</div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', flexShrink: 0, color: 'var(--color-text)' }}>
                    {(item.unit_price * item.quantity).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: discount + payment + charge */}
          <div style={{ padding: '10px', borderTop: '1px solid #F1F5F9', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Discount (KES)</span>
              <button onClick={() => openNumpad('discount', discount || '0')}
                style={{ background: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '7px', padding: '4px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: discountAmount > 0 ? 'var(--color-danger)' : 'var(--color-muted)' }}>
                {discountAmount > 0 ? `-KES ${discountAmount.toLocaleString()}` : '+ Add'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '8px' }}>
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)} style={{
                  padding: '7px 5px', borderRadius: '7px', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                  border: `1.5px solid ${paymentMethod === m.id ? m.color : 'var(--color-border)'}`,
                  background: paymentMethod === m.id ? `${m.color}12` : '#F8FAFC',
                  color: paymentMethod === m.id ? m.color : 'var(--color-muted)',
                }}>{m.label}</button>
              ))}
            </div>

            {paymentMethod === 'M-Pesa' && (
              <div style={{ marginBottom: '8px', position: 'relative' }}>
                <Phone size={12} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)}
                  placeholder="0712 345 678"
                  style={{ paddingLeft: '28px', fontSize: '12px', padding: '7px 10px 7px 28px' }} />
              </div>
            )}

            <button className="btn-primary" onClick={handleCompleteSale}
              disabled={processing || cart.length === 0}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', fontWeight: '800', borderRadius: '9px', background: cart.length === 0 ? 'var(--color-border)' : 'var(--color-primary)' }}>
              {processing
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                : <>Charge KES {total.toLocaleString('en-KE', { minimumFractionDigits: 2 })} &rarr;</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Numpad */}
      {showNumpad && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNumpad(false)}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px', width: '280px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-muted)', marginBottom: '10px' }}>
              {numpadTarget === 'discount' ? 'Enter Discount (KES)' : 'Enter Quantity'}
            </div>
            <div style={{ background: 'var(--color-surface-2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px', fontSize: '28px', fontWeight: '800', textAlign: 'right', color: 'var(--color-text)', minHeight: '58px' }}>
              {numpadValue || '0'}
            </div>
            {[['7','8','9'],['4','5','6'],['1','2','3'],['CLR','0','DEL']].map((row, ri) => (
              <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                {row.map(k => (
                  <button key={k} onClick={() => numpadPress(k)} style={{
                    padding: '14px', borderRadius: '10px',
                    fontSize: k === 'CLR' || k === 'DEL' ? '12px' : '18px',
                    fontWeight: '700', cursor: 'pointer',
                    background: k === 'CLR' ? 'var(--color-danger-bg)' : 'var(--color-surface-2)',
                    border: `1px solid ${k === 'CLR' ? 'rgba(220,38,38,0.2)' : 'var(--color-border)'}`,
                    color: k === 'CLR' ? 'var(--color-danger)' : 'var(--color-text)',
                  }}>{k === 'DEL' ? '⌫' : k}</button>
                ))}
              </div>
            ))}
            <button onClick={numpadConfirm} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '15px', fontWeight: '800', marginTop: '4px' }}>
              Confirm
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
      `}</style>
    </div>
  )
}