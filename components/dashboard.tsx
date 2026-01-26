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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  ProyectoSituacionDto,
  ProyectoSituacionEstadoCounts,
  ProyectoSituacionPaginatedResponse,
} from "@/types/lessons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSimulatedUser } from "@/lib/user-context"
import { canEditLesson } from "@/lib/permissions"
import { useAuth } from "@/components/auth-provider"
import { Spinner } from "./spinner"
import { useBranding } from "./brand-provider"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL 
interface LessonSummary {
  id: string
  projectOrSituation: string
  status: string
  responsable: string
  autorEmail?: string | null
  responsableEmail?: string | null
  fecha: string
  proceso: string
  compania: string
  sede: string
}

interface ProjectsByCompanyReport {
  companiaId?: string | number
  companiaNombre?: string | null
  totalProyectoSituaciones?: number
  totalProyectosSituaciones?: number
  nombre?: string | null
}

interface ProjectStatusByCompanyReport {
  estados?: Array<{ id?: string | number; descripcion?: string | null; totalProyectoSituaciones?: number }>
  id?: string | number
  nombre?: string | null
}

interface AverageEventsByCompanyReport {
  totalEventosProyecto?: number
  totalProyectosSituaciones?: number
  promedioEventosPorProyecto?: number
  companiaId?: string | number
  companiaNombre?: string | null
  nombre?: string | null
}

interface AverageLessonsByCompanyReport {
  totalLeccionesProyecto?: number
  totalProyectosSituaciones?: number
  promedioLeccionesPorProyecto?: number
  companiaId?: string | number
  companiaNombre?: string | null
  nombre?: string | null
}

interface ProjectsByYearCompanyReport {
  anio?: number
  companiaId?: string | number
  companiaNombre?: string | null
  proyectosPorAnio?: Array<{ anio?: number; totalProyectosSituaciones?: number; totalProyectoSituaciones?: number }>
  totalProyectoSituaciones?: number
  totalProyectosSituaciones?: number
  nombre?: string | null
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

const parseLessonsResponse = (
  payload: unknown,
): {
  items: ProyectoSituacionDto[]
  totalCount: number
  pageNumber: number
  pageSize: number
  estadoCounts?: ProyectoSituacionEstadoCounts
} => {
  const normalizedItems = normalizeLessonsResponse(payload)
  const typedPayload = (payload ?? {}) as ProyectoSituacionPaginatedResponse

  return {
    items: normalizedItems,
    totalCount: typedPayload.totalCount ?? normalizedItems.length,
    pageNumber: typedPayload.pageNumber ?? 1,
    pageSize: typedPayload.pageSize ?? (normalizedItems.length > 0 ? normalizedItems.length : 10),
    estadoCounts: typedPayload.estadoCounts,
  }
}

const normalizeReportArray = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[]

  if (payload && typeof payload === "object") {
    const record = payload as { items?: unknown; data?: unknown }
    if (Array.isArray(record.items)) return record.items as T[]
    if (Array.isArray(record.data)) return record.data as T[]
  }

  return []
}

const getTotalProjectsValue = (payload?: { totalProyectosSituaciones?: number; totalProyectoSituaciones?: number }): number => {
  if (!payload) return 0
  return payload.totalProyectosSituaciones ?? payload.totalProyectoSituaciones ?? 0
}

const getCompanyName = (item: { companiaNombre?: string | null; nombre?: string | null }): string =>
  item.companiaNombre ?? item.nombre ?? "Sin compañía"

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
    const projectId = proyecto.id != null ? `${proyecto.id}` : `sin-id-${index}`

    return {
      id: projectId,
      projectOrSituation: proyecto.descripcion ?? "Sin descripción",
      status: estadoDescripcion,
      responsable: responsableNombre,
      autorEmail: proyecto.correoAutor,
      responsableEmail: proyecto.correoResponsable,
      fecha: formatDate(proyecto.fecha),
      proceso: proyecto.proceso?.data?.nombre ?? "Sin proceso",
      compania: proyecto.sede?.data?.compania?.data?.nombre ?? "Sin compañía",
      sede: proyecto.sede?.data?.nombre ?? "Sin sede",
    }
  })

const normalizeEstadoKey = (value?: string | null): string | null => {
  if (!value) return null
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

const normalizeEstadoPayload = (payload: unknown): Array<{ id?: string | number; descripcion?: string; titulo?: string }> => {
  const record = (payload ?? {}) as { items?: Array<{ id?: string | number; descripcion?: string; titulo?: string }>; data?: unknown }
  if (Array.isArray(record.items)) return record.items
  if (Array.isArray(record.data)) return record.data as Array<{ id?: string | number; descripcion?: string; titulo?: string }>
  if (Array.isArray(payload)) return payload as Array<{ id?: string | number; descripcion?: string; titulo?: string }>
  return []
}

const normalizeEmail = (value?: string | null): string => value?.trim().toLowerCase() ?? ""

export function Dashboard() {
  const { session, signOut } = useAuth()
  const loggedUser = useSimulatedUser()
  const [activeTab, setActiveTab] = useState("lessons")
  const [showForm, setShowForm] = useState(false)
  const { brand } = useBranding()
  const brandPrimary = brand.theme.primary
  const brandAccent = brand.theme.accent
  const brandSoft = brand.theme.soft
  const brandStrong = brand.theme.primaryStrong
  const brandMuted = brand.theme.muted
  const isGalponsas = brand.brandKey === "galponsas"
  const isTransgraneles = brand.brandKey === "transgraneles"
  const isLargeLogoBrand = isGalponsas || isTransgraneles
  const logoConfig = isLargeLogoBrand
    ? { width: 320, height: 140, className: "h-24 sm:h-28 md:h-32" }
    : { width: 180, height: 64, className: "h-12 sm:h-14" }
  const largeLogoWrapperClasses = "min-h-[110px] min-w-[230px]"
  const logoWrapperClassName = `flex items-center justify-center rounded-2xl ${
    isTransgraneles
      ? `bg-[color:var(--brand-primary)]/90 px-6 py-4 shadow-inner ring-1 ring-[color:var(--brand-border)]/80 ${largeLogoWrapperClasses}`
      : isGalponsas
        ? `px-4 py-3 ${largeLogoWrapperClasses}`
        : "py-1"
  }`
  const [lessonToEdit, setLessonToEdit] = useState<ProyectoSituacionDto | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [workflowFilter, setWorkflowFilter] = useState<string | null>(null)
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [rawLessons, setRawLessons] = useState<ProyectoSituacionDto[]>([])
  const [isLoadingLessons, setIsLoadingLessons] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<ProyectoSituacionDto | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [estadoCounts, setEstadoCounts] = useState<ProyectoSituacionEstadoCounts>({
    borrador: 0,
    enRevision: 0,
    publicado: 0,
  })
  const [estadoIds, setEstadoIds] = useState<Record<string, string | number | undefined>>({})
  const PAGE_SIZE_OPTIONS = [5, 10, 15] as const
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[1])
  const [totalCount, setTotalCount] = useState(0)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [estadoFilterId, setEstadoFilterId] = useState<string | number | null>(null)
  const [projectsByCompany, setProjectsByCompany] = useState<ProjectsByCompanyReport[]>([])
  const [projectsByStatusCompany, setProjectsByStatusCompany] = useState<ProjectStatusByCompanyReport[]>([])
  const [averageEventsByCompany, setAverageEventsByCompany] = useState<AverageEventsByCompanyReport[]>([])
  const [averageLessonsByCompany, setAverageLessonsByCompany] = useState<AverageLessonsByCompanyReport[]>([])
  const [projectsByYearCompany, setProjectsByYearCompany] = useState<ProjectsByYearCompanyReport[]>([])
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [analyticsReloadKey, setAnalyticsReloadKey] = useState(0)
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false)
  const [presentationLessonId, setPresentationLessonId] = useState<string | null>(null)
  const isViewerOnly = loggedUser.isUsuarioCreate === false
  const showAnalyticsTab = !isViewerOnly
  const normalizedUserEmail = normalizeEmail(session?.user?.email ?? loggedUser.email)
  const userRole = session?.user?.role ?? loggedUser.role ?? ""

  const authHeaders = useMemo<HeadersInit>(
    () => (session?.accessToken ? { Authorization: `${session.tokenType ?? "Bearer"} ${session.accessToken}` } : {}),
    [session?.accessToken, session?.tokenType],
  )

  useEffect(() => {
    const controller = new AbortController()

    const fetchEstados = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/Estado`, { signal: controller.signal, headers: authHeaders })
        if (!response.ok) {
          throw new Error(`Error al cargar los estados: ${response.status}`)
        }
        const payload = await response.json()
        const estados = normalizeEstadoPayload(payload)
        setEstadoIds((prev) => {
          const next = { ...prev }
          estados.forEach((estado) => {
            const normalizedKey = normalizeEstadoKey(estado.descripcion ?? estado.titulo)
            if (normalizedKey && estado.id !== undefined && next[normalizedKey] === undefined) {
              next[normalizedKey] = estado.id
            }
          })
          return next
        })
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("No fue posible cargar los estados", error)
        }
      }
    }

    fetchEstados()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const handler = setTimeout(async () => {
      setIsLoadingLessons(true)
      setFetchError(null)
      try {
        const params = new URLSearchParams()
        params.set("query", searchQuery)
        params.set("pageNumber", pageNumber.toString())
        params.set("pageSize", pageSize.toString())
        params.set("sortDirection", sortDirection)
        if (estadoFilterId !== null) {
          params.set("idEstado", `${estadoFilterId}`)
        }

        const url = `${API_BASE_URL}/ProyectoSituacion/full?${params.toString()}`
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            ...authHeaders,
            correoUsuario: loggedUser.email,
          },
        })
        if (!response.ok) {
          throw new Error(`Error al cargar las lecciones: ${response.status}`)
        }
        const payload: ProyectoSituacionPaginatedResponse = await response.json()
        const { items, totalCount: total, estadoCounts: totalsByEstado } = parseLessonsResponse(payload)
        setRawLessons(items)
        setLessons(mapLessons(items))
        setTotalCount(total)
        setEstadoCounts({
          borrador: totalsByEstado?.borrador ?? 0,
          enRevision: totalsByEstado?.enRevision ?? 0,
          publicado: totalsByEstado?.publicado ?? 0,
        })
        setEstadoIds((prev) => {
          const next = { ...prev }
          items.forEach((item) => {
            const descripcion = item.proyecto?.estado?.data?.descripcion ?? item.proyecto?.estado?.descripcion
            const titulo = item.proyecto?.estado?.data?.titulo ?? item.proyecto?.estado?.titulo
            const id = item.proyecto?.estado?.id
            const normalizedKey = normalizeEstadoKey(descripcion ?? titulo)
            if (normalizedKey && id !== undefined && next[normalizedKey] === undefined) {
              next[normalizedKey] = id
            }
          })
          return next
        })
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("No fue posible cargar las lecciones", error)
          setFetchError("No fue posible cargar la información. Intenta nuevamente.")
          setLessons([])
          setRawLessons([])
          setEstadoCounts({ borrador: 0, enRevision: 0, publicado: 0 })
          setTotalCount(0)
          setEstadoIds({})
        }
      } finally {
        setIsLoadingLessons(false)
      }
    }, 400)

    return () => {
      clearTimeout(handler)
      controller.abort()
    }
  }, [
    estadoFilterId,
    loggedUser.email,
    pageNumber,
    pageSize,
    reloadKey,
    searchQuery,
    sortDirection,
  ])

  const statusCounts = useMemo(
    () => ({
      Borrador: estadoCounts.borrador ?? 0,
      "En Revisión": estadoCounts.enRevision ?? 0,
      Publicado: estadoCounts.publicado ?? 0,
    }),
    [estadoCounts],
  )

  const filteredLessons = useMemo(
    () => {
      if (estadoFilterId !== null) return lessons
      if (!workflowFilter) return lessons
      const normalizedFilter = normalizeEstadoKey(workflowFilter)
      if (!normalizedFilter) return lessons
      return lessons.filter((lesson) => normalizeEstadoKey(lesson.status) === normalizedFilter)
    },
    [estadoFilterId, lessons, workflowFilter],
  )

  const totalPages = useMemo(() => {
    if (pageSize <= 0) return 1
    const calculated = Math.ceil((totalCount ?? 0) / pageSize)
    return calculated > 0 ? calculated : 1
  }, [pageSize, totalCount])

  const handleWorkflowStageClick = (status: string) => {
    const nextStatus = workflowFilter === status ? null : status
    const normalizedKey = normalizeEstadoKey(nextStatus)
    setWorkflowFilter(nextStatus)
    setEstadoFilterId(nextStatus && normalizedKey ? estadoIds[normalizedKey] ?? null : null)
    setPageNumber(1)
  }

  const handleSortToggle = () => {
    setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))
    setPageNumber(1)
  }

  const canDownloadPresentation = (lesson: LessonSummary) => {
    const autorEmail = normalizeEmail(lesson.autorEmail)
    const responsableEmail = normalizeEmail(lesson.responsableEmail)
    const isOwner =
      normalizedUserEmail !== "" &&
      (normalizedUserEmail === autorEmail || normalizedUserEmail === responsableEmail)
    const isAdmin = userRole.trim().toLowerCase() === "administrador"
    const isPublished = normalizeEstadoKey(lesson.status) === "publicado"

    return (isAdmin || isOwner) && isPublished
  }

  const handleViewLesson = (lesson: LessonSummary) => {
    const foundLesson = rawLessons.find((item) => `${item.proyecto?.id ?? ""}` === lesson.id)
    if (foundLesson) {
      setSelectedLesson(foundLesson)
    } else {
      alert("No fue posible encontrar la información completa de esta lección.")
    }
  }

  const handlePageSizeChange = (value: number) => {
    if (!PAGE_SIZE_OPTIONS.includes(value as (typeof PAGE_SIZE_OPTIONS)[number])) return
    setPageSize(value)
    setPageNumber(1)
  }

  const handlePageChange = (direction: "next" | "prev") => {
    if (direction === "prev") {
      setPageNumber((prev) => Math.max(1, prev - 1))
      return
    }
    setPageNumber((prev) => Math.min(totalPages, prev + 1))
  }

  useEffect(() => {
    const maxPage = pageSize > 0 ? Math.max(1, Math.ceil(Math.max(totalCount, 0) / pageSize)) : 1
    if (pageNumber > maxPage) {
      setPageNumber(maxPage)
    }
  }, [pageNumber, pageSize, totalCount])

  useEffect(() => {
    if (isViewerOnly && activeTab !== "lessons") {
      setActiveTab("lessons")
    }
  }, [activeTab, isViewerOnly])

  useEffect(() => {
    if (!showAnalyticsTab) return

    const controller = new AbortController()

    const fetchReport = async <T,>(url: string): Promise<T> => {
      const response = await fetch(url, { headers: authHeaders, signal: controller.signal })
      if (!response.ok) {
        throw new Error(`Error al cargar el reporte: ${response.status}`)
      }
      return (await response.json()) as T
    }

    const fetchAnalytics = async () => {
      setIsLoadingAnalytics(true)
      setAnalyticsError(null)
      try {
        const [projectsCompanyPayload, statusByCompanyPayload, avgEventsPayload, avgLessonsPayload, projectsByYearPayload] =
          await Promise.all([
            fetchReport<unknown>(`${API_BASE_URL}/Reportes/proyectos-por-compania`),
            fetchReport<unknown>(`${API_BASE_URL}/Reportes/proyectos-por-estado-compania`),
            fetchReport<unknown>(`${API_BASE_URL}/Reportes/promedio-eventos-proyecto-compania`),
            fetchReport<unknown>(`${API_BASE_URL}/Reportes/promedio-lecciones-proyecto-compania`),
            fetchReport<unknown>(`${API_BASE_URL}/Reportes/proyectos-por-anio-compania`),
          ])

        setProjectsByCompany(normalizeReportArray<ProjectsByCompanyReport>(projectsCompanyPayload))
        setProjectsByStatusCompany(normalizeReportArray<ProjectStatusByCompanyReport>(statusByCompanyPayload))
        setAverageEventsByCompany(normalizeReportArray<AverageEventsByCompanyReport>(avgEventsPayload))
        setAverageLessonsByCompany(normalizeReportArray<AverageLessonsByCompanyReport>(avgLessonsPayload))
        setProjectsByYearCompany(normalizeReportArray<ProjectsByYearCompanyReport>(projectsByYearPayload))
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setAnalyticsError("No fue posible cargar las analíticas. Intenta nuevamente.")
          console.error("Error al cargar analíticas", error)
        }
      } finally {
        setIsLoadingAnalytics(false)
      }
    }

    fetchAnalytics()

    return () => controller.abort()
  }, [authHeaders, showAnalyticsTab, analyticsReloadKey])

  // const handleGeneratePPTX = (lesson: any) => {
  //   // Simulate PPTX generation
  //   console.log(`Generando presentación PPTX para: ${lesson.projectOrSituation}`)

  //   // Create a simple notification or download simulation
  //   const link = document.createElement("a")
  //   link.href = "#"
  //   link.download = `${lesson.id}_${lesson.projectOrSituation.replace(/\s+/g, "_")}.pptx`

  //   // Show a success message
  //   alert(`Generando presentación PPTX para: "${lesson.projectOrSituation}"\nArchivo: ${lesson.id}_presentacion.pptx`)
  // }

  const handleGeneratePPTX = async (lesson: LessonSummary) => {
    if (isGeneratingPresentation) return

    if (!API_BASE_URL) {
      alert("La URL base del API no está configurada (NEXT_PUBLIC_API_BASE_URL).")
      return
    }

    // lesson.id viene del proyecto.id (mapLessons)
    const proyectoId = Number(lesson.id)
    if (Number.isNaN(proyectoId)) {
      alert("El identificador del proyecto no es válido para generar la presentación.")
      return
    }

    setIsGeneratingPresentation(true)
    setPresentationLessonId(lesson.id)

    try {
      const url = `${API_BASE_URL}/proyectos/${proyectoId}/presentacion`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...authHeaders, // incluye Authorization si hay token
          // si tu endpoint requiere el correo como en el listado, lo agregas:
          correoUsuario: loggedUser.email,
          Accept:
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        console.error("Error al generar PPTX:", response.status, errorText)
        alert("No fue posible generar la presentación PPTX. Intenta nuevamente.")
        return
      }

      const blob = await response.blob()

      // Intentar obtener el nombre de archivo desde Content-Disposition
      const contentDisposition =
        response.headers.get("Content-Disposition") ||
        response.headers.get("content-disposition")
      let fileName = `LeccionesAprendidas_${proyectoId}.pptx`

      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^\"';]+)["']?/i)
        if (match && match[1]) {
          try {
            fileName = decodeURIComponent(match[1])
          } catch {
            fileName = match[1]
          }
        }
      }

      // Crear enlace temporal y disparar descarga
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error("Error inesperado al generar PPTX:", error)
      alert("Ocurrió un error inesperado al generar la presentación PPTX.")
    } finally {
      setIsGeneratingPresentation(false)
      setPresentationLessonId(null)
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
    signOut()
  }

  const projectsByCompanyChartData = useMemo(
    () =>
      projectsByCompany.map((item) => ({
        compania: getCompanyName(item),
        total: getTotalProjectsValue(item),
      })),
    [projectsByCompany],
  )

  const statusColorPalette = ["#94a3b8", "#fbbf24", "#34d399", "#0ea5e9", "#a78bfa", "#f472b6", "#7c3aed"]

  const statusKeys = useMemo(() => {
    const keys = new Set<string>()
    projectsByStatusCompany.forEach((company) => {
      company.estados?.forEach((estado) => keys.add(estado.descripcion ?? "Sin estado"))
    })
    return Array.from(keys)
  }, [projectsByStatusCompany])

  const statusColorMap = useMemo(
    () =>
      statusKeys.reduce((acc, status, index) => {
        acc[status] = statusColorPalette[index % statusColorPalette.length]
        return acc
      }, {} as Record<string, string>),
    [statusKeys],
  )

  const projectStatusChartData = useMemo(
    () =>
      projectsByStatusCompany.map((company) => {
        const entry: Record<string, number | string> = { compania: getCompanyName(company) }
        statusKeys.forEach((status) => {
          const match = company.estados?.find((estado) => (estado.descripcion ?? "Sin estado") === status)
          entry[status] = getTotalProjectsValue(match)
        })
        return entry
      }),
    [projectsByStatusCompany, statusKeys],
  )

  const averageEventsChartData = useMemo(
    () =>
      averageEventsByCompany.map((item) => ({
        compania: getCompanyName(item),
        promedio: Number(item.promedioEventosPorProyecto ?? 0),
      })),
    [averageEventsByCompany],
  )

  const averageLessonsChartData = useMemo(
    () =>
      averageLessonsByCompany.map((item) => ({
        compania: getCompanyName(item),
        promedio: Number(item.promedioLeccionesPorProyecto ?? 0),
      })),
    [averageLessonsByCompany],
  )

  const projectYearCompanies = useMemo(() => {
    const companies = new Set<string>()
    projectsByYearCompany.forEach((item) => companies.add(getCompanyName(item)))
    return Array.from(companies)
  }, [projectsByYearCompany])

  const companyColorPalette = [
    brandPrimary,
    brandAccent,
    brandMuted,
    "#7fc8a9",
    "#0ea5e9",
    "#a78bfa",
    "#f472b6",
    "#f97316",
  ]

  const companyColorMap = useMemo(
    () =>
      projectYearCompanies.reduce((acc, company, index) => {
        acc[company] = companyColorPalette[index % companyColorPalette.length]
        return acc
      }, {} as Record<string, string>),
    [projectYearCompanies],
  )

  const projectsByYearChartData = useMemo(() => {
    const yearMap = new Map<number, Record<string, number | string>>()

    projectsByYearCompany.forEach((item) => {
      const companyName = getCompanyName(item)
      const yearlyEntries =
        item.proyectosPorAnio ?? (item.anio != null ? [{ anio: item.anio, totalProyectosSituaciones: getTotalProjectsValue(item) }] : [])

      yearlyEntries.forEach((yearData) => {
        const year = yearData.anio ?? 0
        if (!yearMap.has(year)) {
          yearMap.set(year, { anio: year })
        }
        const entry = yearMap.get(year)
        if (entry) {
          entry[companyName] = getTotalProjectsValue(yearData)
        }
      })
    })

    return Array.from(yearMap.values()).sort((a, b) => Number(a.anio) - Number(b.anio))
  }, [projectsByYearCompany])

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#f4fff9] via-white to-[#d8f5e6] text-slate-900">
      {isGeneratingPresentation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-100 bg-white/90 px-6 py-5 shadow-xl">
            <Spinner />
            <p className="text-center text-sm font-semibold text-slate-700">
              Generando presentación en PowerPoint...
            </p>
            <p className="text-center text-xs text-slate-500">
              Espera un momento. Esta acción puede tardar unos segundos.
            </p>
          </div>
        </div>
      ) : null}
      <header className="border-b border-[color:var(--brand-soft)] bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10 xl:px-16 2xl:px-24">
          <div className="flex w-full flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex min-w-[260px] flex-1 items-start gap-4">
                <div className="rounded-2xl bg-[color:var(--brand-primary)] p-3 text-white shadow-lg">
                  <BookOpen className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-primary)] opacity-70">Gestión del conocimiento</p>
                  <h1 className="font-display text-3xl font-semibold leading-tight text-balance sm:text-4xl">
                    Sistema de Gestión de Lecciones Aprendidas
                  </h1>
                  <p className="text-base text-slate-600">
                    Sistema de gestión del conocimiento organizacional.
                  </p>
                </div>
              </div>
              <div
                className={`flex items-center gap-3 rounded-3xl border border-[color:var(--brand-soft)] bg-white/80 px-4 py-3 shadow-sm ${isTransgraneles ? "bg-[color:var(--brand-primary)]/10 ring-1 ring-[color:var(--brand-border)]" : ""}`}
              >
                <div className={logoWrapperClassName}>
                  <Image
                    src={brand.logoUrl}
                    alt="Logo corporativo"
                    width={logoConfig.width}
                    height={logoConfig.height}
                    className={`${logoConfig.className} w-auto`}
                    sizes={
                      isLargeLogoBrand
                        ? "(min-width: 1280px) 260px, (min-width: 1024px) 220px, 200px"
                        : "(min-width: 1024px) 180px, 150px"
                    }
                    priority
                  />
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.4em] text-[color:var(--brand-primary)] opacity-70">{brand.brandKey}</span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
            <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[color:var(--brand-soft)] bg-white/80 px-4 py-3 shadow-sm sm:w-auto">
              <Avatar className="border-2 border-[color:var(--brand-soft)]">
                <AvatarImage src={loggedUser.avatarUrl} alt={loggedUser.name} />
                <AvatarFallback>{loggedUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{loggedUser.name}</p>
                {!isViewerOnly ? <p className="truncate text-xs text-slate-500">{loggedUser.role}</p> : null}
                <p className="truncate text-xs text-[color:var(--brand-primary)] opacity-80">{loggedUser.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-[color:var(--brand-soft)] text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-soft)]"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
            {!isViewerOnly ? (
              <Button
                onClick={() => handleOpenForm()}
                className="gap-2 rounded-full px-6 py-5 text-base font-semibold text-white shadow-xl transition"
                style={{
                  backgroundColor: brandPrimary,
                  boxShadow: "0 20px 40px -22px color-mix(in srgb, var(--brand-primary) 70%, transparent)",
                }}
              >
                <Plus className="h-4 w-4" />
                Nueva Lección
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList
            className={`grid w-full grid-cols-1 gap-2 rounded-2xl border border-emerald-100 bg-white/90 shadow-sm ${showAnalyticsTab ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}
          >
            <TabsTrigger
              value="lessons"
              className="flex items-center gap-2 rounded-xl data-[state=active]:bg-[color:var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <BookOpen className="h-4 w-4" />
              Lecciones
            </TabsTrigger>
            {showAnalyticsTab ? (
              <TabsTrigger
                value="analytics"
              className="flex items-center gap-2 rounded-xl data-[state=active]:bg-[color:var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
                <BarChart3 className="h-4 w-4" />
                Analíticas
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="lessons">
            <div className="space-y-8">
              <div className="flex flex-col gap-4 xl:flex-row">
                {/* Búsqueda Rápida */}
                <Card className="flex-1 border border-[color:var(--brand-soft)] bg-white/80 shadow-sm backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="rounded-xl bg-[color:var(--brand-soft)] p-2">
                        <Search className="h-5 w-5 text-[color:var(--brand-primary)]" />
                      </div>
                      Búsqueda Rápida
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input
                        placeholder="Buscar Proyecto o situación"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          setPageNumber(1)
                        }}
                        className="flex-1 rounded-2xl border-slate-200 bg-white/70 focus:border-[color:var(--brand-primary)] focus:ring-[color:var(--brand-primary)]/20"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSortToggle}
                        className="border-slate-200 bg-white text-[color:var(--brand-primary)] transition hover:bg-[color:var(--brand-soft)]"
                      >
                        <Filter className="mr-2 h-4 w-4" />
                        Fecha {sortDirection === "desc" ? "↓" : "↑"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Estados del Flujo de Trabajo - Compact version */}
                <Card className="border border-[color:var(--brand-soft)] bg-white/80 shadow-sm backdrop-blur-sm">
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
                          color: "bg-[color:var(--brand-soft)] hover:bg-[color:var(--brand-muted)] border-[color:var(--brand-soft)]",
                          textColor: "text-[color:var(--brand-primary)]",
                          icon: "🚀",
                        },
                      ].map((stage) => (
                        <Button
                          key={stage.status}
                          variant="outline"
                          size="sm"
                          className={`${stage.color} ${stage.textColor} border px-3 py-2 h-auto flex flex-col items-center gap-1 rounded-2xl text-center min-w-[70px] transition-all`}
                          onClick={() => handleWorkflowStageClick(stage.status)}
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
                          <Badge
                            variant="outline"
                            className="rounded-full border-[color:var(--brand-soft)] bg-[color:var(--brand-soft)] text-[color:var(--brand-primary)]"
                          >
                            Filtrado por: {workflowFilter}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setWorkflowFilter(null)
                              setEstadoFilterId(null)
                              setPageNumber(1)
                            }}
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
                        const fullLesson = rawLessons.find((item) => `${item.proyecto?.id ?? ""}` === lesson.id)
                        const isEditable = canEditLesson(fullLesson, loggedUser)
                        const allowPresentationDownload = canDownloadPresentation(lesson)

                        return (
                          <div
                            key={lesson.id}
                            className="flex flex-col gap-4 rounded-2xl border border-[color:var(--brand-soft)] bg-white/90 p-5 shadow-sm transition-all duration-200 hover:border-[color:var(--brand-primary)]/50 hover:shadow-lg lg:flex-row lg:items-start lg:justify-between"
                          >
                          <div className="flex-1 space-y-3">
                            {/* Proyecto o Situación - Main title */}
                            <div>
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                Proyecto o Situación
                              </span>
                              <p className="text-base font-semibold text-slate-900 mt-1 text-balance break-words break-all">
                                {lesson.projectOrSituation}
                              </p>
                            </div>

                            {/* Grid with secondary information */}
                            <div className="grid grid-cols-1 gap-x-6 gap-y-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                              <div>
                                <span className="text-xs font-medium text-slate-500">Estado</span>
                                <p className="text-sm text-slate-900 mt-0.5 break-words break-all">{lesson.status}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-500">Responsable</span>
                                <p className="text-sm text-slate-900 mt-0.5 break-words break-all">{lesson.responsable}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-500">Fecha</span>
                                <p className="text-sm text-slate-900 mt-0.5 break-words break-all">{lesson.fecha}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-500">Proceso</span>
                                <p className="text-sm text-slate-900 mt-0.5 break-words break-all">{lesson.proceso}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-500">Compañía</span>
                                <p className="text-sm text-slate-900 mt-0.5 break-words break-all">{lesson.compania}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-500">Sede</span>
                                <p className="text-sm text-slate-900 mt-0.5 break-words break-all">{lesson.sede}</p>
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
                                  ? "rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand-primary)] border-[color:var(--brand-soft)]"
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
                              className={`text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-soft)] ${!isEditable ? "cursor-not-allowed opacity-60" : ""}`}
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
                            {allowPresentationDownload ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`text-[#b45309] hover:bg-orange-50 ${
                                  isViewerOnly || isGeneratingPresentation ? "cursor-not-allowed opacity-60" : ""
                                }`}
                                onClick={() => !isViewerOnly && handleGeneratePPTX(lesson)}
                                title={
                                  isViewerOnly
                                    ? "Acceso de solo lectura"
                                    : "Descargar presentación en PPTX"
                                }
                                disabled={isViewerOnly || isGeneratingPresentation}
                              >
                                {presentationLessonId === lesson.id && isGeneratingPresentation ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  <Presentation className="h-4 w-4" />
                                )}
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-soft)]"
                              onClick={() => handleViewLesson(lesson)}
                              title="Visualizar lección"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        )
                      })}
                    {!isLoadingLessons && !fetchError && totalCount >= 0 && (
                      <div className="flex flex-col gap-3 border-t border-[color:var(--brand-soft)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-slate-600">
                          {`Mostrando ${totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1}-${Math.min(totalCount, pageNumber * pageSize)} de ${totalCount} resultados`}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="text-sm text-slate-600" htmlFor="page-size-select">
                            Tamaño de página
                          </label>
                          <select
                            id="page-size-select"
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[color:var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[color:var(--brand-primary)]/30"
                            value={pageSize}
                            onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                          >
                            {PAGE_SIZE_OPTIONS.map((sizeOption) => (
                              <option key={`page-size-${sizeOption}`} value={sizeOption}>
                                {sizeOption}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 text-slate-700 hover:bg-[color:var(--brand-soft)]"
                              onClick={() => handlePageChange("prev")}
                              disabled={pageNumber <= 1 || totalCount === 0}
                            >
                              Anterior
                            </Button>
                            <span className="text-sm text-slate-600">
                              Página {pageNumber} de {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 text-slate-700 hover:bg-[color:var(--brand-soft)]"
                              onClick={() => handlePageChange("next")}
                              disabled={pageNumber >= totalPages || totalCount === 0}
                            >
                              Siguiente
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {showAnalyticsTab ? (
            <TabsContent value="analytics">
              <div className="space-y-8">
                <Card className="border border-[color:var(--brand-soft)] bg-white/80 shadow-sm backdrop-blur-sm">
                  <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="rounded-xl bg-[color:var(--brand-soft)] p-2">
                          <BarChart3 className="h-5 w-5 text-[color:var(--brand-primary)]" />
                        </div>
                        Analíticas del Repositorio
                      </CardTitle>
                      <CardDescription className="text-slate-600">
                        Visualización de métricas y tendencias del sistema de lecciones aprendidas
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      className="border-[color:var(--brand-soft)] text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-soft)]"
                      onClick={() => setAnalyticsReloadKey((prev) => prev + 1)}
                    >
                      Actualizar datos
                    </Button>
                  </CardHeader>
                </Card>

                {analyticsError ? (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertTitle>Ocurrió un problema</AlertTitle>
                      <AlertDescription>
                        {analyticsError} {" "}
                        <button
                          type="button"
                          onClick={() => setAnalyticsReloadKey((prev) => prev + 1)}
                          className="font-semibold text-[color:var(--brand-primary)] underline"
                        >
                          Reintentar
                        </button>
                    </AlertDescription>
                  </Alert>
                ) : null}

                {isLoadingAnalytics ? (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-emerald-100 bg-white/70 p-10 shadow-sm">
                    <Spinner />
                    <p className="text-sm text-slate-600">Cargando reportes, por favor espera...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <Card className="shadow-sm border border-emerald-50 bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg">Cantidad de proyectos o situaciones por compañía</CardTitle>
                        <CardDescription>Total de proyectos o situaciones registrados por empresa</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          {projectsByCompanyChartData.length === 0 ? (
                            <p className="text-sm text-slate-600">No hay datos disponibles para mostrar.</p>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={projectsByCompanyChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="compania" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "white",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                  }}
                                />
                                <Bar dataKey="total" fill={brandPrimary} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border border-emerald-50 bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg">Cantidad de proyectos o situaciones por estado y compañía</CardTitle>
                        <CardDescription>Distribución de estados (borrador, en revisión, publicado) para cada empresa</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-96">
                          {projectStatusChartData.length === 0 ? (
                            <p className="text-sm text-slate-600">No hay datos disponibles para mostrar.</p>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={projectStatusChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="compania" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "white",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                  }}
                                />
                                <Legend wrapperStyle={{ fontSize: "12px" }} />
                                {statusKeys.map((status) => (
                                  <Bar
                                    key={status}
                                    dataKey={status}
                                    stackId="estado"
                                    fill={statusColorMap[status] ?? brandAccent}
                                    radius={[4, 4, 0, 0]}
                                  />
                                ))}
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                      <Card className="shadow-sm border border-emerald-50 bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-lg">Promedio de eventos por proyecto o situación y compañía</CardTitle>
                          <CardDescription>Eventos registrados en promedio por cada proyecto o situación</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-72">
                            {averageEventsChartData.length === 0 ? (
                              <p className="text-sm text-slate-600">No hay datos disponibles para mostrar.</p>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={averageEventsChartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis dataKey="compania" tick={{ fontSize: 12 }} />
                                  <YAxis tick={{ fontSize: 12 }} />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: "white",
                                      border: "1px solid #e2e8f0",
                                      borderRadius: "8px",
                                    }}
                                  />
                                  <Bar dataKey="promedio" fill={brandPrimary} radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-sm border border-emerald-50 bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-lg">Promedio de lecciones por proyecto o situación y compañía</CardTitle>
                          <CardDescription>Lecciones aprendidas promedio registradas por proyecto o situación</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-72">
                            {averageLessonsChartData.length === 0 ? (
                              <p className="text-sm text-slate-600">No hay datos disponibles para mostrar.</p>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={averageLessonsChartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis dataKey="compania" tick={{ fontSize: 12 }} />
                                  <YAxis tick={{ fontSize: 12 }} />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: "white",
                                      border: "1px solid #e2e8f0",
                                      borderRadius: "8px",
                                    }}
                                  />
                                  <Bar dataKey="promedio" fill={brandAccent} radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="shadow-sm border border-emerald-50 bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg">Proyectos o situaciones por año y compañía</CardTitle>
                        <CardDescription>Evolución anual de proyectos o situaciones por empresa</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-96">
                          {projectsByYearChartData.length === 0 ? (
                            <p className="text-sm text-slate-600">No hay datos disponibles para mostrar.</p>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={projectsByYearChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="anio" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "white",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                  }}
                                />
                                <Legend wrapperStyle={{ fontSize: "12px" }} />
                                {projectYearCompanies.map((company) => (
                                  <Bar
                                    key={company}
                                    dataKey={company}
                                    fill={companyColorMap[company] ?? brandPrimary}
                                    radius={[4, 4, 0, 0]}
                                  />
                                ))}
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>
          ) : null}
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
