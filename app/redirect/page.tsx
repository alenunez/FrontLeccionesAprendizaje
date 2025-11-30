"use client"

import { Spinner } from "@/components/spinner"

export default function RedirectHandler() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/20 to-background text-foreground">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border/70 bg-card/90 p-8 text-center shadow-xl backdrop-blur-sm">
        <Spinner />
        <div>
          <p className="text-lg font-semibold">Procesando tu inicio de sesión…</p>
          <p className="text-sm text-muted-foreground">
            Estamos validando tus credenciales y te redirigiremos al panel principal en un instante.
          </p>
        </div>
      </div>
    </div>
  )
}
