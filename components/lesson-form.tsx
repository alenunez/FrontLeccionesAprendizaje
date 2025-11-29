"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Save, Plus, Trash2, Upload, FileText, Edit, Loader2, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import type { ProyectoSituacionDto, ProyectoSituacionEventoDto } from "@/types/lessons"
import type { SimulatedUser } from "@/lib/user-context"
import { canEditLesson } from "@/lib/permissions"
import { flattenEventoDto } from "@/lib/event-normalizer"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7043/api"

interface LessonFormProps {
  onClose: () => void
  onSaved: () => void
  initialData?: ProyectoSituacionDto
  loggedUser: SimulatedUser
}

interface Attachment {
  id: string
  name: string
  size: string
  type: string
}

interface Event {
  id: string
  evento: string
  impactos: { id: string; description: string }[]
  accionesImplementadas: { id: string; description: string; relatedImpactos: string[] }[]
  resultados: { id: string; description: string; relatedAcciones: string[] }[]
  leccionesAprendidas: { id: string; description: string; relatedResultados: string[] }[]
}

interface RemoteEntity {
  id?: string | number
  Id?: string | number
  codigo?: string | number
  nombre?: string
  Nombre?: string
  name?: string
  Name?: string
  [key: string]: unknown
}

interface SelectOption {
  id: string
  nombre: string
}

interface SedeOption extends SelectOption {
  companiaId?: string
}

interface DirectoryUser {
  id: string
  name: string
  email?: string
  title?: string
}

interface FormDataState {
  autorNombre: string
  autorCorreo: string
  estado: string
  fecha: string
  proceso: string
  compania: string
  sede: string
  responsable: string
  responsableCorreo: string
  proyectoOSituacion: string
  aplicacionPractica: string
}

const isDefined = <T,>(value: T | undefined | null): value is T => value !== undefined && value !== null

const normalizePayload = (payload: unknown): RemoteEntity[] => {
  if (Array.isArray(payload)) {
    return payload as RemoteEntity[]
  }

  if (payload && typeof payload === "object") {
    const recordPayload = payload as Record<string, unknown>
    if (Array.isArray(recordPayload.items)) {
      return recordPayload.items as RemoteEntity[]
    }
    if (Array.isArray(recordPayload.data)) {
      return recordPayload.data as RemoteEntity[]
    }
    return [payload as RemoteEntity]
  }

  return []
}

const toSelectOptions = (entities: RemoteEntity[]): SelectOption[] =>
  entities.map((entity, index) => {
    const identifier = entity.id ?? entity.Id ?? entity.codigo ?? index
    const label = entity.nombre ?? entity.Nombre ?? entity.name ?? entity.Name ?? "Sin nombre"

    return {
      id: String(identifier),
      nombre: String(label),
    }
  })

const toSedeOptions = (entities: RemoteEntity[]): SedeOption[] =>
  entities.map((entity, index) => {
    const identifier = entity.id ?? entity.Id ?? entity.codigo ?? index
    const label = entity.nombre ?? entity.Nombre ?? entity.name ?? entity.Name ?? "Sin nombre"
    const compania = (entity as { compania?: RemoteEntity }).compania
    const companiaId =
      (compania?.id ?? compania?.Id ?? (compania as { data?: RemoteEntity })?.data?.id ??
        (compania as { data?: RemoteEntity })?.data?.Id) ??
      undefined

    return {
      id: String(identifier),
      nombre: String(label),
      companiaId: companiaId ? String(companiaId) : undefined,
    }
  })

const fetchEntities = async (
  endpoint: string,
  setter: React.Dispatch<React.SetStateAction<SelectOption[]>>,
  signal: AbortSignal,
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, { signal })
    if (!response.ok) {
      throw new Error(`Error al cargar ${endpoint}: ${response.status}`)
    }
    const payload = await response.json()
    const normalized = toSelectOptions(normalizePayload(payload))
    setter(normalized)
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      console.error(`No fue posible cargar ${endpoint}`, error)
    }
  }
}

const fetchSedes = async (
  setter: React.Dispatch<React.SetStateAction<SedeOption[]>>,
  signal: AbortSignal,
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/Sede`, { signal })
    if (!response.ok) {
      throw new Error(`Error al cargar sedes: ${response.status}`)
    }
    const payload = await response.json()
    setter(toSedeOptions(normalizePayload(payload)))
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      console.error("No fue posible cargar las sedes", error)
    }
  }
}

const normalizeUserSuggestions = (payload: unknown): DirectoryUser[] => {
  const entities = normalizePayload(payload)

  return entities.map((entity, index) => {
    const identifier =
      entity.id ?? entity.Id ?? entity.userPrincipalName ?? entity.UserPrincipalName ?? entity.oid ?? index
    const displayName =
      entity.displayName ?? entity.DisplayName ?? entity.nombre ?? entity.Nombre ?? entity.name ?? "Sin nombre"
    const email = entity.mail ?? entity.email ?? entity.userPrincipalName ?? entity.UserPrincipalName
    const title = entity.jobTitle ?? entity.cargo ?? entity.title

    return {
      id: String(identifier),
      name: String(displayName),
      email: email ? String(email) : undefined,
      title: title ? String(title) : undefined,
    }
  })
}

const getEstadoDescripcionFromEntity = (estado: RemoteEntity): string => {
  const descripcion = estado.descripcion ?? estado.description ?? estado.nombre ?? estado.Nombre ?? estado.name ?? estado.Name
  return typeof descripcion === "string" ? descripcion : ""
}

const mergeUsers = (current: DirectoryUser[], incoming: DirectoryUser[]): DirectoryUser[] => {
  const registry = new Map(current.map((user) => [user.id, user]))
  incoming.forEach((user) => registry.set(user.id, user))
  return Array.from(registry.values())
}

const normalizeAccessLevel = (value: unknown): "Público" | "Privado" => {
  if (typeof value === "boolean") {
    return value ? "Privado" : "Público"
  }

  if (typeof value === "string") {
    const normalized = value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/\s+/g, "")

    if (normalized === "privado") return "Privado"
    if (normalized === "publico") return "Público"
  }

  return "Público"
}

const normalizeStatus = (value?: string | null): string => {
  if (!value) return ""
  return value
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

const extractEstadoFromProyecto = (proyecto: ProyectoSituacionDto["proyecto"] | undefined): string => {
  const estadoData = proyecto?.estado as { descripcion?: string; name?: string; value?: string; data?: { descripcion?: string } }
  return (
    estadoData?.data?.descripcion ??
    estadoData?.descripcion ??
    estadoData?.name ??
    estadoData?.value ??
    "Borrador"
  )
}

const mapEventoDtoToState = (eventoDto: ProyectoSituacionEventoDto, eventIndex: number): Event => {
  const flattened = flattenEventoDto(eventoDto, eventIndex)

  const normalizeId = (candidate: string | number | undefined, fallback: string) =>
    String(candidate ?? fallback)

  const normalizeDescription = (
    primary?: string | null,
    secondary?: string | null,
    fallbackLabel?: string,
  ) => {
    const normalized = primary?.toString().trim() || secondary?.toString().trim()
    if (normalized && normalized.length > 0) return normalized
    return fallbackLabel ?? ""
  }

  const extractId = (value: unknown): string | null => {
    if (typeof value === "string" || typeof value === "number") {
      return String(value)
    }

    if (value && typeof value === "object") {
      const record = value as {
        id?: string | number
        identificador?: string | number
        impacto?: { id?: string | number; identificador?: string | number }
        accion?: { id?: string | number; identificador?: string | number }
        resultado?: { id?: string | number; identificador?: string | number }
        leccion?: { id?: string | number; identificador?: string | number }
      }

      return (
        record.identificador ??
        record.id ??
        record.impacto?.identificador ??
        record.impacto?.id ??
        record.accion?.identificador ??
        record.accion?.id ??
        record.resultado?.identificador ??
        record.resultado?.id ??
        record.leccion?.identificador ??
        record.leccion?.id ??
        null
      )
        ? String(
            record.identificador ??
              record.id ??
              record.impacto?.identificador ??
              record.impacto?.id ??
              record.accion?.identificador ??
              record.accion?.id ??
              record.resultado?.identificador ??
              record.resultado?.id ??
              record.leccion?.identificador ??
              record.leccion?.id,
          )
        : null
    }

    return null
  }

  const normalizeIds = (values?: unknown[]) =>
    Array.from(new Set((values ?? []).map(extractId).filter((value): value is string => Boolean(value))))

  const impactosState = (flattened.impactos ?? []).map((impactoDto, impactoIndex) => {
    const impactoId = normalizeId(
      impactoDto.impacto?.identificador ?? impactoDto.impacto?.id,
      `impacto-${eventIndex}-${impactoIndex}`,
    )

    return {
      id: impactoId,
      description: normalizeDescription(
        impactoDto.impacto?.descripcion,
        (impactoDto.impacto as { titulo?: string })?.titulo,
        `Impacto ${impactoId}`,
      ),
    }
  })

  const accionesState = (flattened.acciones ?? []).map((accionDto, accionIndex) => {
    const accionId = normalizeId(
      accionDto.accion?.identificador ?? accionDto.accion?.id,
      `accion-${eventIndex}-${accionIndex}`,
    )

    return {
      id: accionId,
      description: normalizeDescription(
        accionDto.accion?.descripcion,
        (accionDto.accion as { titulo?: string })?.titulo,
        `Acción ${accionId}`,
      ),
      relatedImpactos: normalizeIds(accionDto.impactoIds ?? accionDto.impactos),
    }
  })

  const resultadosState = (flattened.resultados ?? []).map((resultadoDto, resultadoIndex) => {
    const resultadoId = normalizeId(
      resultadoDto.resultado?.identificador ?? resultadoDto.resultado?.id,
      `resultado-${eventIndex}-${resultadoIndex}`,
    )

    return {
      id: resultadoId,
      description: normalizeDescription(
        resultadoDto.resultado?.descripcion,
        (resultadoDto.resultado as { titulo?: string })?.titulo,
        `Resultado ${resultadoId}`,
      ),
      relatedAcciones: normalizeIds(resultadoDto.accionIds ?? resultadoDto.acciones),
    }
  })

  const leccionesState = (flattened.lecciones ?? []).map((leccionDto, leccionIndex) => {
    const leccionId = normalizeId(
      (leccionDto.leccion as { identificador?: string | number })?.identificador ?? leccionDto.leccion?.id,
      `leccion-${eventIndex}-${leccionIndex}`,
    )

    return {
      id: leccionId,
      description: normalizeDescription(
        leccionDto.leccion?.descripcion,
        (leccionDto.leccion as { titulo?: string })?.titulo,
        `Lección ${leccionId}`,
      ),
      relatedResultados: normalizeIds(leccionDto.resultadoIds ?? leccionDto.resultados),
    }
  })

  return {
    id: String(eventoDto.evento?.id ?? `evento-${eventIndex}`),
    evento:
      eventoDto.evento?.descripcion ?? eventoDto.evento?.titulo ?? `Evento ${eventIndex + 1}` ?? "",
    impactos: impactosState.length > 0 ? impactosState : [{ id: `${eventIndex}-impacto-1`, description: "" }],
    accionesImplementadas: accionesState,
    resultados: resultadosState,
    leccionesAprendidas: leccionesState,
  }
}

export function LessonForm({ onClose, onSaved, initialData, loggedUser }: LessonFormProps) {
  const [formData, setFormData] = useState<FormDataState>({
    autorNombre: loggedUser.name,
    autorCorreo: loggedUser.email,
    estado: "Borrador",
    fecha: "",
    proceso: "",
    compania: "",
    sede: "",
    responsable: loggedUser.name,
    responsableCorreo: loggedUser.email,
    proyectoOSituacion: "",
    aplicacionPractica: "",
  })

  const [nivelAcceso, setNivelAcceso] = useState<"Público" | "Privado">(() =>
    normalizeAccessLevel(initialData?.proyecto?.isPrivate),
  )

  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const [procesos, setProcesos] = useState<SelectOption[]>([])
  const [companias, setCompanias] = useState<SelectOption[]>([])
  const [allSedes, setAllSedes] = useState<SedeOption[]>([])
  const [sedes, setSedes] = useState<SedeOption[]>([])
  const [estados, setEstados] = useState<RemoteEntity[]>([])
  const [availableUsers, setAvailableUsers] = useState<DirectoryUser[]>([])
  const [responsableQuery, setResponsableQuery] = useState("")
  const [responsableSuggestions, setResponsableSuggestions] = useState<DirectoryUser[]>([])
  const [isLoadingResponsables, setIsLoadingResponsables] = useState(false)
  const [lectorQuery, setLectorQuery] = useState("")
  const [lectorSuggestions, setLectorSuggestions] = useState<DirectoryUser[]>([])
  const [isLoadingLectores, setIsLoadingLectores] = useState(false)
  const [showResponsableDropdown, setShowResponsableDropdown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = useMemo(() => Boolean(initialData?.proyecto?.id), [initialData])
  const isEditable = useMemo(() => canEditLesson(initialData ?? null, loggedUser), [initialData, loggedUser])
  const [editBlockedReason, setEditBlockedReason] = useState<string | null>(null)
  const [initialSelectionNames, setInitialSelectionNames] = useState({
    compania: "",
    sede: "",
    proceso: "",
  })

  useEffect(() => {
    const controller = new AbortController()

    fetchEntities("Proceso", setProcesos, controller.signal)
    fetchEntities("Compania", setCompanias, controller.signal)
    fetchSedes(setAllSedes, controller.signal)

    const fetchEstados = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/Estado`, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Error al cargar estados: ${response.status}`)
        }
        const payload = await response.json()
        setEstados(normalizePayload(payload))
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
    if (allSedes.length === 0) return

    if (!formData.compania) {
      setSedes(allSedes)
      if (formData.sede && !allSedes.some((sede) => sede.id === formData.sede)) {
        setFormData((prev) => ({ ...prev, sede: "" }))
      }
      return
    }

    const filtered = allSedes.filter((sede) => sede.companiaId === formData.compania)
    setSedes(filtered)
    if (formData.sede && !filtered.some((sede) => sede.id === formData.sede)) {
      setFormData((prev) => ({ ...prev, sede: "" }))
    }
  }, [formData.compania, formData.sede, allSedes])

  useEffect(() => {
    if (!responsableQuery.trim()) {
      setResponsableSuggestions([])
      return
    }

    const controller = new AbortController()
    const handler = setTimeout(async () => {
      setIsLoadingResponsables(true)
      try {
        const params = new URLSearchParams({ query: responsableQuery })
        const response = await fetch(`${API_BASE_URL}/DirectorioActivo/suggestions?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error("No fue posible obtener responsables")
        }
        const payload = await response.json()
        const normalized = normalizeUserSuggestions(payload)
        setResponsableSuggestions(normalized)
        setAvailableUsers((prev) => {
          const registry = new Map(prev.map((user) => [user.id, user]))
          normalized.forEach((user) => registry.set(user.id, user))
          return Array.from(registry.values())
        })
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error(error)
        }
      } finally {
        setIsLoadingResponsables(false)
      }
    }, 400)

    return () => {
      clearTimeout(handler)
      controller.abort()
    }
  }, [responsableQuery])

  useEffect(() => {
    if (!lectorQuery.trim()) {
      setLectorSuggestions([])
      return
    }

    const controller = new AbortController()
    const handler = setTimeout(async () => {
      setIsLoadingLectores(true)
      try {
        const params = new URLSearchParams({ query: lectorQuery })
        const response = await fetch(`${API_BASE_URL}/DirectorioActivo/suggestions?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error("No fue posible obtener lectores")
        }
        const payload = await response.json()
        const normalized = normalizeUserSuggestions(payload)
        setLectorSuggestions(normalized)
        setAvailableUsers((prev) => {
          const registry = new Map(prev.map((user) => [user.id, user]))
          normalized.forEach((user) => registry.set(user.id, user))
          return Array.from(registry.values())
        })
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error(error)
        }
      } finally {
        setIsLoadingLectores(false)
      }
    }, 400)

    return () => {
      clearTimeout(handler)
      controller.abort()
    }
  }, [lectorQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showUserDropdown) return
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showUserDropdown])

  useEffect(() => {
    if (initialData && !isEditable) {
      setEditBlockedReason(
        "Solo el autor con estado Borrador, el responsable cuando está en revisión o un administrador pueden editar este registro.",
      )
    } else {
      setEditBlockedReason(null)
    }
  }, [initialData, isEditable])

  useEffect(() => {
    if (!initialData) {
      setFormData({
        autorNombre: loggedUser.name,
        autorCorreo: loggedUser.email,
        estado: "Borrador",
        fecha: "",
        proceso: "",
        compania: "",
        sede: "",
        responsable: loggedUser.name,
        responsableCorreo: loggedUser.email,
        proyectoOSituacion: "",
        aplicacionPractica: "",
      })
      setNivelAcceso("Público")
      setSelectedUsers([])
      setEventos([])
      setResponsableQuery(loggedUser.name)
      setInitialSelectionNames({ compania: "", sede: "", proceso: "" })
      return
    }

    const proyecto = initialData.proyecto ?? {}
    const lectores = (initialData.lectores ?? []).map((lector, index) => ({
      id: lector.correoLector ?? `lector-${index}`,
      name: lector.nombreLector ?? lector.titulo ?? lector.correoLector ?? `Lector ${index + 1}`,
      email: lector.correoLector ?? undefined,
      title: lector.titulo ?? undefined,
    }))

    setInitialSelectionNames({
      compania:
        (proyecto.sede?.data as { compania?: { data?: { nombre?: string } } })?.compania?.data?.nombre ?? "",
      sede: proyecto.sede?.data?.nombre ?? "",
      proceso: proyecto.proceso?.data?.nombre ?? "",
    })

    setFormData({
      autorNombre: proyecto.nombreAutor ?? loggedUser.name,
      autorCorreo: proyecto.correoAutor ?? loggedUser.email,
      estado: extractEstadoFromProyecto(proyecto),
      fecha: proyecto.fecha ? proyecto.fecha.split("T")[0] : "",
      proceso: String((proyecto.proceso as { id?: string })?.id ?? proyecto.proceso?.data?.id ?? ""),
      compania: String(
        (proyecto.sede?.data as { compania?: { data?: { id?: string } } })?.compania?.data?.id ?? "",
      ),
      sede: String(proyecto.sede?.data?.id ?? (proyecto.sede as { id?: string })?.id ?? ""),
      responsable: proyecto.nombreResponsable ?? "",
      responsableCorreo: proyecto.correoResponsable ?? "",
      proyectoOSituacion: proyecto.descripcion ?? "",
      aplicacionPractica: proyecto.aplicacionPractica ?? "",
    })

    setResponsableQuery(proyecto.nombreResponsable ?? "")
    setNivelAcceso(normalizeAccessLevel(proyecto.isPrivate))
    setAvailableUsers((prev) => mergeUsers(prev, lectores))
    setSelectedUsers(lectores.map((lector) => lector.id))
    setEventos((initialData.eventos ?? []).map(mapEventoDtoToState))
  }, [initialData, loggedUser])

  useEffect(() => {
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim()

    if (!formData.compania && initialSelectionNames.compania && companias.length > 0) {
      const matchedCompania = companias.find(
        (compania) => normalize(compania.nombre) === normalize(initialSelectionNames.compania),
      )
      if (matchedCompania) {
        setFormData((prev) => ({ ...prev, compania: matchedCompania.id }))
      }
    }

    if (!formData.proceso && initialSelectionNames.proceso && procesos.length > 0) {
      const matchedProceso = procesos.find(
        (proceso) => normalize(proceso.nombre) === normalize(initialSelectionNames.proceso),
      )
      if (matchedProceso) {
        setFormData((prev) => ({ ...prev, proceso: matchedProceso.id }))
      }
    }

    if (!formData.sede && initialSelectionNames.sede && allSedes.length > 0) {
      const matchedSede = allSedes.find((sede) => normalize(sede.nombre) === normalize(initialSelectionNames.sede))
      if (matchedSede) {
        setFormData((prev) => ({ ...prev, sede: matchedSede.id, compania: prev.compania || matchedSede.companiaId || "" }))
      }
    }
  }, [allSedes, companias, formData.compania, formData.proceso, formData.sede, initialSelectionNames, procesos])

  const [eventos, setEventos] = useState<Event[]>([])
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)

  const [currentEvent, setCurrentEvent] = useState({
    evento: "",
  })
  const [currentImpactos, setCurrentImpactos] = useState<{ id: string; description: string }[]>([
    { id: "1", description: "" },
  ])
  const [currentAccionesImplementadas, setCurrentAccionesImplementadas] = useState<
    { id: string; description: string; relatedImpactos: string[] }[]
  >([{ id: "1", description: "", relatedImpactos: [] }])
  const [currentResultados, setCurrentResultados] = useState<
    { id: string; description: string; relatedAcciones: string[] }[]
  >([{ id: "1", description: "", relatedAcciones: [] }])
  const [currentLeccionesAprendidas, setCurrentLeccionesAprendidas] = useState<
    { id: string; description: string; relatedResultados: string[] }[]
  >([{ id: "1", description: "", relatedResultados: [] }])

  const toggleUser = (user: DirectoryUser) => {
    setAvailableUsers((prev) => {
      const registry = new Map(prev.map((item) => [item.id, item]))
      registry.set(user.id, user)
      return Array.from(registry.values())
    })
    setSelectedUsers((prev) => (prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id]))
  }

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((id) => id !== userId))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newAttachments: Attachment[] = Array.from(files).map((file) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + " MB",
        type: file.type || "application/octet-stream",
      }))
      setAttachments((prev) => [...prev, ...newAttachments])
    }
    e.target.value = ""
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id))
  }

  const addRow = (setter: React.Dispatch<React.SetStateAction<{ id: string; description: string }[]>>) => {
    setter((prev) => [...prev, { id: Date.now().toString(), description: "" }])
  }

  const removeRow = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<{ id: string; description: string }[]>>,
  ) => {
    setter((prev) => prev.filter((row) => row.id !== id))
  }

  const notifyBlockedRemoval = (message: string) =>
    toast({
      title: "No se puede eliminar",
      description: message,
      variant: "destructive",
    })

  const handleRemoveImpacto = (id: string) => {
    const hasRelations = currentAccionesImplementadas.some((accion) => accion.relatedImpactos.includes(id))
    if (hasRelations) {
      notifyBlockedRemoval("Este impacto tiene acciones relacionadas. Elimina las relaciones antes de borrarlo.")
      return
    }
    removeRow(id, setCurrentImpactos)
  }

  const handleRemoveAccion = (id: string) => {
    const hasRelations = currentResultados.some((resultado) => resultado.relatedAcciones.includes(id))
    if (hasRelations) {
      notifyBlockedRemoval("Esta acción tiene resultados relacionados. Elimina las relaciones antes de borrarla.")
      return
    }
    removeRow(id, setCurrentAccionesImplementadas)
  }

  const handleRemoveResultado = (id: string) => {
    const hasRelations = currentLeccionesAprendidas.some((leccion) => leccion.relatedResultados.includes(id))
    if (hasRelations) {
      notifyBlockedRemoval("Este resultado tiene lecciones relacionadas. Elimina las relaciones antes de borrarlo.")
      return
    }
    removeRow(id, setCurrentResultados)
  }

  const updateRow = (
    id: string,
    description: string,
    setter: React.Dispatch<React.SetStateAction<{ id: string; description: string }[]>>,
  ) => {
    setter((prev) => prev.map((row) => (row.id === id ? { ...row, description } : row)))
  }

  const openAddEventDialog = () => {
    if (!isEditable) return
    setEditingEventId(null)
    setCurrentEvent({ evento: "" })
    setCurrentImpactos([{ id: "1", description: "" }])
    setCurrentAccionesImplementadas([{ id: "1", description: "", relatedImpactos: [] }])
    setCurrentResultados([{ id: "1", description: "", relatedAcciones: [] }])
    setCurrentLeccionesAprendidas([{ id: "1", description: "", relatedResultados: [] }])
    setShowEventDialog(true)
  }

  const openEditEventDialog = (event: Event) => {
    if (!isEditable) return
    setEditingEventId(event.id)
    setCurrentEvent({ evento: event.evento })
    setCurrentImpactos(event.impactos)
    setCurrentAccionesImplementadas(event.accionesImplementadas)
    setCurrentResultados(event.resultados)
    setCurrentLeccionesAprendidas(event.leccionesAprendidas)
    setShowEventDialog(true)
  }

  const saveEvent = () => {
    const impactos = currentImpactos.filter((row) => row.description.trim())
    const acciones = currentAccionesImplementadas
      .filter((row) => row.description.trim())
      .map((accion) => ({
        ...accion,
        relatedImpactos: accion.relatedImpactos.filter((id) => impactos.some((impacto) => impacto.id === id)),
      }))

    const resultados = currentResultados
      .filter((row) => row.description.trim())
      .map((resultado) => ({
        ...resultado,
        relatedAcciones: resultado.relatedAcciones.filter((id) => acciones.some((accion) => accion.id === id)),
      }))

    const lecciones = currentLeccionesAprendidas
      .filter((row) => row.description.trim())
      .map((leccion) => ({
        ...leccion,
        relatedResultados: leccion.relatedResultados.filter((id) => resultados.some((resultado) => resultado.id === id)),
      }))

    if (!impactos.length || !acciones.length || !resultados.length || !lecciones.length) {
      toast({
        title: "Faltan elementos obligatorios",
        description: "Agrega al menos un impacto, una acción, un resultado y una lección para guardar el evento.",
        variant: "destructive",
      })
      return
    }

    const accionesSinImpacto = acciones.some((accion) => accion.relatedImpactos.length === 0)
    const resultadosSinAccion = resultados.some((resultado) => resultado.relatedAcciones.length === 0)
    const leccionesSinResultado = lecciones.some((leccion) => leccion.relatedResultados.length === 0)

    if (accionesSinImpacto || resultadosSinAccion || leccionesSinResultado) {
      toast({
        title: "Relaciones incompletas",
        description:
          "Cada acción, resultado y lección debe estar relacionado con al menos un elemento de la columna anterior.",
        variant: "destructive",
      })
      return
    }

    const eventData: Event = {
      id: editingEventId || Date.now().toString(),
      evento: currentEvent.evento,
      impactos,
      accionesImplementadas: acciones,
      resultados,
      leccionesAprendidas: lecciones,
    }

    if (editingEventId) {
      setEventos((prev) => prev.map((e) => (e.id === editingEventId ? eventData : e)))
    } else {
      setEventos((prev) => [...prev, eventData])
    }

    setShowEventDialog(false)
  }

  const deleteEvent = (id: string) => {
    setEventos((prev) => prev.filter((e) => e.id !== id))
  }

  const addRowWithRelations = (setter: React.Dispatch<React.SetStateAction<any[]>>, relationKey: string) => {
    setter((prev) => [...prev, { id: Date.now().toString(), description: "", [relationKey]: [] }])
  }

  const updateRowWithRelations = (
    id: string,
    field: string,
    value: any,
    setter: React.Dispatch<React.SetStateAction<any[]>>,
  ) => {
    setter((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const toggleRelation = (
    rowId: string,
    relationId: string,
    relationKey: string,
    setter: React.Dispatch<React.SetStateAction<any[]>>,
  ) => {
    setter((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const relations = row[relationKey] || []
          return {
            ...row,
            [relationKey]: relations.includes(relationId)
              ? relations.filter((id: string) => id !== relationId)
              : [...relations, relationId],
          }
        }
        return row
      }),
    )
  }

  const renderTableWithRelations = (
    title: string,
    data: any[],
    setter: React.Dispatch<React.SetStateAction<any[]>>,
    placeholder: string,
    color: string,
    relationOptions?: { id: string; description: string }[],
    relationKey?: string,
    relationLabel?: string,
    onRemoveRow?: (id: string) => void,
  ) => (
    <div className="space-y-4">
      <div className={`border-l-4 border-${color}-500 pl-4`}>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>
      <div className="space-y-3">
        {data.map((row, index) => (
          <div key={row.id} className="space-y-2">
            <div className="flex gap-3 items-start">
              <div className="flex items-center justify-center min-w-[24px] h-9 text-sm font-semibold text-slate-600 bg-slate-100 rounded px-2">
                {index + 1}
              </div>
              <div className="flex-1">
                <Textarea
                  value={row.description}
                  onChange={(e) => updateRowWithRelations(row.id, "description", e.target.value, setter)}
                  placeholder={`${placeholder} ${index + 1}`}
                  rows={2}
                  className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
                />
              </div>
              {data.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => (onRemoveRow ? onRemoveRow(row.id) : removeRow(row.id, setter))}
                  className="mt-1 text-red-600 hover:text-red-700 hover:bg-red-50 h-5 w-5"
                >
                  <Trash2 className="h-1.5 w-1.5" />
                </Button>
              )}
            </div>

            {relationOptions && relationKey && relationLabel && (
              <div className="ml-2 space-y-2 border-l-2 border-slate-200 pl-4">
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">{relationLabel}</Label>
                <div className="flex flex-wrap gap-2">
                  {relationOptions
                    .filter((opt) => opt.description.trim())
                    .map((option) => {
                      const originalIndex = relationOptions.findIndex((o) => o.id === option.id)
                      const isSelected = row[relationKey]?.includes(option.id)

                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`group flex items-center gap-2 rounded-full border px-3 py-2 text-left text-xs transition ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-[0_0_0_1px] shadow-emerald-100"
                              : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50"
                          }`}
                          onClick={() => toggleRelation(row.id, option.id, relationKey, setter)}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700 transition group-hover:bg-emerald-100 group-hover:text-emerald-800">
                            {originalIndex + 1}
                          </span>
                          <span className="whitespace-normal text-left leading-snug">{option.description}</span>
                          {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                        </button>
                      )
                    })}
                  {relationOptions.filter((opt) => opt.description.trim()).length === 0 && (
                    <span className="text-xs italic text-slate-400">Agregue {relationLabel.toLowerCase()} primero</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => (relationKey ? addRowWithRelations(setter, relationKey) : addRow(setter))}
          className="gap-2 border-[#8fd0ab] text-[#067138] hover:bg-[#e0f3e8]"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>
    </div>
  )

  const renderTable = (
    title: string,
    data: { id: string; description: string }[],
    setter: React.Dispatch<React.SetStateAction<{ id: string; description: string }[]>>,
    placeholder: string,
    color: string,
    onRemoveRow?: (id: string) => void,
  ) => (
    <div className="space-y-4">
      <div className={`border-l-4 border-${color}-500 pl-4`}>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>
      <div className="space-y-3">
        {data.map((row, index) => (
          <div key={row.id} className="flex gap-3 items-start">
            <div className="flex items-center justify-center min-w-[24px] h-9 text-sm font-semibold text-slate-600 bg-slate-100 rounded px-2">
              {index + 1}
            </div>
            <div className="flex-1">
              <Textarea
                value={row.description}
                onChange={(e) => updateRow(row.id, e.target.value, setter)}
                placeholder={`${placeholder} ${index + 1}`}
                rows={2}
                className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
              />
            </div>
            {data.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => (onRemoveRow ? onRemoveRow(row.id) : removeRow(row.id, setter))}
                className="mt-1 text-red-600 hover:text-red-700 hover:bg-red-50 h-5 w-5"
              >
                <Trash2 className="h-1.5 w-1.5" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => addRow(setter)}
          className="gap-2 border-[#8fd0ab] text-[#067138] hover:bg-[#e0f3e8]"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>
    </div>
  )

const mapEventToDto = (event: Event): ProyectoSituacionEventoDto => {
  const impactoIdMap = new Map<string, number>()
  const accionIdMap = new Map<string, number>()
  const resultadoIdMap = new Map<string, number>()

  event.impactos.forEach((impacto, index) => {
    impactoIdMap.set(impacto.id, index + 1)
  })

  event.accionesImplementadas.forEach((accion, index) => {
    accionIdMap.set(accion.id, index + 1)
  })

  event.resultados.forEach((resultado, index) => {
    resultadoIdMap.set(resultado.id, index + 1)
  })

  const impactosDto = event.impactos.map((impacto, impactoIndex) => ({
    impacto: {
      titulo: impacto.description,
      descripcion: impacto.description,
      identificador: impactoIdMap.get(impacto.id) ?? impactoIndex + 1,
    },
  }))

  const accionesDto = event.accionesImplementadas.map((accion, accionIndex) => {
    const accionIdentificador = accionIdMap.get(accion.id) ?? accionIndex + 1

    const impactoIds =
      accion.relatedImpactos.length > 0
        ? accion.relatedImpactos.map((id, relationIndex) => {
            const mapped = impactoIdMap.get(id)
            if (mapped) return mapped

            const foundIndex = event.impactos.findIndex((impactoItem) => impactoItem.id === id)
            return foundIndex >= 0 ? foundIndex + 1 : relationIndex + 1
          })
        : [accionIndex + 1]

    return {
      accion: {
        titulo: accion.description,
        descripcion: accion.description,
        identificador: accionIdentificador,
      },
      impactos: impactoIds,
    }
  })

  const resultadosDto = event.resultados.map((resultado, resultadoIndex) => {
    const resultadoIdentificador = resultadoIdMap.get(resultado.id) ?? resultadoIndex + 1

    const accionIds =
      resultado.relatedAcciones.length > 0
        ? resultado.relatedAcciones.map((id, relationIndex) => {
            const mapped = accionIdMap.get(id)
            if (mapped) return mapped

            const foundIndex = event.accionesImplementadas.findIndex((accion) => accion.id === id)
            return foundIndex >= 0 ? foundIndex + 1 : relationIndex + 1
          })
        : [resultadoIndex + 1]

    return {
      resultado: {
        titulo: resultado.description,
        descripcion: resultado.description,
        identificador: resultadoIdentificador,
      },
      acciones: accionIds,
    }
  })

  const leccionesDto = event.leccionesAprendidas.map((leccion, leccionIndex) => {
    const resultadoIds =
      leccion.relatedResultados.length > 0
        ? leccion.relatedResultados.map((id, relationIndex) => {
            const mapped = resultadoIdMap.get(id)
            if (mapped) return mapped

            const foundIndex = event.resultados.findIndex((resultado) => resultado.id === id)
            return foundIndex >= 0 ? foundIndex + 1 : relationIndex + 1
          })
        : [leccionIndex + 1]

    return {
      leccion: {
        titulo: leccion.description,
        descripcion: leccion.description,
      },
      resultados: resultadoIds,
    }
  })

  return {
    evento: {
      titulo: event.evento,
      descripcion: event.evento,
    },
    impactos: impactosDto,
    acciones: accionesDto,
    resultados: resultadosDto,
    lecciones: leccionesDto,
  }
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditable) {
      toast({
        title: "Edición no permitida",
        description:
          editBlockedReason ??
          "Solo el autor en borrador, el responsable en revisión o un administrador pueden modificar esta información.",
        variant: "destructive",
      })
      return
    }
    if (!formData.compania || !formData.sede || !formData.proceso || !formData.fecha) {
      toast({
        title: "Campos obligatorios",
        description: "Completa compañía, sede, proceso y fecha antes de guardar.",
        variant: "destructive",
      })
      return
    }

    if (nivelAcceso === "Privado" && selectedUsers.length === 0) {
      toast({
        title: "Lectores requeridos",
        description: "Agrega al menos un lector para un nivel de acceso privado.",
        variant: "destructive",
      })
      return
    }

    const fechaIso = formData.fecha ? new Date(formData.fecha).toISOString() : new Date().toISOString()
    const selectedSede = allSedes.find((sede) => sede.id === formData.sede)
    const selectedProceso = procesos.find((proceso) => proceso.id === formData.proceso)
    const selectedLectores = availableUsers.filter((user) => selectedUsers.includes(user.id))

    const desiredEstadoDescripcion = isEditing ? formData.estado : "Borrador"
    const estadoCoincidente = estados.find(
      (estado) => normalizeStatus(getEstadoDescripcionFromEntity(estado)) === normalizeStatus(desiredEstadoDescripcion),
    )

    const estadoIdCandidate =
      estadoCoincidente?.id ?? estadoCoincidente?.Id ?? estadoCoincidente?.codigo ?? estadoCoincidente?.Codigo
    const estadoId = Number(estadoIdCandidate)
    const estadoDescripcion = estadoCoincidente
      ? getEstadoDescripcionFromEntity(estadoCoincidente)
      : desiredEstadoDescripcion || "Borrador"

    const sedeId = Number(formData.sede)
    const procesoId = Number(formData.proceso)

    if (!isEditing && (!estadoCoincidente || !Number.isFinite(estadoId))) {
      toast({
        title: "No se pudo guardar",
        description: "No se encontró el estado 'Borrador'. Inténtalo nuevamente más tarde.",
        variant: "destructive",
      })
      return
    }

    const payload = {
      proyecto: {
        id: initialData?.proyecto?.id,
        titulo: formData.proyectoOSituacion,
        fecha: fechaIso,
        descripcion: formData.proyectoOSituacion,
        aplicacionPractica: formData.aplicacionPractica,
        correoAutor: formData.autorCorreo || loggedUser.email,
        nombreAutor: formData.autorNombre || loggedUser.name,
        correoResponsable: formData.responsableCorreo || formData.responsable,
        nombreResponsable: formData.responsable || formData.responsableCorreo || formData.autorNombre,
        estado: {
          id: Number.isFinite(estadoId) ? estadoId : undefined,
          value: estadoDescripcion,
          data: estadoDescripcion,
        },
        sede: {
          id: Number.isFinite(sedeId) ? sedeId : formData.sede,
          value: selectedSede?.nombre ?? formData.sede,
          data: selectedSede?.nombre ?? formData.sede,
        },
        proceso: {
          id: Number.isFinite(procesoId) ? procesoId : formData.proceso,
          value: selectedProceso?.nombre ?? formData.proceso,
          data: selectedProceso?.nombre ?? formData.proceso,
        },
        isPrivate: nivelAcceso === "Privado",
      },
      lectores:
        nivelAcceso === "Privado"
          ? selectedLectores.map((lector) => ({
              titulo: lector.title ?? lector.name,
              correoLector: lector.email ?? "",
              nombreLector: lector.name,
            }))
          : [],
      eventos: eventos.map(mapEventToDto),
    }

    setIsSubmitting(true)
    try {
      const endpointUrl =
        isEditing && initialData?.proyecto?.id
          ? `${API_BASE_URL}/ProyectoSituacion/complete/${initialData.proyecto.id}`
          : `${API_BASE_URL}/ProyectoSituacion/complete`

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (loggedUser?.email) {
        headers.correousuario = loggedUser.email
      }

      const response = await fetch(endpointUrl, {
        method: isEditing ? "PUT" : "POST",
        headers,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("No fue posible guardar la información")
      }

      toast({
        title: isEditing ? "Proyecto actualizado" : "Proyecto guardado",
        description: "El proyecto o situación se guardó correctamente.",
        className: "bg-emerald-50 border-emerald-200 text-emerald-900",
      })
      onSaved()
    } catch (error) {
      console.error(error)
      toast({
        title: "No se pudo guardar",
        description: "Ocurrió un error al guardar el proyecto o situación.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedUserObjects = availableUsers.filter((user) => selectedUsers.includes(user.id))
  const autorDisplay = [formData.autorNombre, formData.autorCorreo].filter(Boolean).join(" - ")

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-[90%] max-h-[90vh] overflow-y-auto border border-emerald-100 bg-white shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between rounded-t-lg bg-gradient-to-r from-[#067138] via-[#0fa958] to-[#45a06c] text-white">
          <div>
            <CardTitle className="text-xl text-white">Proyecto o Situación</CardTitle>
            <CardDescription className="text-emerald-100">
              Eventos y lecciones aprendidas de un proyecto o situación
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <div className="flex flex-col gap-2 border-b border-emerald-100 bg-[#f4fff9] px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-medium text-slate-700">Acciones de Flujo de Trabajo</div>
          <div className="text-xs text-slate-500">
            Las acciones de revisión se habilitarán después de crear el borrador.
          </div>
        </div>

        {!isEditable && editBlockedReason && (
          <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {editBlockedReason}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <fieldset disabled={isSubmitting || !isEditable} className="border-0 p-0 m-0">
            <CardContent className="space-y-8 p-8">
              {/* ENCABEZADO - Información General hasta Anexos */}
              <div className="space-y-6">
              <div className="border-l-4 border-[#067138] pl-4">
                <h3 className="text-xl font-bold text-slate-900">Información General</h3>
                <p className="text-sm text-slate-600">Datos básicos del evento o situación</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="autor" className="text-sm font-semibold text-slate-700">
                    Autor
                  </Label>
                  <Input
                    id="autor"
                    value={autorDisplay}
                    readOnly
                    placeholder="Se asignará automáticamente"
                    className="border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="estado" className="text-sm font-semibold text-slate-700">
                    Estado
                  </Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    readOnly
                    className="border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="fecha" className="text-sm font-semibold text-slate-700">
                    Fecha *
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="proceso" className="text-sm font-semibold text-slate-700">
                    Proceso *
                  </Label>
                  <Select
                    value={formData.proceso}
                    onValueChange={(value) => setFormData({ ...formData, proceso: value })}
                  >
                    <SelectTrigger className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30">
                      <SelectValue placeholder="Seleccionar proceso" />
                    </SelectTrigger>
                    <SelectContent>
                      {procesos.length > 0 ? (
                        procesos.map((proceso) => (
                          <SelectItem key={proceso.id} value={proceso.id}>
                            {proceso.nombre}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="sin-procesos" disabled>
                          No hay procesos disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="compania" className="text-sm font-semibold text-slate-700">
                    Compañía *
                  </Label>
                  <Select
                    value={formData.compania}
                    onValueChange={(value) => setFormData({ ...formData, compania: value })}
                  >
                    <SelectTrigger className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30">
                      <SelectValue placeholder="Seleccionar compañía" />
                    </SelectTrigger>
                    <SelectContent>
                      {companias.length > 0 ? (
                        companias.map((compania) => (
                          <SelectItem key={compania.id} value={compania.id}>
                            {compania.nombre}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="sin-companias" disabled>
                          No hay compañías disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="sede" className="text-sm font-semibold text-slate-700">
                    Sede *
                  </Label>
                  <Select
                    value={formData.sede}
                    onValueChange={(value) => setFormData({ ...formData, sede: value })}
                    disabled={!formData.compania}
                  >
                    <SelectTrigger className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30">
                      <SelectValue placeholder="Seleccionar sede" />
                    </SelectTrigger>
                    <SelectContent>
                      {sedes.map((sede) => (
                        <SelectItem key={sede.id} value={sede.id}>
                          {sede.nombre}
                        </SelectItem>
                      ))}
                      {formData.compania && sedes.length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-500">No hay sedes para la compañía seleccionada.</div>
                      )}
                      {!formData.compania && sedes.length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-500">Selecciona una compañía primero.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="responsable" className="text-sm font-semibold text-slate-700">
                    Responsable *
                  </Label>
                  <div className="relative">
                    <Input
                      value={responsableQuery || formData.responsable}
                      onFocus={() => setShowResponsableDropdown(true)}
                      onBlur={() => setTimeout(() => setShowResponsableDropdown(false), 150)}
                      onChange={(e) => {
                        setResponsableQuery(e.target.value)
                        setFormData({ ...formData, responsable: e.target.value, responsableCorreo: "" })
                      }}
                      placeholder="Buscar responsable"
                      className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
                      required
                    />
                    {showResponsableDropdown && (responsableQuery || responsableSuggestions.length > 0) && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                        {isLoadingResponsables && (
                          <div className="px-3 py-2 text-sm text-slate-500">Buscando responsables...</div>
                        )}
                        {!isLoadingResponsables && responsableSuggestions.length === 0 && responsableQuery && (
                          <div className="px-3 py-2 text-sm text-slate-500">No se encontraron resultados.</div>
                        )}
                        {responsableSuggestions.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            className="flex w-full flex-col items-start gap-1 px-3 py-2 text-left hover:bg-slate-50"
                            onMouseDown={() => {
                              setFormData({
                                ...formData,
                                responsable: user.name,
                                responsableCorreo: user.email ?? "",
                              })
                              setResponsableQuery(user.name)
                              setShowResponsableDropdown(false)
                            }}
                          >
                            <span className="font-medium text-slate-900">{user.name}</span>
                            {(user.email || user.title) && (
                              <span className="text-xs text-slate-500">{user.email ?? user.title}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="proyectoOSituacion" className="text-sm font-semibold text-slate-700">
                    Proyecto o situación *
                  </Label>
                  <Textarea
                    id="proyectoOSituacion"
                    value={formData.proyectoOSituacion}
                    onChange={(e) => setFormData({ ...formData, proyectoOSituacion: e.target.value })}
                    placeholder="Descripción detallada del proyecto o situación"
                    rows={3}
                    className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="aplicacionPractica" className="text-sm font-semibold text-slate-700">
                    Aplicación Práctica *
                  </Label>
                  <Textarea
                    id="aplicacionPractica"
                    value={formData.aplicacionPractica}
                    onChange={(e) => setFormData({ ...formData, aplicacionPractica: e.target.value })}
                    placeholder="¿Cómo y donde puede usarse lo aprendido?"
                    rows={3}
                    className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
                    required
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label htmlFor="nivelAcceso" className="text-sm font-semibold text-slate-700">
                    Nivel de Acceso *
                  </Label>
                  <Select value={nivelAcceso} onValueChange={(value: "Público" | "Privado") => setNivelAcceso(value)}>
                    <SelectTrigger className="border-slate-200 focus:border-[#067138]">
                      <SelectValue placeholder="Seleccionar nivel de acceso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Público">Público</SelectItem>
                      <SelectItem value="Privado">Privado</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    {nivelAcceso === "Público"
                      ? "Esta lección será visible para todos los usuarios"
                      : "Esta lección solo será visible para los lectores seleccionados"}
                  </p>
                </div>

                  {nivelAcceso === "Privado" && (
                    <div className="space-y-3 md:col-span-2" ref={userDropdownRef}>
                      <Label className="text-sm font-semibold text-slate-700">Lectores *</Label>
                      <div className="space-y-3">
                        <div className="relative">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                            className="w-full justify-between border-slate-200 focus:border-[#067138]"
                          >
                            <span className="text-slate-600">
                              {selectedUsers.length === 0
                                ? "Seleccionar usuarios..."
                                : `${selectedUsers.length} usuario(s) seleccionado(s)`}
                            </span>
                            <Plus className="h-4 w-4" />
                          </Button>

                          {showUserDropdown && (
                            <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-72 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                              <div className="border-b border-slate-100 p-3">
                                <Input
                                  value={lectorQuery}
                                  onChange={(e) => setLectorQuery(e.target.value)}
                                  placeholder="Buscar lectores"
                                  className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
                                />
                              </div>
                              <div className="max-h-56 overflow-y-auto">
                                {isLoadingLectores && (
                                  <div className="px-3 py-2 text-sm text-slate-500">Cargando sugerencias...</div>
                                )}
                                {!isLoadingLectores && lectorQuery && lectorSuggestions.length === 0 && (
                                  <div className="px-3 py-2 text-sm text-slate-500">Sin resultados para la búsqueda.</div>
                                )}
                                {(!lectorQuery ? availableUsers : lectorSuggestions).map((user) => (
                                  <div
                                    key={user.id}
                                    className="flex cursor-pointer items-center gap-3 p-3 hover:bg-slate-50"
                                    onClick={() => toggleUser(user)}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedUsers.includes(user.id)}
                                      onChange={() => {}}
                                      className="rounded border-slate-300"
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium text-slate-900">{user.name}</div>
                                      {(user.email || user.title) && (
                                        <div className="text-sm text-slate-500">{user.email ?? user.title}</div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {!isLoadingLectores && !lectorQuery && availableUsers.length === 0 && (
                                  <div className="px-3 py-2 text-sm text-slate-500">
                                    Empieza a escribir para buscar usuarios.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                      {selectedUserObjects.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedUserObjects.map((user) => (
                            <Badge
                              key={user.id}
                              variant="secondary"
                              className="gap-1 rounded-full bg-[#e0f3e8] text-[#067138]"
                            >
                              {user.name}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeUser(user.id)}
                                className="h-4 w-4 p-0 text-[#067138] hover:bg-[#cbeed8]"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DETALLE - Eventos Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="text-xl font-bold text-slate-900">Eventos</h3>
                  <p className="text-sm text-slate-600">Gestione los eventos relacionados con esta lección</p>
                </div>
                <Button type="button" onClick={openAddEventDialog} className="gap-2 bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4" />
                  Agregar Evento
                </Button>
              </div>

              {eventos.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-semibold">Evento</TableHead>
                        <TableHead className="font-semibold text-center">Impactos</TableHead>
                        <TableHead className="font-semibold text-center">Acciones</TableHead>
                        <TableHead className="font-semibold text-center">Resultados</TableHead>
                        <TableHead className="font-semibold text-center">Lecciones</TableHead>
                        <TableHead className="font-semibold text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventos.map((evento) => (
                        <TableRow key={evento.id}>
                          <TableCell className="max-w-md">
                            <p className="line-clamp-2 text-sm">{evento.evento}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-red-50 text-red-700">
                              {evento.impactos.length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-green-50 text-green-700">
                              {evento.accionesImplementadas.length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">
                              {evento.resultados.length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                              {evento.leccionesAprendidas.length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditEventDialog(evento)}
                                className="text-[#067138] hover:bg-[#e0f3e8]"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteEvent(evento.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                  <p className="text-slate-500 mb-4">No hay eventos agregados aún</p>
                  <Button type="button" variant="outline" onClick={openAddEventDialog} className="gap-2 bg-transparent">
                    <Plus className="h-4 w-4" />
                    Agregar primer evento
                  </Button>
                </div>
              )}
            </div>

            {/* Anexos Section */}
            <div className="space-y-6">
              <div className="border-l-4 border-[#067138] pl-4">
                <h3 className="text-xl font-bold text-slate-900">Anexos</h3>
                <p className="text-sm text-slate-600">Adjunte documentos, imágenes o archivos relacionados</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    className="gap-2 border-green-200 text-green-700 hover:bg-green-50"
                  >
                    <Upload className="h-4 w-4" />
                    Subir archivos
                  </Button>
                  <span className="text-sm text-slate-500">
                    Formatos soportados: PDF, Word, Excel, PowerPoint, imágenes, texto
                  </span>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <FileText className="h-5 w-5 text-slate-500" />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{attachment.name}</div>
                          <div className="text-sm text-slate-500">{attachment.size}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(attachment.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </CardContent>
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-emerald-100 bg-[#f4fff9] p-6 text-right sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 bg-transparent hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isEditable}
              className="gap-2 rounded-full bg-[#067138] px-6 py-5 text-base font-semibold text-white shadow-lg shadow-emerald-200/60 hover:bg-[#05592d] disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditing ? "Actualizar" : "Guardar"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      <Dialog open={showEventDialog && isEditable} onOpenChange={(open) => !isSubmitting && isEditable && setShowEventDialog(open)}>
        <DialogContent
          className={`w-screen max-w-none p-0 m-0 rounded-none h-[90vh] overflow-y-auto min-w-full ${isSubmitting ? "pointer-events-none opacity-70" : ""}`}
        >
          <div className="space-y-6 px-6 pt-6 pb-4">
            <div className="space-y-3">
              <div className="border-l-4 border-[#067138] pl-4">
                <h3 className="text-lg font-bold text-slate-900">Evento (Qué ocurrió)</h3>
              </div>
              <Textarea
                id="evento-desc"
                value={currentEvent.evento}
                onChange={(e) => setCurrentEvent({ ...currentEvent, evento: e.target.value })}
                placeholder="Describa el evento relacionado con esta lección"
                rows={3}
                className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {renderTable(
                "Impactos (Cómo nos afectó)",
                currentImpactos,
                setCurrentImpactos,
                "Describa el impacto identificado",
                "red",
                handleRemoveImpacto,
              )}

              {renderTableWithRelations(
                "Acciones Implementadas (Cómo se abordó)",
                currentAccionesImplementadas,
                setCurrentAccionesImplementadas,
                "Describa la acción implementada",
                "green",
                currentImpactos,
                "relatedImpactos",
                "Relacionado con impactos:",
                handleRemoveAccion,
              )}

              {renderTableWithRelations(
                "Resultados (Efecto de las acciones)",
                currentResultados,
                setCurrentResultados,
                "Describa el resultado obtenido",
                "yellow",
                currentAccionesImplementadas,
                "relatedAcciones",
                "Relacionado con acciones:",
                handleRemoveResultado,
              )}

              {renderTableWithRelations(
                "Lecciones Aprendidas (Qué se aprendió)",
                currentLeccionesAprendidas,
                setCurrentLeccionesAprendidas,
                "Describa la lección aprendida",
                "purple",
                currentResultados,
                "relatedResultados",
                "Relacionado con resultados:",
              )}
            </div>
          </div>

          <DialogFooter className="p-6 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowEventDialog(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={saveEvent}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting || !currentEvent.evento.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              {editingEventId ? "Actualizar" : "Guardar"} Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
