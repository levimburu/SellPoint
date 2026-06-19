// M-Pesa Daraja API Integration
// All calls go through your backend (Supabase Edge Function) to protect credentials

const MPESA_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa`

/**
 * Initiate STK Push to customer phone
 * @param {string} phone - Phone number in format 254XXXXXXXXX
 * @param {number} amount - Amount in KES (integer)
 * @param {string} reference - Order/sale reference
 * @param {string} description - Short description
 */
export async function initiateStkPush({ phone, amount, reference, description }) {
  const normalized = normalizePhone(phone)
  if (!normalized) throw new Error('Invalid phone number format')

  const response = await fetch(`${MPESA_FUNCTION_URL}/stk-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      phone: normalized,
      amount: Math.ceil(amount),
      reference,
      description: description || 'Hedge Stores Purchase',
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || 'STK Push failed')
  }

  return response.json()
}

/**
 * Check STK Push transaction status
 * @param {string} checkoutRequestId
 */
export async function checkStkStatus(checkoutRequestId) {
  const response = await fetch(`${MPESA_FUNCTION_URL}/stk-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ checkoutRequestId }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || 'Status check failed')
  }

  return response.json()
}

/**
 * Normalize phone number to 254XXXXXXXXX format
 */
function normalizePhone(phone) {
  const cleaned = String(phone).replace(/\D/g, '')
  if (cleaned.startsWith('254') && cleaned.length === 12) return cleaned
  if (cleaned.startsWith('0') && cleaned.length === 10) return '254' + cleaned.slice(1)
  if (cleaned.startsWith('7') && cleaned.length === 9) return '254' + cleaned
  return null
}

export { normalizePhone }
