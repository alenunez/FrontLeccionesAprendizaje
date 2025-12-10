"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { ProtectedRoute } from "@/components/protected-route"
import { LessonForm } from "@/components/lesson-form"
import { Spinner } from "@/components/spinner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { useSimulatedUser, UserProvider, type SimulatedUser } from "@/lib/user-context"
import type { ProyectoSituacionDto } from "@/types/lessons"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export default function ProjectEditorPage() {
  const { session } = useAuth()

  const userFromSession: SimulatedUser | undefined = session
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
        <ProjectEditorContent />
      </UserProvider>
    </ProtectedRoute>
  )
}

function ProjectEditorContent() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()
  const loggedUser = useSimulatedUser()
  const [lesson, setLesson] = useState<ProyectoSituacionDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const authHeaders = useMemo<HeadersInit>(
    () => (session?.accessToken ? { Authorization: `${session.tokenType ?? "Bearer"} ${session.accessToken}` } : {}),
    [session?.accessToken, session?.tokenType],
  )

  const correoHeaders = useMemo<HeadersInit>(
    () => (loggedUser.email ? { correoUsuario: loggedUser.email } : {}),
    [loggedUser.email],
  )

  useEffect(() => {
    const controller = new AbortController()
    const lessonId = params?.id

    if (!lessonId) {
      setError("No se recibió un identificador de proyecto o situación válido.")
      setLoading(false)
      return
    }

    const fetchLesson = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE_URL}/ProyectoSituacion/full/edit/${lessonId}`, {
          signal: controller.signal,
          headers: { ...authHeaders, ...correoHeaders },
        })

        if (!response.ok) {
          throw new Error(`Error al cargar el proyecto: ${response.status}`)
        }

        const payload = (await response.json()) as ProyectoSituacionDto
        setLesson(payload)
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        console.error("No fue posible cargar el proyecto o situación", err)
        setError("No fue posible cargar la información del proyecto. Intenta nuevamente o regresa al inicio.")
        setLesson(null)
      } finally {
        setLoading(false)
      }
    }

    fetchLesson()

    return () => controller.abort()
  }, [params?.id, authHeaders, correoHeaders])

  const handleClose = () => {
    router.replace("/")
  }

  const handleSaved = () => {
    router.replace("/")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/30 to-background text-foreground">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card/80 p-8 shadow-lg backdrop-blur-sm">
          <Spinner />
          <p className="text-sm text-muted-foreground">Cargando la información del proyecto o situación…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/30 to-background text-foreground px-4">
        <div className="flex max-w-xl flex-col gap-4 rounded-3xl border border-destructive/30 bg-card/90 p-8 text-center shadow-lg backdrop-blur-sm">
          <p className="text-lg font-semibold text-destructive">No pudimos abrir el proyecto</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={handleClose} className="sm:min-w-[180px]">
              Volver al inicio
            </Button>
            <Button onClick={() => router.refresh()} className="sm:min-w-[180px]">
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/30 to-background text-foreground px-4">
        <div className="flex max-w-xl flex-col gap-4 rounded-3xl border border-border/60 bg-card/90 p-8 text-center shadow-lg backdrop-blur-sm">
          <p className="text-lg font-semibold">No encontramos el proyecto solicitado</p>
          <p className="text-sm text-muted-foreground">
            Verifica que el enlace sea correcto. Si el problema persiste, vuelve al panel y selecciona el proyecto manualmente.
          </p>
          <Button onClick={handleClose} className="sm:min-w-[180px]">
            Ir al panel principal
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/20 to-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Edición</p>
            <h1 className="text-2xl font-semibold">Proyecto o situación #{params.id}</h1>
          </div>
          <Button variant="outline" onClick={handleClose} className="rounded-full">
            Cerrar
          </Button>
        </div>
        <LessonForm onClose={handleClose} onSaved={handleSaved} initialData={lesson} loggedUser={loggedUser} />
      </div>
    </div>
  )
}
