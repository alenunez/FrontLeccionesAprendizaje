"use client"

import Image from "next/image"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { AlertCircle, ShieldCheck } from "lucide-react"
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/10 via-background to-secondary/10 px-4 py-12 text-foreground">
      <div
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-10"
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10 rounded-3xl bg-white/70 p-8 shadow-2xl backdrop-blur-sm sm:p-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-primary/10 bg-white p-2 shadow-sm">
              <Image src="https://www.solla.com/wp-content/uploads/2022/01/logo-solla-1.png" alt="Solla" fill className="object-contain" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Gestor de lecciones aprendidas</p>
              <h1 className="text-3xl font-bold sm:text-4xl">Acceso seguro</h1>
            </div>
          </div>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Ingresa con tus credenciales corporativas para continuar. Usamos Azure Active Directory para autenticarte directamente en nuestro directorio.
          </p>
        </div>

        <Card className="w-full max-w-xl border-none bg-white/90 shadow-xl">
          <div className="flex items-center gap-3 bg-gradient-to-r from-primary to-secondary px-6 py-4 text-primary-foreground">
            <div className="rounded-full bg-white/20 p-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em]">Ingreso corporativo</p>
              <p className="text-sm text-primary-foreground/90">Autenticación con Azure Active Directory</p>
            </div>
          </div>
          <CardContent className="space-y-6 p-8">
            <div className="space-y-2">
              <CardTitle className="text-xl">Inicia sesión</CardTitle>
              <CardDescription className="text-base">
                Conecta tu cuenta del directorio activo para continuar. No mostramos información sensible del inquilino ni de la aplicación.
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
                className="w-full gap-2 rounded-xl bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90"
                onClick={signIn}
                disabled={loading}
              >
                {loading ? "Preparando autenticación..." : "Ingresar con Azure AD"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Solo solicitaremos los permisos básicos (openid, profile y email) para validar tu identidad en el directorio activo.
              </p>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              IDs de cliente y tenant se mantienen protegidos. Si necesitas ayuda, contacta a soporte corporativo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
