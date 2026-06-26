import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

const DEFAULT_SETTINGS = {
  store_name: "Hedge Stores",
  tagline: 'For your packaging solutions',
  address: 'Trans-Nzoia, Kitale',
  phone: '+254 728 885 088',
  email: 'info@hedgestores.co.ke',
  kra_pin: 'A000000000Z',
  receipt_footer: 'Thank you for your business!',
  currency: 'KES',
}

const GREEN = [26, 107, 47]
const GREEN_LIGHT = [232, 245, 224]
const DARK = [30, 30, 30]
const MUTED = [120, 120, 120]
const WHITE = [255, 255, 255]
const LIGHT_GRAY = [248, 248, 248]
const BORDER_GRAY = [220, 220, 220]

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

// ─── INVOICE (A4) ─────────────────────────────────────────────
export function generateInvoice(sale, storeSettings = {}) {
  const s = { ...DEFAULT_SETTINGS, ...storeSettings }
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const invoiceNum = sale.invoice_number || `INV-${sale.id?.slice(0, 8).toUpperCase()}`

  // ── Header green band ──
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, W, 44, 'F')

  // Store name left
  doc.setTextColor(...WHITE)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(s.store_name.toUpperCase(), 14, 16)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 230, 210)
  doc.text(s.tagline, 14, 23)

  // Contact right
  doc.setFontSize(8)
  doc.setTextColor(...WHITE)
  doc.text(s.address, W - 14, 10, { align: 'right' })
  doc.text(s.phone, W - 14, 16, { align: 'right' })
  doc.text(s.email, W - 14, 22, { align: 'right' })
  doc.text(`KRA PIN: ${s.kra_pin}`, W - 14, 28, { align: 'right' })

  // INVOICE white label
  doc.setFillColor(...WHITE)
  doc.roundedRect(14, 30, 44, 12, 2, 2, 'F')
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GREEN)
  doc.text('INVOICE', 36, 38.5, { align: 'center' })

  // ── Info boxes ──
  const boxY = 52
  const boxes = [
    { label: 'Invoice No.', value: `#${invoiceNum}` },
    { label: 'Date', value: format(new Date(sale.created_at || Date.now()), 'dd MMM yyyy') },
    { label: 'Payment', value: (sale.payment_method || 'CASH').toUpperCase().replace('_', ' ') },
  ]
  const boxW = (W - 28) / 3
  boxes.forEach((box, i) => {
    const x = 14 + i * (boxW + 2)
    doc.setFillColor(...LIGHT_GRAY)
    doc.setDrawColor(...BORDER_GRAY)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, boxY, boxW, 14, 2, 2, 'FD')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(box.label, x + boxW / 2, boxY + 5, { align: 'center' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(box.value, x + boxW / 2, boxY + 11, { align: 'center' })
  })

  // Customer
  if (sale.customer_name) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text('Customer:', 14, boxY + 22)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'bold')
    doc.text(sale.customer_name, 36, boxY + 22)
  }

  // ── Items table ──
  const items = sale.items || []
  autoTable(doc, {
    startY: boxY + (sale.customer_name ? 26 : 20),
    head: [['ITEM DESCRIPTION', 'QTY', 'PRICE', 'TOTAL']],
    body: items.map(item => [
      item.product_name || item.name,
      item.quantity,
      `KES ${Number(item.unit_price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
      `KES ${(item.quantity * item.unit_price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
    ]),
    styles: { fontSize: 9, cellPadding: 4, textColor: DARK },
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5, cellPadding: 4 },
    alternateRowStyles: { fillColor: [250, 252, 250] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 36, halign: 'right' },
      3: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  })

  // ── Totals ──
  const tY = doc.lastAutoTable.finalY + 4
  const lX = W - 90

  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.3)
  doc.line(lX, tY, W - 14, tY)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text('Sub Total', lX + 2, tY + 8)
  doc.setTextColor(...DARK)
  doc.text(`KES ${Number(sale.subtotal || sale.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, W - 14, tY + 8, { align: 'right' })

  let curY = tY + 8
  if (sale.discount_amount > 0) {
    curY += 7
    doc.setTextColor(...MUTED)
    doc.text('Discount', lX + 2, curY)
    doc.setTextColor(220, 38, 38)
    doc.text(`-KES ${Number(sale.discount_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, W - 14, curY, { align: 'right' })
  }

  // Grand total green box
  curY += 7
  doc.setFillColor(...GREEN)
  doc.roundedRect(lX, curY, W - 14 - lX, 12, 2, 2, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('Grand Total', lX + 4, curY + 8.5)
  doc.text(`KES ${Number(sale.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, W - 16, curY + 8.5, { align: 'right' })

  if (sale.mpesa_ref) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(`M-Pesa Ref: ${sale.mpesa_ref}`, 14, curY + 8)
  }

  // ── Footer green band ──
  doc.setFillColor(...GREEN)
  doc.rect(0, H - 16, W, 16, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text(s.receipt_footer, W / 2, H - 9, { align: 'center' })
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 230, 210)
  doc.text(`${s.phone}  |  ${s.email}`, W / 2, H - 4, { align: 'center' })

  doc.save(`invoice-${invoiceNum}.pdf`)
}