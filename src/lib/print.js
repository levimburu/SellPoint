// ============================================================
// SellPoint — Direct print (no PDF download, no dialog)
//
// Renders a receipt or invoice as HTML in a hidden iframe
// and calls window.print() on it. The OS sends it straight to
// whatever printer is selected — thermal for receipts, A4 for
// invoices. No file is saved or downloaded.
// ============================================================

const DEFAULT_SETTINGS = {
  store_name: 'Hedge Stores',
  tagline: 'Your Trusted Retail Partner',
  address: 'Kitale, Kenya',
  phone: '+254 723 482 184',
  email: 'info@hedgestores.co.ke',
  kra_pin: 'A000000000Z',
  receipt_footer: 'Thank you for your business!',
  currency: 'KES',
}

function money(n, currency = 'KES') {
  return `${currency} ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
}

function printHTML(html) {
  // Remove any existing print iframe
  const old = document.getElementById('sp-print-frame')
  if (old) old.remove()

  const iframe = document.createElement('iframe')
  iframe.id = 'sp-print-frame'
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  // Wait for images/fonts to load, then print
  iframe.onload = () => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch {}
    // Remove after a delay so the print dialog has time to open
    setTimeout(() => iframe.remove(), 3000)
  }
}

// ─── 80mm Thermal Receipt ─────────────────────────────────────
export function printReceipt(sale, storeSettings = {}) {
  const s = { ...DEFAULT_SETTINGS, ...storeSettings }
  const items = sale.items || []
  const receiptNum = sale.receipt_number || sale.id?.slice(0, 8).toUpperCase()
  const dateStr = sale.created_at
    ? new Date(sale.created_at).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })

  const itemRows = items.map(i => `
    <div class="row">
      <span class="item-name">${i.product_name || i.name}</span>
      <span>${money(i.unit_price * i.quantity, s.currency)}</span>
    </div>
    <div class="sub-row">${i.quantity} × ${money(i.unit_price, s.currency)}</div>
  `).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 0; size: 80mm auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    width: 80mm;
    padding: 6mm 4mm;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .store-name { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 2px; }
  .tagline { font-size: 11px; text-align: center; color: #444; margin-bottom: 4px; }
  .contact { font-size: 10px; text-align: center; color: #555; line-height: 1.5; margin-bottom: 6px; }
  .divider { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  .receipt-label { font-size: 13px; font-weight: bold; text-align: center; letter-spacing: 2px; margin: 4px 0; }
  .meta { font-size: 10px; line-height: 1.7; margin-bottom: 4px; }
  .row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
  .item-name { flex: 1; padding-right: 6px; }
  .sub-row { font-size: 10px; color: #555; padding-left: 4px; margin-bottom: 2px; }
  .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; padding: 3px 0; }
  .footer { text-align: center; font-size: 10px; color: #444; margin-top: 6px; line-height: 1.6; }
  .offline-note { font-size: 10px; color: #555; text-align: center; margin-top: 4px; }
</style>
</head>
<body>
  <div class="store-name">${s.store_name}</div>
  <div class="tagline">${s.tagline}</div>
  <div class="contact">${s.address}<br>${s.phone}<br>${s.email}</div>
  <hr class="divider">
  <div class="receipt-label">RECEIPT</div>
  <hr class="divider">
  <div class="meta">
    <div>No: <strong>${receiptNum}</strong></div>
    <div>Date: ${dateStr}</div>
    <div>Cashier: ${sale.cashier_name || 'Cashier'}</div>
    ${sale.customer_name ? `<div>Customer: ${sale.customer_name}</div>` : ''}
    <div>Payment: ${(sale.payment_method || 'CASH').toUpperCase().replace('_', ' ')}</div>
    ${sale.mpesa_ref ? `<div>M-Pesa Ref: ${sale.mpesa_ref}</div>` : ''}
  </div>
  <hr class="divider">
  ${itemRows}
  <hr class="divider">
  ${sale.discount_amount > 0 ? `
    <div class="row"><span>Subtotal</span><span>${money(sale.subtotal || sale.total, s.currency)}</span></div>
    <div class="row"><span>Discount</span><span>- ${money(sale.discount_amount, s.currency)}</span></div>
  ` : ''}
  <div class="total-row"><span>TOTAL</span><span>${money(sale.total, s.currency)}</span></div>
  <hr class="divider">
  <div class="footer">${s.receipt_footer}<br>${s.store_name} · KRA PIN: ${s.kra_pin}</div>
  ${!navigator.onLine ? '<div class="offline-note">[Offline sale — will sync when online]</div>' : ''}
</body>
</html>`

  printHTML(html)
}

// ─── A4 Invoice ───────────────────────────────────────────────
export function printInvoice(sale, storeSettings = {}) {
  const s = { ...DEFAULT_SETTINGS, ...storeSettings }
  const items = sale.items || []
  const invoiceNum = sale.invoice_number || `INV-${(sale.receipt_number || sale.id?.slice(0, 8)).toUpperCase()}`
  const dateStr = sale.created_at
    ? new Date(sale.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })

  const itemRows = items.map((i, idx) => `
    <tr style="background:${idx % 2 === 1 ? '#f6f6f6' : '#fff'}">
      <td style="padding:8px 10px;">${i.product_name || i.name}</td>
      <td style="padding:8px 10px; text-align:center;">${i.quantity}</td>
      <td style="padding:8px 10px; text-align:right;">${money(i.unit_price, s.currency)}</td>
      <td style="padding:8px 10px; text-align:right; font-weight:bold;">${money(i.unit_price * i.quantity, s.currency)}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 16mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #222; background: #fff; }
  .header-band { background: #545458; color: #fff; padding: 22px 0 26px; text-align: center; margin: -16mm -16mm 0; }
  .header-band .title { font-size: 26px; font-weight: normal; letter-spacing: 0.5px; }
  .pill { display: inline-block; background: #c9e8e5; color: #26544f; font-size: 10px; padding: 4px 12px; border-radius: 12px; margin-top: 10px; }
  .body { padding: 24px 0 0; }
  .invoice-word { font-size: 30px; font-weight: bold; color: #111; margin-bottom: 10px; }
  .meta { font-size: 11px; line-height: 1.85; margin-bottom: 20px; }
  .meta strong { font-weight: bold; }
  .two-col { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 11px; line-height: 1.65; }
  .two-col .left .store { font-weight: bold; font-size: 12px; }
  .two-col .left .tagline { font-style: italic; color: #767676; margin-bottom: 6px; }
  .two-col .right .label { font-weight: bold; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead tr { background: #545458; color: #fff; }
  th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: bold; border: 0.5px solid #545458; }
  td { border: 0.5px solid #d6d6d6; }
  .totals { display: flex; justify-content: flex-end; }
  .totals-inner { width: 220px; }
  .totals-row { display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0; }
  .totals-row span:first-child { color: #767676; }
  .grand-total { display: flex; justify-content: space-between; background: #545458; color: #fff; padding: 8px 12px; margin-top: 8px; font-weight: bold; font-size: 12px; }
  .footer { border-top: 0.5px solid #d6d6d6; margin-top: 28px; padding-top: 12px; text-align: center; }
  .footer .thanks { font-size: 11px; font-weight: bold; margin-bottom: 4px; }
  .footer .info { font-size: 9.5px; color: #767676; }
</style>
</head>
<body>
  <div class="header-band">
    <div class="title">${s.store_name} Invoice</div>
    <div class="pill">${s.tagline}</div>
  </div>
  <div class="body">
    <div class="invoice-word">INVOICE</div>
    <div class="meta">
      <div><strong>Invoice Number:</strong> #${invoiceNum}</div>
      <div><strong>Date:</strong> ${dateStr}</div>
      <div><strong>Payment Method:</strong> ${(sale.payment_method || 'CASH').toUpperCase().replace('_', ' ')}</div>
      ${sale.mpesa_ref ? `<div><strong>M-Pesa Ref:</strong> ${sale.mpesa_ref}</div>` : ''}
    </div>
    <div class="two-col">
      <div class="left">
        <div class="store">${s.store_name}</div>
        <div class="tagline">${s.tagline}</div>
        <div>${s.address}</div>
        <div>${s.phone}</div>
        <div>${s.email}</div>
        <div>KRA PIN: ${s.kra_pin}</div>
      </div>
      <div class="right">
        <div class="label">Billed To:</div>
        <div>${sale.customer_name || 'Walk-in Customer'}</div>
        ${sale.customer_phone ? `<div style="color:#767676">${sale.customer_phone}</div>` : ''}
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:center; width:50px;">Qty</th>
          <th style="text-align:right; width:90px;">Unit Price</th>
          <th style="text-align:right; width:90px;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
      <div class="totals-inner">
        <div class="totals-row"><span>Subtotal</span><span>${money(sale.subtotal || sale.total, s.currency)}</span></div>
        ${sale.discount_amount > 0 ? `<div class="totals-row"><span>Discount</span><span>- ${money(sale.discount_amount, s.currency)}</span></div>` : ''}
        <div class="grand-total"><span>Total</span><span>${money(sale.total, s.currency)}</span></div>
      </div>
    </div>
    <div class="footer">
      <div class="thanks">${s.receipt_footer}</div>
      <div class="info">${s.store_name} &nbsp;·&nbsp; ${s.address} &nbsp;·&nbsp; ${s.phone} &nbsp;·&nbsp; ${s.email}</div>
    </div>
  </div>
</body>
</html>`

  printHTML(html)
}