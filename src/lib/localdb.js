// ============================================================
// SellPoint — Local-first database (IndexedDB via Dexie)
//
// This is the OFFLINE store. The app reads/writes here first,
// then syncs to Supabase when internet is available.
// No native modules, works in Electron AND the browser.
// ============================================================
import Dexie from 'dexie'

export const localdb = new Dexie('sellpoint_local')

// Schema mirrors the Supabase tables. The `&id` means id is the
// primary key. Extra indexes (after the comma) speed up lookups.
// `_dirty` marks rows changed locally that still need to sync up.
localdb.version(1).stores({
  products:           '&id, name, category, supplier_id, is_active, _dirty',
  customers:          '&id, name, phone, _dirty',
  suppliers:          '&id, name, is_active, _dirty',
  sales:              '&id, created_at, customer_id, status, _dirty',
  sale_items:         '&id, sale_id, product_id, _dirty',
  credit_sales:       '&id, customer_id, status, created_at, _dirty',
  credit_sale_items:  '&id, credit_sale_id, product_id, _dirty',
  purchases:          '&id, supplier_id, delivery_date, _dirty',
  purchase_items:     '&id, purchase_id, product_id, _dirty',
  settings:           '&id, _dirty',
  profiles:           '&id, username, role, _dirty',

  // Outbound queue: each local write that must be pushed to the
  // cloud is appended here, then drained when we reconnect.
  sync_queue:         '++seq, table, op, recordId, created_at',

  // Bookkeeping: last successful sync time, etc.
  meta:               '&key',
})

// ---- small helpers ----------------------------------------------------

// Generate a UUID locally so offline-created rows have stable ids
// that match Supabase's uuid format.
export function newId() {
  if (crypto?.randomUUID) return crypto.randomUUID()
  // fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Queue a change to be pushed to Supabase later.
export async function queueChange(table, op, record) {
  await localdb.sync_queue.add({
    table,
    op,                       // 'insert' | 'update' | 'delete'
    recordId: record.id,
    payload: record,
    created_at: new Date().toISOString(),
  })
}

// How many local changes are waiting to sync.
export async function pendingSyncCount() {
  return localdb.sync_queue.count()
}

export async function getMeta(key) {
  const row = await localdb.meta.get(key)
  return row?.value ?? null
}

export async function setMeta(key, value) {
  await localdb.meta.put({ key, value })
}