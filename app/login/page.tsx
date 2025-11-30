"use client"

import Image from "next/image"
import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Sparkles, Workflow } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { audienceScope, clientId, tenantId } from "@/lib/auth"

const features = [
  {
    title: "Conexión segura",
    description: "Autenticación directa con Azure Active Directory usando OpenID Connect.",
    icon: ShieldCheck,
  },
  {
    title: "Acceso optimizado",
    description: "Token emitido para la audiencia corporativa protegida del API.",
    icon: Workflow,
  },
  {
    title: "Experiencia ágil",
    description: "Interfaz responsiva y adaptada a los colores e identidad de Solla.",
    icon: Sparkles,
  },
]

export default function LoginPage() {
  const { signIn, session, loading, error } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (session && !loading) {
      router.replace("/")
    }
  }, [session, loading, router])

  const audienceBadge = useMemo(() => audienceScope.replace("/.default", ""), [])

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/10 via-secondary/20 to-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-12 lg:flex-row lg:items-center lg:gap-12 lg:px-10">
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-primary/20 bg-card p-2 shadow-md">
              <Image src="https://www.solla.com/wp-content/uploads/2022/01/logo-solla-1.png" alt="Solla" fill className="object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">Gestor de Lecciones Aprendidas</p>
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">Bienvenido de nuevo</h1>
            </div>
          </div>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Accede con tus credenciales corporativas para continuar con la gestión de conocimiento. Usamos autenticación segura
            de Azure AD con la audiencia del API protegida.
          </p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-sm text-primary shadow-sm">
              Tenant ID: {tenantId}
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-sm text-primary shadow-sm">
              Client ID: {clientId}
            </Badge>
            <Badge variant="outline" className="rounded-full border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary shadow-sm">
              Audiencia: {audienceBadge}
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => (
              <Card key={item.title} className="border-none bg-white/80 shadow-lg">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <CardDescription className="text-sm text-muted-foreground">{item.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-10 w-full max-w-xl lg:mt-0">
          <Card className="overflow-hidden border-none shadow-2xl">
            <div className="bg-gradient-to-r from-primary to-accent px-6 py-4 text-primary-foreground">
              <p className="text-sm font-semibold uppercase tracking-[0.18em]">Ingreso corporativo</p>
              <p className="text-lg font-semibold">Autenticación con Azure Active Directory</p>
            </div>
            <CardContent className="space-y-6 bg-card p-8">
              <div className="space-y-2">
                <CardTitle className="text-xl font-bold text-foreground">Inicia sesión para continuar</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Se solicitará un token de acceso con la audiencia del API protegida. Si ya iniciaste sesión, te redirigiremos
                  automáticamente al tablero.
                </CardDescription>
              </div>
              {error ? <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
              <div className="space-y-4">
                <Button
                  size="lg"
                  className="w-full gap-2 rounded-xl bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90"
                  onClick={signIn}
                  disabled={loading}
                >
                  {loading ? "Preparando autenticación..." : "Ingresar con Active Directory"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Usaremos los permisos: openid, profile, email y la audiencia protegida del API ({audienceBadge}). El token se
                  almacenará de manera segura durante tu sesión actual.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
