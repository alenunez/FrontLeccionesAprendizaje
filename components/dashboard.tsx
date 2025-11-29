"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Plus, Search, Filter, Eye, BarChart3, Presentation, LogOut, Edit3 } from "lucide-react"
import { LessonForm } from "./lesson-form"
import { LessonViewer } from "./lesson-viewer"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import type { ProyectoSituacionDto } from "@/types/lessons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSimulatedUser } from "@/lib/user-context"
import { canEditLesson } from "@/lib/permissions"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7043/api"
const BRAND_COLOR = "#067138"
const BRAND_ACCENT = "#0fa958"
const SOLLA_LOGO_URL = "https://www.solla.com/wp-content/uploads/2022/01/logo-solla-1.png"

interface LessonSummary {
  id: string
  projectOrSituation: string
  status: string
  responsable: string
  fecha: string
  proceso: string
  compania: string
  sede: string
}

const normalizeLessonsResponse = (payload: unknown): ProyectoSituacionDto[] => {
  if (Array.isArray(payload)) {
    return payload as ProyectoSituacionDto[]
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>
    if (Array.isArray(record.data)) {
      return record.data as ProyectoSituacionDto[]
    }
    if (Array.isArray(record.items)) {
      return record.items as ProyectoSituacionDto[]
    }
  }

  return []
}

const formatDate = (value?: string): string => {
  if (!value) return "Sin fecha"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

const mapLessons = (payload: ProyectoSituacionDto[]): LessonSummary[] =>
  payload.map((item, index) => {
    const proyecto = item.proyecto ?? {}
    const estadoDescripcion = proyecto.estado?.data?.descripcion ?? "Sin estado"
    const responsableNombre = proyecto.nombreResponsable ?? proyecto.nombreAutor ?? "Sin responsable"

    return {
      id: proyecto.id ?? `sin-id-${index}`,
      projectOrSituation: proyecto.descripcion ?? "Sin descripción",
      status: estadoDescripcion,
      responsable: responsableNombre,
      fecha: formatDate(proyecto.fecha),
      proceso: proyecto.proceso?.data?.nombre ?? "Sin proceso",
      compania: proyecto.sede?.data?.compania?.data?.nombre ?? "Sin compañía",
      sede: proyecto.sede?.data?.nombre ?? "Sin sede",
    }
  })

export function Dashboard() {
  const loggedUser = useSimulatedUser()
  const [activeTab, setActiveTab] = useState("lessons")
  const [showForm, setShowForm] = useState(false)
  const [lessonToEdit, setLessonToEdit] = useState<ProyectoSituacionDto | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [workflowFilter, setWorkflowFilter] = useState<string | null>(null)
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [rawLessons, setRawLessons] = useState<ProyectoSituacionDto[]>([])
  const [isLoadingLessons, setIsLoadingLessons] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<ProyectoSituacionDto | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    const handler = setTimeout(async () => {
      setIsLoadingLessons(true)
      setFetchError(null)
      try {
        const params = new URLSearchParams()
        params.set("query", searchQuery)
        const url = `${API_BASE_URL}/ProyectoSituacion/full?${params.toString()}`
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Error al cargar las lecciones: ${response.status}`)
        }
        const payload = await response.json()
        const normalized = normalizeLessonsResponse(payload)
        setRawLessons(normalized)
        setLessons(mapLessons(normalized))
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("No fue posible cargar las lecciones", error)
          setFetchError("No fue posible cargar la información. Intenta nuevamente.")
          setLessons([])
          setRawLessons([])
        }
      } finally {
        setIsLoadingLessons(false)
      }
    }, 400)

    return () => {
      clearTimeout(handler)
      controller.abort()
    }
  }, [searchQuery, reloadKey])

  const statusCounts = useMemo(() => {
    return lessons.reduce<Record<string, number>>((acc, lesson) => {
      acc[lesson.status] = (acc[lesson.status] ?? 0) + 1
      return acc
    }, {})
  }, [lessons])

  const filteredLessons = useMemo(
    () => lessons.filter((lesson) => !workflowFilter || lesson.status === workflowFilter),
    [lessons, workflowFilter],
  )

  const handleGeneratePPTX = (lesson: any) => {
    // Simulate PPTX generation
    console.log(`Generando presentación PPTX para: ${lesson.projectOrSituation}`)

    // Create a simple notification or download simulation
    const link = document.createElement("a")
    link.href = "#"
    link.download = `${lesson.id}_${lesson.projectOrSituation.replace(/\s+/g, "_")}.pptx`

    // Show a success message
    alert(`Generando presentación PPTX para: "${lesson.projectOrSituation}"\nArchivo: ${lesson.id}_presentacion.pptx`)
  }

  const handleViewLesson = (lesson: LessonSummary) => {
    const foundLesson = rawLessons.find((item) => item.proyecto?.id === lesson.id)
    if (foundLesson) {
      setSelectedLesson(foundLesson)
    } else {
      alert("No fue posible encontrar la información completa de esta lección.")
    }
  }

  const handleCloseViewer = () => {
    setSelectedLesson(null)
  }

  const handleFormSaved = () => {
    setShowForm(false)
    setLessonToEdit(null)
    setReloadKey((prev) => prev + 1)
  }

  const handleOpenForm = (lesson?: ProyectoSituacionDto) => {
    setLessonToEdit(lesson ?? null)
    setShowForm(true)
  }

  const handleLogout = () => {
    console.log("Cerrando sesión")
  }

  const eventsByProject = [
    { proyecto: "SAP Implementation", eventos: 12 },
    { proyecto: "Digital Transformation", eventos: 8 },
    { proyecto: "Quality Improvement", eventos: 15 },
    { proyecto: "Infrastructure Upgrade", eventos: 6 },
    { proyecto: "Process Automation", eventos: 10 },
  ]

  const lessonsByProject = [
    { proyecto: "SAP Implementation", lecciones: 24 },
    { proyecto: "Digital Transformation", lecciones: 18 },
    { proyecto: "Quality Improvement", lecciones: 32 },
    { proyecto: "Infrastructure Upgrade", lecciones: 14 },
    { proyecto: "Process Automation", lecciones: 21 },
  ]

  const lessonsByLeader = [
    { name: "María González", value: 28, color: BRAND_COLOR },
    { name: "Carlos Ruiz", value: 22, color: BRAND_ACCENT },
    { name: "Ana López", value: 19, color: "#45a06c" },
    { name: "Juan Pérez", value: 16, color: "#8fd0ab" },
    { name: "Luis Martín", value: 12, color: "#cbeed8" },
  ]

  const lessonsByCompany = [
    { compania: "Acme Corp", lecciones: 45 },
    { compania: "Tech Solutions", lecciones: 38 },
    { compania: "Global Industries", lecciones: 32 },
    { compania: "Innovation Labs", lecciones: 28 },
    { compania: "Future Systems", lecciones: 24 },
  ]

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#f4fff9] via-white to-[#d8f5e6] text-slate-900">
      <header className="border-b border-emerald-100 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10 xl:px-16 2xl:px-24">
          <div className="flex w-full flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex min-w-[260px] flex-1 items-start gap-4">
                <div className="rounded-2xl bg-[#067138] p-3 text-white shadow-lg">
                  <BookOpen className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#067138]/70">Gestión del conocimiento</p>
                  <h1 className="font-display text-3xl font-semibold leading-tight text-balance sm:text-4xl">
                    Sistema de Gestión de Lecciones Aprendidas
                  </h1>
                  <p className="text-base text-slate-600">
                    Sistema de gestión del conocimiento organizacional.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-3xl border border-emerald-100 bg-white/80 px-4 py-3 shadow-sm">
                <Image
                  src={SOLLA_LOGO_URL}
                  alt="Logo de Solla"
                  width={180}
                  height={64}
                  className="h-10 w-auto sm:h-12"
                  sizes="(min-width: 1024px) 180px, 150px"
                  priority
                />
                <span className="text-xs font-semibold uppercase tracking-[0.4em] text-[#067138]/70">Solla</span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
            <div className="flex items-center gap-3 rounded-3xl border border-emerald-100 bg-white/80 px-4 py-3 shadow-sm sm:w-auto">
              <Avatar className="border-2 border-[#e0f3e8]">
                <AvatarImage src={loggedUser.avatarUrl} alt={loggedUser.name} />
                <AvatarFallback>{loggedUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{loggedUser.name}</p>
                <p className="truncate text-xs text-slate-500">{loggedUser.role}</p>
                <p className="truncate text-xs text-[#067138]/80">{loggedUser.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-200 text-[#067138] hover:bg-[#e0f3e8]"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
            <Button
              onClick={() => handleOpenForm()}
              className="gap-2 rounded-full bg-[#067138] px-6 py-5 text-base font-semibold text-white shadow-xl shadow-emerald-200/60 transition hover:bg-[#05592d]"
            >
              <Plus className="h-4 w-4" />
              Nueva Lección
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-1 gap-2 rounded-2xl border border-emerald-100 bg-white/90 shadow-sm sm:grid-cols-2">
            <TabsTrigger
              value="lessons"
              className="flex items-center gap-2 rounded-xl data-[state=active]:bg-[#067138] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <BookOpen className="h-4 w-4" />
              Lecciones
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex items-center gap-2 rounded-xl data-[state=active]:bg-[#067138] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <BarChart3 className="h-4 w-4" />
              Analíticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lessons">
            <div className="space-y-8">
              <div className="flex flex-col gap-4 xl:flex-row">
                {/* Búsqueda Rápida */}
                <Card className="flex-1 border border-emerald-50 bg-white/80 shadow-sm backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="rounded-xl bg-[#e0f3e8] p-2">
                        <Search className="h-5 w-5 text-[#067138]" />
                      </div>
                      Búsqueda Rápida
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input
                        placeholder="Buscar Proyecto o situación"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 rounded-2xl border-slate-200 bg-white/70 focus:border-[#067138] focus:ring-[#067138]/20"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-slate-200 bg-white text-[#067138] transition hover:bg-[#e0f3e8]"
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Estados del Flujo de Trabajo - Compact version */}
                <Card className="border border-emerald-50 bg-white/80 shadow-sm backdrop-blur-sm">
                  <CardContent className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        {
                          status: "Borrador",
                          count: statusCounts["Borrador"] ?? 0,
                          color: "bg-slate-100 hover:bg-slate-200 border-slate-300",
                          textColor: "text-slate-700",
                          icon: "📝",
                        },
                        {
                          status: "En Revisión",
                          count: statusCounts["En Revisión"] ?? 0,
                          color: "bg-amber-50 hover:bg-amber-100 border-amber-200",
                          textColor: "text-amber-700",
                          icon: "👀",
                        },
                        {
                          status: "Publicado",
                          count: statusCounts["Publicado"] ?? 0,
                          color: "bg-[#e0f3e8] hover:bg-[#d1ecde] border-emerald-200",
                          textColor: "text-[#067138]",
                          icon: "🚀",
                        },
                      ].map((stage) => (
                        <Button
                          key={stage.status}
                          variant="outline"
                          size="sm"
                          className={`${stage.color} ${stage.textColor} border px-3 py-2 h-auto flex flex-col items-center gap-1 rounded-2xl text-center min-w-[70px] transition-all`}
                          onClick={() => setWorkflowFilter(workflowFilter === stage.status ? null : stage.status)}
                        >
                          <span className="text-xs">{stage.icon}</span>
                          <span className="text-lg font-bold leading-none">{stage.count}</span>
                          <span className="text-[9px] leading-none opacity-70">{stage.status}</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de Lecciones con Filtro de Estado */}
              <Card className="border border-emerald-50 bg-white/80 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex flex-col gap-3 text-xl lg:flex-row lg:items-center lg:justify-between">
                    Gestión de Lecciones
                    {workflowFilter && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full border-emerald-200 bg-[#e0f3e8] text-[#067138]">
                          Filtrado por: {workflowFilter}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setWorkflowFilter(null)}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          Limpiar filtro
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    {workflowFilter
                      ? `Lecciones en estado: ${workflowFilter}`
                      : "Todas las lecciones con gestión de flujo de trabajo integrada"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoadingLessons && (
                      <>
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div
                            key={`lesson-skeleton-${index}`}
                            className="flex items-start justify-between p-5 border border-slate-200 rounded-xl bg-white gap-4"
                          >
                            <div className="flex-1 space-y-3">
                              <Skeleton className="h-4 w-1/3" />
                              <Skeleton className="h-5 w-3/4" />
                              <div className="grid grid-cols-3 gap-x-6 gap-y-3 pt-2">
                                {Array.from({ length: 6 }).map((_, infoIndex) => (
                                  <div key={`lesson-info-${infoIndex}`} className="space-y-1">
                                    <Skeleton className="h-3 w-1/2" />
                                    <Skeleton className="h-4 w-full" />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-6 w-20" />
                              <Skeleton className="h-8 w-8" />
                              <Skeleton className="h-8 w-8" />
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {!isLoadingLessons && fetchError && (
                      <Alert variant="destructive">
                        <AlertTitle>No se pudo cargar la información</AlertTitle>
                        <AlertDescription>{fetchError}</AlertDescription>
                      </Alert>
                    )}

                    {!isLoadingLessons && !fetchError && filteredLessons.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-8">
                        No se encontraron proyectos ni situaciones para la búsqueda ingresada.
                      </p>
                    )}

                    {!isLoadingLessons && !fetchError &&
                      filteredLessons.map((lesson) => {
                        const fullLesson = rawLessons.find((item) => item.proyecto?.id === lesson.id)
                        const isEditable = canEditLesson(fullLesson, loggedUser)

                        return (
                          <div
                            key={lesson.id}
                            className="flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm transition-all duration-200 hover:border-[#067138]/40 hover:shadow-lg lg:flex-row lg:items-start lg:justify-between"
                          >
                          <div className="flex-1 space-y-3">
                            {/* Proyecto o Situación - Main title */}
                            <div>
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                Proyecto o Situación
                              </span>
                              <p className="text-base font-semibold text-slate-900 mt-1 text-balance">
                                {lesson.projectOrSituation}
                              </p>
                            </div>

                            {/* Grid with secondary information */}
                            <div className="grid grid-cols-1 gap-x-6 gap-y-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                              <div>
                                <span className="text-xs font-medium text-slate-500">Estado</span>
                                <p className="text-sm text-slate-900 mt-0.5">{lesson.status}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-500">Responsable</span>
                                <p className="text-sm text-slate-900 mt-0.5">{lesson.responsable}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-500">Fecha</span>
                                <p className="text-sm text-slate-900 mt-0.5">{lesson.fecha}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-500">Proceso</span>
                                <p className="text-sm text-slate-900 mt-0.5">{lesson.proceso}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-500">Compañía</span>
                                <p className="text-sm text-slate-900 mt-0.5">{lesson.compania}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-500">Sede</span>
                                <p className="text-sm text-slate-900 mt-0.5">{lesson.sede}</p>
                              </div>
                            </div>

                            {/* ID at the bottom */}
                            <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                              <span className="font-medium">{lesson.id}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge
                              variant={
                                lesson.status === "Publicado"
                                  ? "default"
                                  : lesson.status === "En Revisión"
                                    ? "secondary"
                                    : "outline"
                              }
                              className={
                                lesson.status === "Publicado"
                                  ? "rounded-full bg-[#e0f3e8] text-[#067138] border-emerald-200"
                                  : lesson.status === "En Revisión"
                                    ? "bg-amber-100 text-amber-800 border-amber-200"
                                    : "rounded-full bg-slate-100 text-slate-800 border-slate-200"
                              }
                            >
                              {lesson.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`text-[#065f46] hover:bg-[#e0f3e8] ${!isEditable ? "cursor-not-allowed opacity-60" : ""}`}
                              onClick={() => isEditable && fullLesson && handleOpenForm(fullLesson)}
                              title={
                                isEditable
                                  ? "Editar lección"
                                  : "Solo el autor en borrador, el responsable en revisión o un administrador pueden editar"
                              }
                              disabled={!isEditable || !fullLesson}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#b45309] hover:bg-orange-50"
                              onClick={() => handleGeneratePPTX(lesson)}
                              title="Generar presentación PPTX"
                            >
                              <Presentation className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#067138] hover:bg-[#e0f3e8]"
                              onClick={() => handleViewLesson(lesson)}
                              title="Visualizar lección"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-8">
              <Card className="border border-emerald-50 bg-white/80 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="rounded-xl bg-[#e0f3e8] p-2">
                      <BarChart3 className="h-5 w-5 text-[#067138]" />
                    </div>
                    Analíticas del Repositorio
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Visualización de métricas y tendencias del sistema de lecciones aprendidas
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Eventos por Proyecto */}
              <Card className="shadow-sm border border-emerald-50 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Eventos por Proyecto</CardTitle>
                  <CardDescription>Distribución de eventos registrados por proyecto</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eventsByProject}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="proyecto" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="eventos" fill={BRAND_COLOR} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Lecciones por Proyecto */}
              <Card className="shadow-sm border border-emerald-50 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Lecciones por Proyecto</CardTitle>
                  <CardDescription>Número de lecciones aprendidas capturadas por proyecto</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={lessonsByProject}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="proyecto" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="lecciones" fill={BRAND_ACCENT} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lecciones por Líder del Proyecto */}
                <Card className="shadow-sm border border-emerald-50 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Lecciones por Líder del Proyecto</CardTitle>
                    <CardDescription>Distribución de lecciones por líder responsable</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={lessonsByLeader}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill={BRAND_COLOR}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                            labelLine={false}
                          >
                            {lessonsByLeader.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Lecciones por Compañía */}
                <Card className="shadow-sm border border-emerald-50 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Lecciones por Compañía</CardTitle>
                    <CardDescription>Número de lecciones registradas por compañía</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={lessonsByCompany} layout="horizontal">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis dataKey="compania" type="category" tick={{ fontSize: 12 }} width={120} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar dataKey="lecciones" fill="#45a06c" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Lesson Form Modal */}
      {showForm && (
        <LessonForm
          onClose={() => {
            setLessonToEdit(null)
            setShowForm(false)
          }}
          onSaved={handleFormSaved}
          initialData={lessonToEdit ?? undefined}
          loggedUser={loggedUser}
        />
      )}
      {selectedLesson && <LessonViewer lesson={selectedLesson} onClose={handleCloseViewer} />}
    </div>
  )
}
