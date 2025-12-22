"use client"

import Image from "next/image"
import { Suspense, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { consumeRedirectPath, saveRedirectPath } from "@/lib/auth"
import { useBranding } from "@/components/brand-provider"
import { themeToCssVariables } from "@/lib/branding"

function LoginPageContent() {
  const { signIn, session, loading, error } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { brand } = useBranding()
  const brandCssVars = useMemo(() => themeToCssVariables(brand.theme), [brand.theme])

  useEffect(() => {
    const redirect = searchParams.get("redirect")
    if (redirect) {
      saveRedirectPath(redirect)
    }
  }, [searchParams])

  useEffect(() => {
    if (session && !loading) {
      const redirectPath = consumeRedirectPath()
      router.replace(redirectPath ?? "/")
    }
  }, [session, loading, router])

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[color:var(--brand-soft)] via-white to-[color:var(--brand-muted)]"
      style={brandCssVars}
    >
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?auto=format&fit=crop&w=1920&q=80"
          alt="Fondo corporativo"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/90 to-[color:var(--brand-soft)]/75" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <Card className="w-full max-w-5xl overflow-hidden border border-white/70 bg-white/80 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div
            className="h-2 w-full"
            style={{
              background: `linear-gradient(90deg, var(--brand-primary-strong), var(--brand-primary), var(--brand-primary-strong))`,
            }}
          />
          <CardContent className="grid gap-10 p-8 md:grid-cols-[1.05fr_0.95fr] md:p-12">
            <div className="flex flex-col gap-8 text-[color:var(--brand-foreground)]">
              <div className="flex items-center gap-4 rounded-2xl bg-white/80 p-4 shadow-inner shadow-[color:var(--brand-soft)]">
                <div className="relative h-14 w-36 md:h-16 md:w-44">
                  <Image
                    src={brand.logoUrl}
                    alt="Logo corporativo"
                    fill
                    className="object-contain drop-shadow"
                    sizes="(min-width: 768px) 11rem, 9rem"
                    priority
                  />
                </div>
                <div className="hidden h-12 w-px bg-gradient-to-b from-[color:var(--brand-soft)] via-[color:var(--brand-border)] to-[color:var(--brand-soft)] md:block" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--brand-primary)]">Portal corporativo</p>
                  <p className="text-base font-semibold text-[color:var(--brand-foreground)]">Gestión de Lecciones Aprendidas</p>
                </div>
              </div>

              <div className="space-y-3">
                <CardTitle className="text-3xl font-semibold md:text-[34px]">Acceso seguro</CardTitle>
                <CardDescription className="text-base leading-relaxed text-[color:var(--brand-foreground)]/90">
                  Ingresa con tu credencial corporativa para continuar. Usuarios Azure Active Directory pueden autenticarse directamente en nuestro portal.
                </CardDescription>
              </div>

              <div className="grid gap-3 text-sm text-[color:var(--brand-foreground)]/90">
                <div className="rounded-xl bg-[color:var(--brand-soft)]/80 p-3 shadow-sm ring-1 ring-[color:var(--brand-soft)]">
                  <p className="font-semibold">Ingreso corporativo</p>
                  <p className="text-[color:var(--brand-foreground)]">Autenticación segura con Azure Active Directory y Office 365.</p>
                </div>
                <div className="rounded-xl bg-white/80 p-3 shadow-inner shadow-[color:var(--brand-soft)] ring-1 ring-[color:var(--brand-soft)]/60">
                  <p className="font-semibold">Privacidad garantizada</p>
                  <p className="text-[color:var(--brand-foreground)]">Tus datos permanecen protegidos bajo las políticas de seguridad de Solla.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-6 rounded-2xl bg-white/80 p-6 shadow-inner shadow-[color:var(--brand-soft)] ring-1 ring-[color:var(--brand-soft)]/70">
              {error ? (
                <div className="flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-left text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="font-semibold">No pudimos iniciar sesión</p>
                    <p className="text-destructive/90">{error}</p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4 text-center text-[color:var(--brand-foreground)]">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-primary)]">Ingreso con Office 365</p>
                <p className="text-base leading-relaxed text-[color:var(--brand-foreground)]/90">
                  Conéctate con tu cuenta corporativa para acceder a todas las funcionalidades de la aplicación.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full rounded-xl text-lg font-semibold text-[color:var(--brand-contrast)] shadow-lg shadow-[color:var(--brand-border)]/70 transition hover:-translate-y-0.5 focus-visible:ring-2"
                  style={{
                    backgroundColor: "var(--brand-primary)",
                    boxShadow: "0 10px 30px -12px color-mix(in srgb, var(--brand-primary) 35%, transparent)",
                  }}
                  onClick={signIn}
                  disabled={loading}
                >
                  {loading ? "Preparando autenticación..." : "Iniciar sesión con Office 365"}
                </Button>
                <p className="text-xs text-[color:var(--brand-foreground)]">Acceso corporativo protegido con Microsoft Office 365.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-emerald-900">Cargando…</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
