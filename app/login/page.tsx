"use client"

import Image from "next/image"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { AlertCircle, ShieldCheck, Mail, Lock } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

export default function LoginPage() {
  const { signIn, session, loading, error } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (session && !loading) {
      router.replace("/")
    }
  }, [session, loading, router])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f2f9f4] via-white to-[#d7ede2]">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(6,113,56,0.12)_0,_transparent_35%),_radial-gradient(circle_at_80%_0%,_rgba(15,169,88,0.12)_0,_transparent_30%)]" />
        <Image
          src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80"
          alt="Fondo"
          fill
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white via-white/90 to-[#f2f9f4]/80" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-8 text-slate-800">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-emerald-100">
              <Image src="/solla-favicon.svg" alt="Solla" fill className="p-3 object-contain" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Gestor de accesos autorizados</p>
              <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">Portal de Lecciones Aprendidas</h1>
            </div>
          </div>

          <p className="max-w-2xl text-lg text-slate-700">
            Ingresa de forma segura con tus credenciales corporativas. El acceso está protegido con Azure Active Directory y cumple con las políticas de seguridad de Solla.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-emerald-50 backdrop-blur">
              <div className="rounded-full bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Identidad verificada</p>
                <p className="text-sm text-slate-600">Autenticación directa con Azure AD</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-emerald-50 backdrop-blur">
              <div className="rounded-full bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Sesión protegida</p>
                <p className="text-sm text-slate-600">Tokens cifrados y controlados</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Ingreso corporativo</p>
            <p className="mt-2 text-base text-slate-700">Usa tu correo @solla.com para continuar con la autenticación.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-800 ring-1 ring-emerald-100">
                <Mail className="h-4 w-4" />
                <span>soporte-ti@solla.com</span>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-emerald-800 ring-1 ring-emerald-100">Operación 24/7</span>
            </div>
          </div>
        </div>

        <Card className="w-full max-w-md border-none bg-white/90 shadow-2xl ring-1 ring-emerald-100 backdrop-blur">
          <CardContent className="space-y-6 p-8">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-2xl">Acceso seguro</CardTitle>
              <CardDescription className="text-base">
                Conecta tu cuenta del directorio activo. No almacenamos credenciales, solo validamos tu identidad para habilitar el portal.
              </CardDescription>
            </div>

            {error ? (
              <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold">No pudimos iniciar sesión</p>
                  <p className="text-destructive/90">{error}</p>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full gap-2 rounded-xl bg-[#067138] text-white shadow-lg shadow-emerald-200/70 transition hover:bg-[#05592d]"
                onClick={signIn}
                disabled={loading}
              >
                {loading ? "Preparando autenticación..." : "Ingresar con Azure AD"}
              </Button>
              <p className="text-xs text-slate-600">
                Solo solicitaremos los permisos básicos (openid, profile y email) para validar tu identidad en el directorio activo.
              </p>
            </div>

            <p className="text-center text-xs text-slate-500">
              Si tienes problemas con tu cuenta, escribe a <span className="font-semibold text-emerald-700">soporte-ti@solla.com</span> indicando tu usuario corporativo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
