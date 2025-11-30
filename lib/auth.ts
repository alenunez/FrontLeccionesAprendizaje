const SOLLA_CLIENT_ID = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ?? "c1867d25-8d36-4eb7-9318-ca4aee5ba48d"
const SOLLA_TENANT_ID = process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? "46a23419-32b8-42b0-b756-68be11181169"
export interface AuthSession {
  accessToken?: string
  tokenType: string
  idToken?: string
  expiresAt: number
  user?: {
    name?: string
    email?: string
  }
}

const STORAGE_KEY = "solla.auth.session"
const STATE_KEY = "solla.auth.state"

const baseAuthScopes = ["openid", "profile", "email"]

const decodeJwtPayload = (token?: string) => {
  if (!token) return undefined
  const parts = token.split(".")
  if (parts.length !== 3) return undefined
  try {
    const payload = parts[1]
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const decoded = atob(normalized)
    return JSON.parse(decoded) as { name?: string; preferred_username?: string; email?: string }
  } catch (error) {
    console.error("No se pudo decodificar el id_token", error)
    return undefined
  }
}

const isExpired = (expiresAt?: number) => !expiresAt || Date.now() > expiresAt

export const buildLoginUrl = (redirectUri: string, state: string, nonce: string) => {
  const url = new URL(`https://login.microsoftonline.com/${SOLLA_TENANT_ID}/oauth2/v2.0/authorize`)
  url.searchParams.set("client_id", SOLLA_CLIENT_ID)
  url.searchParams.set("response_type", "id_token")
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("scope", baseAuthScopes.join(" "))
  url.searchParams.set("state", state)
  url.searchParams.set("nonce", nonce)
  url.searchParams.set("response_mode", "fragment")
  return url.toString()
}

export const getStoredSession = (): AuthSession | null => {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as AuthSession
    if (isExpired(session.expiresAt)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch (error) {
    console.error("No se pudo leer la sesión almacenada", error)
    return null
  }
}

export const storeSession = (session: AuthSession) => {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export const clearSession = () => {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}

export const saveState = (state: string) => {
  if (typeof window === "undefined") return
  sessionStorage.setItem(STATE_KEY, state)
}

export const consumeState = () => {
  if (typeof window === "undefined") return null
  const value = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  return value
}

const parseHashParams = (hash: string) => {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash)
  return Object.fromEntries(params.entries()) as Record<string, string>
}

export const extractTokensFromHash = (hash: string): { session?: AuthSession; error?: string } => {
  const params = parseHashParams(hash)
  if (params.error) {
    return { error: params.error_description ?? params.error }
  }

  const state = params.state
  const expectedState = consumeState()
  if (expectedState && expectedState !== state) {
    return { error: "El estado de la solicitud no coincide" }
  }

  const tokenType = params.token_type ?? "Bearer"
  const expiresIn = Number.parseInt(params.expires_in ?? "3600", 10)
  const idToken = params.id_token
  const accessToken = params.access_token
  const tokenForExpiry = accessToken ?? idToken
  if (!tokenForExpiry) return {}
  const claims = decodeJwtPayload(idToken)

  const session: AuthSession = {
    accessToken,
    tokenType,
    idToken,
    expiresAt: Date.now() + expiresIn * 1000,
    user: {
      name: claims?.name,
      email: claims?.email ?? claims?.preferred_username,
    },
  }

  return { session }
}

export const buildLogoutUrl = (redirectUri: string) =>
  `https://login.microsoftonline.com/${SOLLA_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`

export const clientId = SOLLA_CLIENT_ID
export const tenantId = SOLLA_TENANT_ID
