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