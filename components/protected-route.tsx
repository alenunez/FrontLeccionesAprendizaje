"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "./auth-provider"
import { Spinner } from "@/components/spinner"
import { saveRedirectPath } from "@/lib/auth"

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!loading && !session) {
      const currentSearch = searchParams?.toString()
      const currentPath = currentSearch ? `${pathname}?${currentSearch}` : pathname
      if (currentPath) {
        saveRedirectPath(currentPath)
      }
      const redirectParam = currentPath ? `?redirect=${encodeURIComponent(currentPath)}` : ""
      router.replace(`/login${redirectParam}`)
    }
  }, [loading, session, router, pathname, searchParams])

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/30 to-background text-foreground">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card/80 p-8 shadow-lg backdrop-blur-sm">
          <Spinner />
          <p className="text-sm text-muted-foreground">Verificando tu sesión segura con Active Directory…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
