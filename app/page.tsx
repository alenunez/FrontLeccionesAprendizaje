"use client"

import { Dashboard } from "@/components/dashboard"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/components/auth-provider"
import { UserProvider } from "@/lib/user-context"

export default function Home() {
  const { session } = useAuth()

  const userFromSession = session
    ? {
        name: session.user?.name ?? "Usuario Solla",
        email: session.user?.email ?? "sesion@solla.com",
        role: session.user?.role ?? "Gestor de conocimiento",
        isUsuarioCreate: session.user?.isUsuarioCreate,
        avatarUrl: "",
      }
    : undefined

  return (
    <ProtectedRoute>
      <UserProvider user={userFromSession}>
        <Dashboard />
      </UserProvider>
    </ProtectedRoute>
  )
}
