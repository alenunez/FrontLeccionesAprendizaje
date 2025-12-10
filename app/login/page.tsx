"use client"

import Image from "next/image"
import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { Spinner } from "@/components/spinner"
import { consumeRedirectPath, saveRedirectPath } from "@/lib/auth"

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoader />}>
      <LoginPageContent />
    </Suspense>
  )
}

const LoginPageContent = () => {
  const { signIn, session, loading, error } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f6f3ec] via-white to-[#ecf5ef]">
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?auto=format&fit=crop&w=1920&q=80"
          alt="Fondo corporativo"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/90 to-[#dfeee5]/75" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <Card className="w-full max-w-5xl overflow-hidden border border-white/70 bg-white/80 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="h-2 w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600" />
          <CardContent className="grid gap-10 p-8 md:grid-cols-[1.05fr_0.95fr] md:p-12">
            <div className="flex flex-col gap-8 text-emerald-900">
              <div className="flex items-center gap-4 rounded-2xl bg-white/80 p-4 shadow-inner shadow-emerald-100">
                <div className="relative h-14 w-36 md:h-16 md:w-44">
                  <Image
                    src="https://www.solla.com/wp-content/uploads/2022/01/logo-solla-1.png"
                    alt="Solla"
                    fill
                    className="object-contain drop-shadow"
                    sizes="(min-width: 768px) 11rem, 9rem"
                    priority
                  />
                </div>
                <div className="hidden h-12 w-px bg-gradient-to-b from-emerald-100 via-emerald-300 to-emerald-100 md:block" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Portal corporativo</p>
                  <p className="text-base font-semibold text-emerald-900">Gestión de Lecciones Aprendidas</p>
                </div>
              </div>

              <div className="space-y-3">
                <CardTitle className="text-3xl font-semibold md:text-[34px]">Acceso seguro</CardTitle>
                <CardDescription className="text-base leading-relaxed text-emerald-900/90">
                  Ingresa con tu credencial corporativa para continuar. Usuarios Azure Active Directory pueden autenticarse directamente en nuestro portal.
                </CardDescription>
              </div>

              <div className="grid gap-3 text-sm text-emerald-900/90">
                <div className="rounded-xl bg-emerald-50/80 p-3 shadow-sm ring-1 ring-emerald-100">
                  <p className="font-semibold">Ingreso corporativo</p>
                  <p className="text-emerald-800">Autenticación segura con Azure Active Directory y Office 365.</p>
                </div>
                <div className="rounded-xl bg-white/80 p-3 shadow-inner shadow-emerald-50 ring-1 ring-emerald-100/60">
                  <p className="font-semibold">Privacidad garantizada</p>
                  <p className="text-emerald-800">Tus datos permanecen protegidos bajo las políticas de seguridad de Solla.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-6 rounded-2xl bg-white/80 p-6 shadow-inner shadow-emerald-50 ring-1 ring-emerald-100/70">
              {error ? (
                <div className="flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-left text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="font-semibold">No pudimos iniciar sesión</p>
                    <p className="text-destructive/90">{error}</p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4 text-center text-emerald-900">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Ingreso con Office 365</p>
                <p className="text-base leading-relaxed text-emerald-900/90">
                  Conéctate con tu cuenta de Solla para acceder a todas las funcionalidades de la aplicación.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full rounded-xl bg-[#0a6f3c] text-lg font-semibold text-white shadow-lg shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:bg-[#085c31] focus-visible:ring-2 focus-visible:ring-emerald-300"
                  onClick={signIn}
                  disabled={loading}
                >
                  {loading ? "Preparando autenticación..." : "Iniciar sesión con Office 365"}
                </Button>
                <p className="text-xs text-emerald-800">Acceso corporativo protegido con Microsoft Office 365.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const LoginLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f6f3ec] via-white to-[#ecf5ef] px-4 py-12 text-emerald-900">
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/80 p-8 shadow-lg shadow-emerald-100 ring-1 ring-emerald-100">
      <Spinner />
      <p className="text-sm text-emerald-800">Preparando la página de inicio de sesión…</p>
    </div>
  </div>
)
