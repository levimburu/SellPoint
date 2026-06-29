// ============================================================
// SellPoint — Sync engine (Phase 2: pull/mirror)
//
// Copies Supabase tables down into the local IndexedDB store so
// pages can read data even with no internet. Phase 3/4 will add
// pushing local changes back up.
// ============================================================
import { supabase } from './supabase'
import { localdb, setMeta } from './localdb'

// Tables mirrored locally. Flat selects only — any "joins" are
// done in JS against the local store (IndexedDB has no joins).
const MIRROR_TABLES = [
  'products', 'customers', 'suppliers',
  'sales', 'sale_items',
  'credit_sales', 'credit_sale_items',
  'purchases', 'purchase_items',
  'settings', 'profiles',
]

// Pull one table from Supabase into the local store.
export async function pullTable(table) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw error
  if (Array.isArray(data)) {
    // Replace the local copy with the fresh server copy.
    await localdb[table].clear()
    if (data.length) await localdb[table].bulkPut(data)
  }
  return data?.length || 0
}

// Mirror everything. Safe to call on startup and on reconnect.
// Each table is isolated so one failure doesn't abort the rest.
export async function pullAll() {
  if (!navigator.onLine) return { ok: false, reason: 'offline' }
  let pulled = 0
  for (const t of MIRROR_TABLES) {
    try {
      await pullTable(t)
      pulled++
    } catch {
      /* table missing or transient error — skip, keep going */
    }
  }
  await setMeta('lastSync', new Date().toISOString())
  return { ok: true, tables: pulled }
}

// Convenience: read all rows of a local table (unsorted).
export async function readLocal(table) {
  try {
    return await localdb[table].toArray()
  } catch {
    return []
  }
}

// ============================================================
// Phase 3/4 — push queued offline changes up to Supabase
// ============================================================

// Postgres unique-violation = the row is already on the server.
function isDuplicate(err) {
  if (!err) return false
  return err.code === '23505' || /duplicate key/i.test(err.message || '')
}

// Drain the outbound queue. Runs on app load and on reconnect.
// Stops on the first hard failure and retries next time, so nothing
// is ever lost. Idempotent: re-pushing an already-synced sale is a
// no-op (duplicate key is treated as success).
export async function drainQueue() {
  if (!navigator.onLine) return { ok: false, reason: 'offline', drained: 0 }
  const entries = await localdb.sync_queue.orderBy('seq').toArray()
  let drained = 0

  for (const entry of entries) {
    try {
      if (entry.table === 'sale_bundle') {
        const { sale, items, invoice } = entry.payload

        // Insert the sale. If it's a duplicate, it was already pushed.
        const { error: sErr } = await supabase.from('sales').insert(sale)
        const saleIsNew = !sErr
        if (sErr && !isDuplicate(sErr)) throw sErr

        const { error: iErr } = await supabase.from('sale_items').insert(items)
        if (iErr && !isDuplicate(iErr)) throw iErr

        // Only decrement server stock if the sale was newly created,
        // so a retry never double-decrements.
        if (saleIsNew) {
          for (const it of items) {
            await supabase.rpc('decrement_stock', { product_id: it.product_id, qty: it.quantity })
          }
        }

        if (invoice) {
          const { error: invErr } = await supabase.from('invoices').insert(invoice)
          if (invErr && !isDuplicate(invErr)) { /* non-fatal */ }
        }
      }

      // Success → remove from queue
      await localdb.sync_queue.delete(entry.seq)
      drained++
    } catch (e) {
      // Stop here; the rest stays queued and retries next time.
      return { ok: false, reason: e.message, drained }
    }
  }

  if (drained > 0) await setMeta('lastSync', new Date().toISOString())
  return { ok: true, drained }
}