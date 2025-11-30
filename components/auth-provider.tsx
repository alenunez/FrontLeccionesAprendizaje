"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  AuthSession,
  buildLoginUrl,
  buildLogoutUrl,
  clearSession,
  extractTokensFromHash,
  getStoredSession,
  saveState,
  storeSession,
} from "@/lib/auth"
import { useRouter } from "next/navigation"

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
      router.replace("/")
      return
    }

    if (redirectError) {
      setError(redirectError)
    }

    setLoading(false)
  }, [router])

  const signIn = () => {
    if (typeof window === "undefined") return
    const redirectUri = `${window.location.origin}/login`
    const state = crypto.randomUUID()
    const nonce = crypto.randomUUID()
    saveState(state)
    const url = buildLoginUrl(redirectUri, state, nonce)
    window.location.href = url
  }

  const signOut = () => {
    if (typeof window === "undefined") return
    setSession(null)
    clearSession()
    const postLogoutRedirectUri = `${window.location.origin}/login`
    window.location.href = buildLogoutUrl(postLogoutRedirectUri)
  }

  const value = useMemo(
    () => ({
      session,
      loading,
      error,
      signIn,
      signOut,
    }),
    [session, loading, error],
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

