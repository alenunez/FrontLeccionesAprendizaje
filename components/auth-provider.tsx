"use client"

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react"
import {
  AuthSession,
  buildLoginUrl,
  buildLogoutUrl,
  clearSession,
  consumeRedirectPath,
  extractTokensFromHash,
  getStoredSession,
  isExpired,
  saveState,
  storeSession,
} from "@/lib/auth"
import { useRouter } from "next/navigation"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

interface AuthContextValue {
  session: AuthSession | null
  loading: boolean
  error?: string
  signIn: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const signOut = useCallback(() => {
    if (typeof window === "undefined") return
    setSession(null)
    clearSession()
    const postLogoutRedirectUri = `${window.location.origin}`
    window.location.href = buildLogoutUrl(postLogoutRedirectUri)
  }, [])

  const signIn = useCallback(() => {
    if (typeof window === "undefined") return
    // Use the exported HTML file directly to avoid directory resolution issues on
    // static hosts (e.g., Azure Static Web Apps). This prevents EISDIR errors
    // when the identity provider redirects back without a trailing slash.
    const redirectUri = `${window.location.origin}/redirect.html`
    const state = crypto.randomUUID()
    const nonce = crypto.randomUUID()
    saveState(state)
    const url = buildLoginUrl(redirectUri, state, nonce)
    window.location.href = url
  }, [])

  const enhanceSessionWithApi = useCallback(
    async (currentSession: AuthSession) => {
      if (!currentSession.accessToken) return currentSession

      try {
        const response = await fetch(`${API_BASE_URL}/Usuario/validar-token`, {
          method: "POST",
          headers: {
            Authorization: `${currentSession.tokenType ?? "Bearer"} ${currentSession.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: currentSession.accessToken }),
        })

        if (response.status === 401 || response.status === 403) {
          signOut()
          return currentSession
        }

        if (!response.ok) {
          console.error("No se pudo validar el token en el backend", response.statusText)
          return currentSession
        }

        const payload = (await response.json()) as {
          isUsuarioCreate?: boolean
          rolName?: string
          nombreRol?: string
          email?: string
          nombre?: string
        }

        const nextUser = {
          ...currentSession.user,
          name: payload.nombre ?? currentSession.user?.name,
          email: payload.email ?? currentSession.user?.email,
          role: payload.nombreRol ?? payload.rolName ?? currentSession.user?.role,
          isUsuarioCreate: payload.isUsuarioCreate ?? currentSession.user?.isUsuarioCreate,
        }

        const hasUserChanged =
          nextUser.name !== currentSession.user?.name ||
          nextUser.email !== currentSession.user?.email ||
          nextUser.role !== currentSession.user?.role ||
          nextUser.isUsuarioCreate !== currentSession.user?.isUsuarioCreate

        if (!hasUserChanged) {
          return currentSession
        }

        const updatedSession: AuthSession = {
          ...currentSession,
          user: nextUser,
        }

        storeSession(updatedSession)
        return updatedSession
      } catch (err) {
        console.error("No fue posible enriquecer la sesión del usuario", err)
        return currentSession
      }
    },
    [signOut],
  )

  useEffect(() => {
    const existingSession = getStoredSession()
    if (existingSession) {
      setSession(existingSession)
      setLoading(false)
      return
    }

    if (typeof window === "undefined") return

    const { session: redirectSession, error: redirectError } = extractTokensFromHash(window.location.hash)
    if (redirectSession) {
      storeSession(redirectSession)
      setSession(redirectSession)
      setLoading(false)
      window.history.replaceState({}, document.title, window.location.pathname)
      const redirectPath = consumeRedirectPath()
      router.replace(redirectPath ?? "/")
      return
    }

    if (redirectError) {
      setError(redirectError)
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    let isMounted = true
    const syncUser = async () => {
      if (!session) return
      const updatedSession = await enhanceSessionWithApi(session)
      if (isMounted && updatedSession !== session) {
        setSession(updatedSession)
      }
    }

    syncUser()

    return () => {
      isMounted = false
    }
  }, [session, enhanceSessionWithApi])

  useEffect(() => {
    if (!session?.expiresAt || typeof window === "undefined") return

    if (isExpired(session.expiresAt)) {
      signOut()
      return
    }

    const timeoutId = window.setTimeout(() => {
      signOut()
    }, session.expiresAt - Date.now())

    return () => window.clearTimeout(timeoutId)
  }, [session?.expiresAt, signOut])

  const value = useMemo(
    () => ({
      session,
      loading,
      error,
      signIn,
      signOut,
    }),
    [session, loading, error, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de AuthProvider")
  }
  return context
}

