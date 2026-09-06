import { existsSync } from "node:fs"
import { createServer } from "node:http"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import express from "express"
import { WebSocketServer, type WebSocket } from "ws"
import { login, register, userFromToken, verifyToken } from "./auth.ts"
import { getUserById } from "./db.ts"
import { TICK_MS } from "./economy.ts"
import {
  addClient,
  currentPublicState,
  enqueueTaps,
  removeClient,
  snapshotFor,
  startEngine,
  type Client,
} from "./engine.ts"

const PORT = Number(process.env.PORT ?? 3001)
const root = dirname(fileURLToPath(import.meta.url))
const dist = join(root, "..", "..", "client", "dist")

const app = express()
app.use(express.json({ limit: "32kb" }))

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  if (_req.method === "OPTIONS") {
    res.status(204).end()
    return
  }
  next()
})

function readToken(header?: string): string | null {
  if (!header) return null
  const [type, token] = header.split(" ")
  if (type !== "Bearer" || !token) return null
  return token
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, tickMs: TICK_MS, ...currentPublicState() })
})

app.post("/api/register", (req, res) => {
  try {
    const { username, password } = req.body ?? {}
    const result = register(String(username ?? ""), String(password ?? ""))
    res.status(201).json(result)
  } catch (err) {
    const e = err as Error & { status?: number }
    res.status(e.status ?? 400).json({ error: e.message })
  }
})

app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body ?? {}
    const result = login(String(username ?? ""), String(password ?? ""))
    res.json(result)
  } catch (err) {
    const e = err as Error & { status?: number }
    res.status(e.status ?? 400).json({ error: e.message })
  }
})

app.get("/api/me", (req, res) => {
  const token = readToken(req.header("authorization"))
  const user = token ? userFromToken(token) : null
  if (!user) {
    res.status(401).json({ error: "Нужна авторизация" })
    return
  }
  res.json(user)
})

app.get("/api/snapshot", (req, res) => {
  const token = readToken(req.header("authorization"))
  const user = token ? userFromToken(token) : null
  if (!user) {
    res.status(401).json({ error: "Нужна авторизация" })
    return
  }
  res.json(snapshotFor(user.id))
})

if (existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/ws") {
      next()
      return
    }
    res.sendFile(join(dist, "index.html"))
  })
}

const server = createServer(app)
const wss = new WebSocketServer({ server, path: "/ws" })

type SocketData = { client?: Client; authed?: boolean }

function close(ws: WebSocket, code: number, reason: string): void {
  try {
    ws.close(code, reason)
  } catch {
    ws.terminate()
  }
}

wss.on("connection", (ws) => {
  const data = ws as WebSocket & SocketData
  data.authed = false
  const timeout = setTimeout(() => {
    if (!data.authed) close(ws, 4401, "auth timeout")
  }, 4000)

  ws.on("message", (raw) => {
    let msg: { type?: string; token?: string; n?: number }
    try {
      msg = JSON.parse(String(raw))
    } catch {
      return
    }

    if (!data.authed) {
      if (msg.type !== "auth" || typeof msg.token !== "string") {
        close(ws, 4401, "need auth")
        return
      }
      const userId = verifyToken(msg.token)
      if (!userId || !getUserById(userId)) {
        close(ws, 4401, "bad token")
        return
      }
      clearTimeout(timeout)
      data.authed = true
      const client: Client = { ws, userId, alive: true }
      data.client = client
      addClient(client)
      ws.send(JSON.stringify(snapshotFor(userId)))
      return
    }

    if (msg.type === "taps") {
      enqueueTaps(data.client!.userId, Number(msg.n))
    }
  })

  ws.on("pong", () => {
    if (data.client) data.client.alive = true
  })

  ws.on("close", () => {
    clearTimeout(timeout)
    if (data.client) removeClient(data.client)
  })
})

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    const data = ws as WebSocket & SocketData
    if (!data.client) continue
    if (!data.client.alive) {
      data.client.ws.terminate()
      continue
    }
    data.client.alive = false
    ws.ping()
  }
}, 30000)

startEngine()

server.listen(PORT, "0.0.0.0", () => {
  console.log(`tap-coin server http://0.0.0.0:${PORT}`)
})

function shutdown(): void {
  clearInterval(heartbeat)
  wss.close()
  server.close()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
