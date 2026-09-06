import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { createUser, getUserById, getUserByUsername, type UserRow } from "./db.ts"

const JWT_SECRET = process.env.JWT_SECRET ?? "tap-coin-dev-secret"
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export type PublicUser = {
  id: number
  username: string
  taps: number
  gasoline: number
}

export function toPublic(user: UserRow): PublicUser {
  return {
    id: user.id,
    username: user.username,
    taps: user.taps,
    gasoline: user.gasoline,
  }
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" })
}

export function verifyToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: number | string }
    const id = Number(payload.sub)
    return Number.isInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export function register(username: string, password: string): { user: PublicUser; token: string } {
  const name = username.trim()
  if (!USERNAME_RE.test(name)) {
    throw Object.assign(new Error("Логин: 3–20 символов, латиница, цифры и _"), {
      status: 400,
    })
  }
  if (typeof password !== "string" || password.length < 6 || password.length > 72) {
    throw Object.assign(new Error("Пароль: от 6 до 72 символов"), { status: 400 })
  }
  if (getUserByUsername(name)) {
    throw Object.assign(new Error("Такой логин уже занят"), { status: 409 })
  }
  const user = createUser(name, bcrypt.hashSync(password, 10))
  return { user: toPublic(user), token: signToken(user.id) }
}

export function login(username: string, password: string): { user: PublicUser; token: string } {
  const user = getUserByUsername(username.trim())
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw Object.assign(new Error("Неверный логин или пароль"), { status: 401 })
  }
  return { user: toPublic(user), token: signToken(user.id) }
}

export function userFromToken(token: string): PublicUser | null {
  const id = verifyToken(token)
  if (!id) return null
  const user = getUserById(id)
  return user ? toPublic(user) : null
}
