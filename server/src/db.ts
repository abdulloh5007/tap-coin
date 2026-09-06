import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"
import { START_PRICE } from "./economy.ts"

const root = dirname(fileURLToPath(import.meta.url))
const dataDir = join(root, "..", "data")
mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(join(dataDir, "tapcoin.db"))

db.exec("PRAGMA journal_mode = WAL")
db.exec("PRAGMA synchronous = NORMAL")
db.exec("PRAGMA foreign_keys = ON")

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    taps INTEGER NOT NULL DEFAULT 0,
    gasoline REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ticks (
    ts INTEGER PRIMARY KEY,
    price REAL NOT NULL,
    taps INTEGER NOT NULL,
    active INTEGER NOT NULL,
    gasoline_per_tap REAL NOT NULL
  );
`)

function metaGet(key: string): string | undefined {
  const row = db
    .prepare("SELECT value FROM meta WHERE key = ?")
    .get(key) as { value: string } | undefined
  return row?.value
}

function metaSet(key: string, value: string): void {
  db.prepare(
    "INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value)
}

if (!metaGet("price")) metaSet("price", String(START_PRICE))
if (!metaGet("total_taps")) metaSet("total_taps", "0")
if (!metaGet("total_gasoline")) metaSet("total_gasoline", "0")

export type UserRow = {
  id: number
  username: string
  password_hash: string
  taps: number
  gasoline: number
  created_at: number
}

export function createUser(username: string, passwordHash: string): UserRow {
  const now = Date.now()
  const result = db
    .prepare(
      "INSERT INTO users(username, password_hash, created_at) VALUES(?, ?, ?)",
    )
    .run(username, passwordHash, now)
  return getUserById(Number(result.lastInsertRowid))!
}

export function getUserById(id: number): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | UserRow
    | undefined
}

export function getUserByUsername(username: string): UserRow | undefined {
  return db
    .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
    .get(username) as UserRow | undefined
}

export function getPrice(): number {
  const v = Number(metaGet("price"))
  return Number.isFinite(v) && v > 0 ? v : START_PRICE
}

export function getTotals(): { taps: number; gasoline: number } {
  return {
    taps: Number(metaGet("total_taps") ?? 0) || 0,
    gasoline: Number(metaGet("total_gasoline") ?? 0) || 0,
  }
}

export type TickRow = {
  ts: number
  price: number
  taps: number
  active: number
  gasoline_per_tap: number
}

export function loadHistory(seconds: number): TickRow[] {
  const since = Date.now() - seconds * 1000
  return db
    .prepare(
      "SELECT ts, price, taps, active, gasoline_per_tap FROM ticks WHERE ts >= ? ORDER BY ts ASC",
    )
    .all(since) as TickRow[]
}

export type UserDelta = { id: number; taps: number; gasoline: number }

export function commitTick(input: {
  ts: number
  price: number
  taps: number
  active: number
  gasolinePerTap: number
  totalTaps: number
  totalGasoline: number
  userDeltas: UserDelta[]
}): void {
  const applyUser = db.prepare(
    "UPDATE users SET taps = taps + ?, gasoline = gasoline + ? WHERE id = ?",
  )
  const insertTick = db.prepare(
    "INSERT OR REPLACE INTO ticks(ts, price, taps, active, gasoline_per_tap) VALUES(?, ?, ?, ?, ?)",
  )
  db.exec("BEGIN")
  try {
    metaSet("price", String(input.price))
    metaSet("total_taps", String(input.totalTaps))
    metaSet("total_gasoline", String(input.totalGasoline))
    insertTick.run(
      input.ts,
      input.price,
      input.taps,
      input.active,
      input.gasolinePerTap,
    )
    for (const u of input.userDeltas) {
      applyUser.run(u.taps, u.gasoline, u.id)
    }
    db.exec("COMMIT")
  } catch (err) {
    db.exec("ROLLBACK")
    throw err
  }
}

export function pruneTicks(olderThanMs: number): void {
  db.prepare("DELETE FROM ticks WHERE ts < ?").run(Date.now() - olderThanMs)
}
