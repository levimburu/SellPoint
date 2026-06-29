import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

const DEFAULT_SETTINGS = {
  store_name: 'Hedge Stores',
  tagline: 'For your packaging solutions',
  address: 'Trans-Nzoia, Kitale',
  phone: '+254 728885088',
  email: 'info@hedgestores.co.ke',
  kra_pin: 'A000000000Z',
  receipt_footer: 'Thank you for your business!',
  currency: 'KES',
}

const BLACK = [17, 17, 17]
const CHARCOAL = [84, 84, 88]
const MINT = [201, 232, 229]
const MINT_TEXT = [38, 84, 80]
const DARK = [34, 34, 34]
const MUTED = [120, 120, 120]
const WHITE = [255, 255, 255]
const LIGHT_GRAY = [246, 246, 246]
const BORDER_GRAY = [214, 214, 214]

// ─── RECEIPT (80mm Thermal) ──────────────────────────────────
export function generateReceipt(sale, storeSettings = {}) {
  const s = { ...DEFAULT_SETTINGS, ...storeSettings }
  const receiptNum = sale.receipt_number || sale.id?.slice(0, 8).toUpperCase()
  const items = sale.items || []

  // 80mm thermal roll width. Height is calculated dynamically based on content.
  const W = 80
  const estimatedHeight = 70 + (items.length * 7) + (sale.discount_amount > 0 ? 6 : 0) + (sale.mpesa_ref ? 6 : 0) + (sale.customer_name ? 6 : 0) + 30

  const doc = new jsPDF({ unit: 'mm', format: [W, estimatedHeight] })
  const margin = 4
  const contentW = W - margin * 2

  let y = 6

  // Store name centered
  doc.setTextColor(...DARK)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(s.store_name.toUpperCase(), W / 2, y, { align: 'center' })
  y += 5

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(s.tagline, W / 2, y, { align: 'center' })
  y += 4
  doc.text(s.address, W / 2, y, { align: 'center' })
  y += 4
  doc.text(s.phone, W / 2, y, { align: 'center' })
  y += 4
  doc.text(`KRA PIN: ${s.kra_pin}`, W / 2, y, { align: 'center' })
  y += 5

  // Dashed divider
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.2)
  doc.setLineDashPattern([1, 1], 0)
  doc.line(margin, y, W - margin, y)
  doc.setLineDashPattern([], 0)
  y += 5

  // Receipt info
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.text(`Receipt: #${receiptNum}`, margin, y)
  y += 4
  doc.text(format(new Date(sale.created_at || Date.now()), 'dd MMM yyyy  HH:mm'), margin, y)
  y += 4
  doc.text(`Cashier: ${sale.cashier_name || 'Cashier'}`, margin, y)
  y += 4
  if (sale.customer_name) {
    doc.text(`Customer: ${sale.customer_name}`, margin, y)
    y += 4
  }
  y += 1

  doc.setLineDashPattern([1, 1], 0)
  doc.line(margin, y, W - margin, y)
  doc.setLineDashPattern([], 0)
  y += 5

  // Items
  doc.setFontSize(7.5)
  items.forEach(item => {
    const name = item.product_name || item.name
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    const lineTotal = (item.quantity * item.unit_price).toLocaleString('en-KE', { minimumFractionDigits: 2 })
    doc.text(name.length > 28 ? name.slice(0, 28) + '...' : name, margin, y)
    doc.text(lineTotal, W - margin, y, { align: 'right' })
    y += 3.8
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(`  ${item.quantity} x KES ${Number(item.unit_price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, margin, y)
    y += 4.2
  })

  doc.setLineDashPattern([1, 1], 0)
  doc.line(margin, y, W - margin, y)
  doc.setLineDashPattern([], 0)
  y += 5

  // Totals
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.text('Sub Total', margin, y)
  doc.text(`KES ${Number(sale.subtotal || sale.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, W - margin, y, { align: 'right' })
  y += 4.5

  if (sale.discount_amount > 0) {
    doc.text('Discount', margin, y)
    doc.text(`-KES ${Number(sale.discount_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, W - margin, y, { align: 'right' })
    y += 4.5
  }

  doc.setLineDashPattern([1, 1], 0)
  doc.line(margin, y, W - margin, y)
  doc.setLineDashPattern([], 0)
  y += 5

  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', margin, y)
  doc.text(`KES ${Number(sale.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, W - margin, y, { align: 'right' })
  y += 6

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(`Payment: ${(sale.payment_method || 'CASH').toUpperCase().replace('_', ' ')}`, margin, y)
  y += 4
  if (sale.mpesa_ref) {
    doc.text(`M-Pesa Ref: ${sale.mpesa_ref}`, margin, y)
    y += 4
  }
  y += 2

  doc.setLineDashPattern([1, 1], 0)
  doc.line(margin, y, W - margin, y)
  doc.setLineDashPattern([], 0)
  y += 6

  // Footer
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(s.receipt_footer, W / 2, y, { align: 'center' })
  y += 5
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(`${s.phone}  |  ${s.email}`, W / 2, y, { align: 'center' })

  doc.save(`receipt-${receiptNum}.pdf`)
}

// ─── INVOICE (A4) — matches the Hedge Stores Canva design ─────
export function generateInvoice(sale, storeSettings = {}) {
  const s = { ...DEFAULT_SETTINGS, ...storeSettings }
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()   // 210
  const H = doc.internal.pageSize.getHeight()  // 297
  const M = 16
  const invoiceNum = sale.invoice_number || `INV-${sale.id?.slice(0, 8).toUpperCase()}`
  const money = (n) => `${s.currency} ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`

  // ── Charcoal header band ──
  doc.setFillColor(...CHARCOAL)
  doc.rect(0, 0, W, 56, 'F')

  // Banner title
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(26)
  doc.text(`${s.store_name} Invoice`, W / 2, 28, { align: 'center' })

  // Tagline pill
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const tagW = doc.getTextWidth(s.tagline)
  const pillW = tagW + 12
  const pillH = 7.5
  const pillX = (W - pillW) / 2
  const pillY = 35
  doc.setFillColor(...MINT)
  doc.roundedRect(pillX, pillY, pillW, pillH, 3.7, 3.7, 'F')
  doc.setTextColor(...MINT_TEXT)
  doc.text(s.tagline, W / 2, pillY + 5.1, { align: 'center' })

  // ── INVOICE heading ──
  let y = 76
  doc.setTextColor(...BLACK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.text('INVOICE', M, y)

  // Invoice meta (bold label + value)
  y += 10
  const meta = [
    ['Invoice Number:', `#${invoiceNum}`],
    ['Date:', format(new Date(sale.created_at || Date.now()), 'dd MMM yyyy')],
    ['Payment Method:', (sale.payment_method || 'CASH').toUpperCase().replace('_', ' ')],
  ]
  doc.setFontSize(10)
  meta.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(label, M, y)
    const lw = doc.getTextWidth(label)
    doc.setFont('helvetica', 'normal')
    doc.text(` ${value}`, M + lw, y)
    y += 6.5
  })

  // ── Store (left) + Billed To (right) ──
  let leftY = y + 8
  const rightX = W / 2 + 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...DARK)
  doc.text(s.store_name, M, leftY)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  doc.text(s.tagline, M, leftY + 5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  let lY = leftY + 12
  doc.text(s.address, M, lY); lY += 4.6
  doc.text(s.phone, M, lY); lY += 4.6
  doc.text(s.email, M, lY); lY += 4.6
  doc.text(`KRA PIN: ${s.kra_pin}`, M, lY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...DARK)
  doc.text('Billed To:', rightX, leftY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(sale.customer_name || 'Walk-in Customer', rightX, leftY + 6)
  if (sale.customer_phone) {
    doc.setTextColor(...MUTED)
    doc.text(String(sale.customer_phone), rightX, leftY + 11)
  }

  // ── Items table ──
  const items = sale.items || []
  autoTable(doc, {
    startY: lY + 10,
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: items.map(item => [
      item.product_name || item.name,
      String(item.quantity),
      money(item.unit_price),
      money(item.quantity * item.unit_price),
    ]),
    theme: 'grid',
    styles: { fontSize: 9.5, cellPadding: 4, textColor: DARK, lineColor: BORDER_GRAY, lineWidth: 0.1, valign: 'middle' },
    headStyles: { fillColor: CHARCOAL, textColor: WHITE, fontStyle: 'bold', fontSize: 9.5, cellPadding: 4, lineColor: CHARCOAL, lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 36, halign: 'right' },
      3: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: M, right: M },
  })

  // ── Totals ──
  let tY = doc.lastAutoTable.finalY + 8
  const colR = W - M
  const labelX = W - M - 58

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...MUTED)
  doc.text('Subtotal', labelX, tY)
  doc.setTextColor(...DARK)
  doc.text(money(sale.subtotal || sale.total), colR, tY, { align: 'right' })

  if (sale.discount_amount > 0) {
    tY += 6.5
    doc.setTextColor(...MUTED)
    doc.text('Discount', labelX, tY)
    doc.setTextColor(...DARK)
    doc.text(`- ${money(sale.discount_amount)}`, colR, tY, { align: 'right' })
  }

  tY += 10
  const barX = labelX - 5
  doc.setFillColor(...CHARCOAL)
  doc.rect(barX, tY - 6.5, colR - barX, 11, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text('Total', barX + 4, tY + 0.8)
  doc.text(money(sale.total), colR - 4, tY + 0.8, { align: 'right' })

  if (sale.mpesa_ref) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(`M-Pesa Ref: ${sale.mpesa_ref}`, M, tY + 0.5)
  }

  // ── Footer ──
  const fY = H - 30
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.4)
  doc.line(M, fY, W - M, fY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BLACK)
  doc.text(s.receipt_footer, W / 2, fY + 8, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(s.store_name, W / 2, fY + 14, { align: 'center' })
  doc.text(`${s.address}  ·  ${s.phone}  ·  ${s.email}`, W / 2, fY + 18.5, { align: 'center' })

  doc.save(`invoice-${invoiceNum}.pdf`)
}