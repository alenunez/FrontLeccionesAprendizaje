"use client"

import Image from "next/image"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f6f3ec] via-[#f1ede5] to-[#e9f1ea] px-4 py-12">
      <Card className="w-full max-w-xl border border-emerald-50/70 bg-white/95 shadow-2xl shadow-emerald-100/60 backdrop-blur">
        <CardContent className="flex flex-col gap-10 p-10 md:flex-row md:items-center md:gap-12">
          <div className="flex w-full items-center gap-4 md:w-2/5 md:flex-col md:items-start md:gap-6">
            <div className="relative h-16 w-40 md:h-20 md:w-48">
              <Image
                src="https://www.solla.com/wp-content/uploads/2022/01/logo-solla-1.png"
                alt="Solla"
                fill
                className="object-contain drop-shadow"
                sizes="(min-width: 768px) 12rem, 10rem"
                priority
              />
            </div>
            <div className="hidden h-10 w-px bg-gradient-to-b from-emerald-100 via-emerald-200 to-emerald-50 md:block" />
          </div>

          <div className="flex w-full flex-col gap-6 text-emerald-900 md:w-3/5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Portal corporativo</p>
              <CardTitle className="text-3xl md:text-[32px]">Lecciones Aprendidas</CardTitle>
              <CardDescription className="text-base leading-relaxed text-emerald-800">
                Bienvenidos al sistema de gestión de lecciones aprendidas de Solla.
              </CardDescription>
            </div>

            {error ? (
              <div className="flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-left text-sm text-destructive">
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
                className="w-full rounded-xl bg-[#0a6f3c] text-white shadow-lg shadow-emerald-200/70 transition hover:bg-[#085c31]"
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
  )
}
