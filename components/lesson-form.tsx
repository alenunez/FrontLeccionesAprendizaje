"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  X,
  Save,
  Plus,
  Trash2,
  Upload,
  FileText,
  Edit,
  Loader2,
  Check,
  Send,
  Globe2,
  Undo2,
  RefreshCcw,
  Download,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import type { ProyectoSituacionDto, ProyectoSituacionEventoDto } from "@/types/lessons"
import type { SimulatedUser } from "@/lib/user-context"
import { canEditLesson, getWorkflowActions, type WorkflowAction } from "@/lib/permissions"
import { flattenEventoDto } from "@/lib/event-normalizer"
import { useAuth } from "@/components/auth-provider"
import type { AuthSession } from "@/lib/auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const DEFAULT_TEXTAREA_MAX_LENGTH = 200
const APPLICACION_PRACTICA_MAX_LENGTH = 400
const EVENT_DESCRIPTION_MAX_LENGTH = 400
const EVENT_TABLE_TEXTAREA_MAX_LENGTH = 1000

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const createAuthHeaders = (session?: AuthSession | null): HeadersInit =>
  session?.accessToken ? { Authorization: `${session.tokenType ?? "Bearer"} ${session.accessToken}` } : {}

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
  file: File
}

const ATTACHMENT_NAME_MAX_LENGTH = 50

const getFileBaseName = (name: string) => {
  const lastDotIndex = name.lastIndexOf(".")
  if (lastDotIndex === -1) return name
  return name.slice(0, lastDotIndex)
}

const getFileExtension = (name: string) => {
  const lastDotIndex = name.lastIndexOf(".")
  if (lastDotIndex === -1) return ""
  return name.slice(lastDotIndex)
}

const sanitizeBaseFileName = (name: string) =>
  name
    .replace(/\.[^/.]+$/, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()

interface ProyectoAdjunto {
  id?: number
  idAdjunto?: number
  proyectoSituacionId?: number
  nombreArchivo?: string
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
  isGroup?: boolean
  members?: DirectoryUser[]
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

const renderCharLimitNotice = (value: string, maxLength = DEFAULT_TEXTAREA_MAX_LENGTH) =>
  value.length >= maxLength ? (
    <p className="mt-1 text-xs font-medium text-amber-600">
      Has alcanzado el límite de {maxLength} caracteres.
    </p>
  ) : null

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

const formatFileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`

const getEntityId = (entity?: RemoteEntity | null): string =>
  String(entity?.id ?? entity?.Id ?? (entity as { codigo?: string })?.codigo ?? (entity as { Codigo?: string })?.Codigo ?? "")

const getEntityName = (entity?: RemoteEntity | null): string =>
  String(
    entity?.nombre ??
      entity?.Nombre ??
      entity?.name ??
      (entity as { value?: string })?.value ??
      (entity as { Value?: string })?.Value ??
      "",
  )

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
  fetcher: Fetcher,
) => {
  try {
    const response = await fetcher(`${API_BASE_URL}/${endpoint}`, { signal })
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
  fetcher: Fetcher,
) => {
  try {
    const response = await fetcher(`${API_BASE_URL}/Sede`, { signal })
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

const mapDirectoryEntityToUser = (
  entity: RemoteEntity,
  index: number,
  options?: { isGroup?: boolean },
): DirectoryUser => {
  const identifier = entity.id ?? entity.Id ?? entity.userPrincipalName ?? entity.UserPrincipalName ?? entity.oid ?? index
  const displayName =
    entity.displayName ?? entity.DisplayName ?? entity.nombre ?? entity.Nombre ?? entity.name ?? "Sin nombre"
  const email = entity.mail ?? entity.email ?? entity.userPrincipalName ?? entity.UserPrincipalName
  const title = entity.jobTitle ?? entity.cargo ?? entity.title

  return {
    id: String(identifier),
    name: String(displayName),
    email: email ? String(email) : undefined,
    title: title ? String(title) : undefined,
    isGroup: options?.isGroup,
  }
}

const normalizeUserSuggestions = (payload: unknown): DirectoryUser[] => {
  if (payload && typeof payload === "object") {
    const recordPayload = payload as { users?: unknown; groups?: unknown }
    const hasCombined = Array.isArray(recordPayload.users) || Array.isArray(recordPayload.groups)

    if (hasCombined) {
      const normalizedUsers = normalizePayload(recordPayload.users).map((entity, index) =>
        mapDirectoryEntityToUser(entity, index),
      )

      const normalizedGroups = normalizePayload(recordPayload.groups).map((entity, index) => {
        const group = mapDirectoryEntityToUser(entity, index, { isGroup: true })
        const members = normalizePayload((entity as { members?: unknown }).members).map((member, memberIndex) =>
          mapDirectoryEntityToUser(member, memberIndex),
        )

        return { ...group, members }
      })

      return [...normalizedUsers, ...normalizedGroups]
    }
  }

  const entities = normalizePayload(payload)
  return entities.map((entity, index) => mapDirectoryEntityToUser(entity, index))
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
        record.id ??
        record.identificador ??
        record.impacto?.id ??
        record.impacto?.identificador ??
        record.accion?.id ??
        record.accion?.identificador ??
        record.resultado?.id ??
        record.resultado?.identificador ??
        record.leccion?.id ??
        record.leccion?.identificador ??
        null
      )
        ? String(
            record.id ??
              record.identificador ??
              record.impacto?.id ??
              record.impacto?.identificador ??
              record.accion?.id ??
              record.accion?.identificador ??
              record.resultado?.id ??
              record.resultado?.identificador ??
              record.leccion?.id ??
              record.leccion?.identificador,
          )
        : null
    }

    return null
  }

  const normalizeIds = (values?: unknown[]) =>
    Array.from(new Set((values ?? []).map(extractId).filter((value): value is string => Boolean(value))))

  const impactosState = (flattened.impactos ?? []).map((impactoDto, impactoIndex) => {
    const impactoId = normalizeId(
      impactoDto.impacto?.id ?? impactoDto.impacto?.identificador,
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
      accionDto.accion?.id ?? accionDto.accion?.identificador,
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
      resultadoDto.resultado?.id ?? resultadoDto.resultado?.identificador,
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
      leccionDto.leccion?.id ?? (leccionDto.leccion as { identificador?: string | number })?.identificador,
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
    responsable: "",
    responsableCorreo: "",
    proyectoOSituacion: "",
    aplicacionPractica: "",
  })

  const [nivelAcceso, setNivelAcceso] = useState<"Público" | "Privado">(() =>
    normalizeAccessLevel(initialData?.proyecto?.isPrivate),
  )
const [sedeInicialAplicada, setSedeInicialAplicada] = useState(false);

  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement | null>(null)
  const existingAttachmentInputRef = useRef<HTMLInputElement | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [existingAttachments, setExistingAttachments] = useState<ProyectoAdjunto[]>([])
  const [isLoadingExistingAttachments, setIsLoadingExistingAttachments] = useState(false)
  const [existingAttachmentsError, setExistingAttachmentsError] = useState<string | null>(null)
  const [downloadingExistingAttachmentId, setDownloadingExistingAttachmentId] = useState<
    number | string | null
  >(null)
  const [deletingExistingAttachmentId, setDeletingExistingAttachmentId] = useState<number | string | null>(null)
  const [isUploadingExistingAttachment, setIsUploadingExistingAttachment] = useState(false)
  const [pendingExistingAttachments, setPendingExistingAttachments] = useState<Attachment[]>([])
  const [savingPendingAttachmentId, setSavingPendingAttachmentId] = useState<string | null>(null)
  const [editingAttachmentNameId, setEditingAttachmentNameId] = useState<number | string | null>(null)
  const [attachmentNameDraft, setAttachmentNameDraft] = useState("")
  const [savingAttachmentNameId, setSavingAttachmentNameId] = useState<number | string | null>(null)
  const canRenameExistingAttachments = false
  const { session } = useAuth()
  const authHeaders = useMemo<HeadersInit>(() => createAuthHeaders(session), [session])
  const authorizedFetch = useCallback<Fetcher>(
    (input, init) => {
      const headers: HeadersInit = { ...authHeaders }
      if (init?.headers) {
        Object.assign(headers, init.headers as Record<string, string>)
      }
      return fetch(input, { ...init, headers })
    },
    [authHeaders],
  )

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
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const isEditing = useMemo(() => Boolean(initialData?.proyecto?.id), [initialData])
  const isEditable = useMemo(() => canEditLesson(initialData ?? null, loggedUser), [initialData, loggedUser])
  const [editBlockedReason, setEditBlockedReason] = useState<string | null>(null)
  const [initialSelectionNames, setInitialSelectionNames] = useState({
    compania: "",
    sede: "",
    proceso: "",
  })
  const hasAppliedInitialSelections = useRef(false)
  const workflowActionConfig: Record<WorkflowAction, { label: string; icon: React.ReactNode; targetEstado: string }> = {
    sendToReview: {
      label: "Enviar a revisión",
      icon: <Send className="h-4 w-4" />,
      targetEstado: "En Revisión",
    },
    publish: {
      label: "Publicar",
      icon: <Globe2 className="h-4 w-4" />,
      targetEstado: "Publicado",
    },
    returnToDraft: {
      label: "Devolver a borrador",
      icon: <Undo2 className="h-4 w-4" />,
      targetEstado: "Borrador",
    },
    returnToReview: {
      label: "Devolver a revisión",
      icon: <RefreshCcw className="h-4 w-4" />,
      targetEstado: "En Revisión",
    },
  }
  const workflowActions = useMemo(
    () => getWorkflowActions(initialData ?? null, loggedUser, { overrideEstado: formData.estado }),
    [formData.estado, initialData, loggedUser],
  )
  const visibleWorkflowActions = useMemo(
    () =>
      workflowActions.filter(
        (action) => normalizeStatus(workflowActionConfig[action].targetEstado) !== normalizeStatus(formData.estado),
      ),
    [formData.estado, workflowActions],
  )

  useEffect(() => {
    const controller = new AbortController()

    fetchEntities("Proceso", setProcesos, controller.signal, authorizedFetch)
    fetchEntities("Compania", setCompanias, controller.signal, authorizedFetch)
    fetchSedes(setAllSedes, controller.signal, authorizedFetch)

    const fetchEstados = async () => {
      try {
        const response = await authorizedFetch(`${API_BASE_URL}/Estado`, { signal: controller.signal })
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
  }, [authorizedFetch])

  useEffect(() => {
    if (allSedes.length === 0) {
      if (formData.sede) {
        setSedes([
          {
            id: formData.sede,
            nombre: initialSelectionNames.sede || `Sede ${formData.sede}`,
            companiaId: formData.compania || undefined,
          },
        ])
      }
      return
    }

    const selectedSede = allSedes.find((sede) => sede.id === formData.sede)

    let filtered = formData.compania
      ? allSedes.filter((sede) => sede.companiaId === formData.compania || sede.id === formData.sede)
      : allSedes

    if (formData.sede && !filtered.some((sede) => sede.id === formData.sede)) {
      const fallbackNombre = selectedSede?.nombre || initialSelectionNames.sede || `Sede ${formData.sede}`
      const fallbackCompaniaId = selectedSede?.companiaId || formData.compania || undefined

      filtered = [
        ...filtered,
        {
          id: formData.sede,
          nombre: fallbackNombre,
          companiaId: fallbackCompaniaId,
        },
      ]
    }

    setSedes(filtered)
  }, [formData.compania, formData.sede, allSedes, initialSelectionNames.sede])

// 🔥 Este efecto asegura que la sede aparezca cuando editas un proyecto,
// pero solo la PRIMERA VEZ (para no bloquear cambios del usuario)
useEffect(() => {
  if (!isEditing) return;
  if (!initialData?.proyecto) return;
  if (sedes.length === 0) return;
  if (sedeInicialAplicada) return; // ⛔ Ya aplicamos la sede una vez

  const sedeId = String(getEntityId(initialData.proyecto.sede));
  if (!sedeId) return;

  const existe = sedes.some((s) => s.id === sedeId);
  if (!existe) return;

  // Aplicamos la sede seleccionada del proyecto únicamente la primera vez
  setFormData((prev) => ({ ...prev, sede: sedeId }));
  setSedeInicialAplicada(true); // 🔥 Evita que se ejecute nuevamente
}, [isEditing, initialData, sedes, sedeInicialAplicada]);



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
        const response = await authorizedFetch(`${API_BASE_URL}/DirectorioActivo/suggestions?${params.toString()}`, {
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
  }, [authorizedFetch, responsableQuery])

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
        const response = await authorizedFetch(
          `${API_BASE_URL}/DirectorioActivo/suggestions/combined-with-members?${params.toString()}`,
          {
            signal: controller.signal,
          },
        )
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
  }, [authorizedFetch, lectorQuery])

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
        responsable: "",
        responsableCorreo: "",
        proyectoOSituacion: "",
        aplicacionPractica: "",
      })
      setNivelAcceso("Público")
      setSelectedUsers([])
      setEventos([])
      setResponsableQuery("")
      setInitialSelectionNames({ compania: "", sede: "", proceso: "" })
      hasAppliedInitialSelections.current = false
      return
    }

    const proyecto = initialData.proyecto ?? {}
    const lectores = (initialData.lectores ?? []).map((lector, index) => ({
      id: lector.correoLector ?? `lector-${index}`,
      name: lector.nombreLector ?? lector.titulo ?? lector.correoLector ?? `Lector ${index + 1}`,
      email: lector.correoLector ?? undefined,
      title: lector.titulo ?? undefined,
    }))

    const nestedSede = (proyecto.sede as { data?: RemoteEntity })?.data ?? null
    const nestedCompania =
      (nestedSede as { compania?: RemoteEntity })?.compania ?? (proyecto.sede as { compania?: RemoteEntity })?.compania

    setInitialSelectionNames({
      compania: getEntityName(nestedCompania),
      sede: getEntityName(nestedSede ?? (proyecto.sede as RemoteEntity)),
      proceso: getEntityName((proyecto.proceso as { data?: RemoteEntity })?.data ?? (proyecto.proceso as RemoteEntity)),
    })

    hasAppliedInitialSelections.current = false

    const companiaId = getEntityId(nestedCompania)
    const procesoEntity = (proyecto.proceso as RemoteEntity) ?? (proyecto.proceso as { data?: RemoteEntity })?.data

    const sedeIdFromPrimitive = (proyecto as { sedeId?: string | number }).sedeId

    const sedeId =
      getEntityId(proyecto.sede as RemoteEntity) || getEntityId(nestedSede) || String(sedeIdFromPrimitive ?? "")

    setFormData({
      autorNombre: proyecto.nombreAutor ?? loggedUser.name,
      autorCorreo: proyecto.correoAutor ?? loggedUser.email,
      estado: extractEstadoFromProyecto(proyecto),
      fecha: proyecto.fecha ? proyecto.fecha.split("T")[0] : "",
      proceso: getEntityId(procesoEntity),
      compania: companiaId,
      sede: sedeId,
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
    if (hasAppliedInitialSelections.current) return

    const hasSelections = Boolean(
      initialSelectionNames.compania || initialSelectionNames.proceso || initialSelectionNames.sede,
    )

    const canAttemptRestore =
      (initialSelectionNames.compania && companias.length > 0) ||
      (initialSelectionNames.proceso && procesos.length > 0) ||
      (initialSelectionNames.sede && allSedes.length > 0)

    if (!hasSelections) {
      hasAppliedInitialSelections.current = true
      return
    }

    if (!canAttemptRestore) return

    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim()

    let restored = false

    if (!formData.compania && initialSelectionNames.compania && companias.length > 0) {
      const matchedCompania = companias.find(
        (compania) => normalize(compania.nombre) === normalize(initialSelectionNames.compania),
      )
      if (matchedCompania) {
        setFormData((prev) => ({ ...prev, compania: matchedCompania.id }))
        restored = true
      }
    }

    if (!formData.proceso && initialSelectionNames.proceso && procesos.length > 0) {
      const matchedProceso = procesos.find(
        (proceso) => normalize(proceso.nombre) === normalize(initialSelectionNames.proceso),
      )
      if (matchedProceso) {
        setFormData((prev) => ({ ...prev, proceso: matchedProceso.id }))
        restored = true
      }
    }

    if (!formData.sede && initialSelectionNames.sede && allSedes.length > 0) {
      const matchedSede = allSedes.find((sede) => normalize(sede.nombre) === normalize(initialSelectionNames.sede))
      if (matchedSede) {
        setFormData((prev) => ({ ...prev, sede: matchedSede.id, compania: prev.compania || matchedSede.companiaId || "" }))
        restored = true
      }
    }

    if (restored || canAttemptRestore) {
      hasAppliedInitialSelections.current = true
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

  const MAX_ATTACHMENTS = 5
  const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
  const projectId = initialData?.proyecto?.id

  const fetchExistingAttachments = useCallback(
    async (signal?: AbortSignal) => {
      if (!projectId) return

      setIsLoadingExistingAttachments(true)
      setExistingAttachmentsError(null)
      try {
        const response = await authorizedFetch(`${API_BASE_URL}/Adjuntos/proyecto/${projectId}`, { signal })
        if (!response.ok) {
          throw new Error("No fue posible cargar los adjuntos.")
        }
        const data = await response.json()
        setExistingAttachments(Array.isArray(data) ? data : [])
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        console.error("Error al cargar adjuntos", error)
        setExistingAttachmentsError("No fue posible cargar los adjuntos.")
        setExistingAttachments([])
      } finally {
        setIsLoadingExistingAttachments(false)
      }
    },
    [authorizedFetch, projectId],
  )

  useEffect(() => {
    if (!isEditing || !projectId) return
    const controller = new AbortController()
    fetchExistingAttachments(controller.signal)
    return () => controller.abort()
  }, [fetchExistingAttachments, isEditing, projectId])

  const resolveAttachmentId = (attachment: ProyectoAdjunto) => attachment.id ?? attachment.idAdjunto

  const handleExistingAttachmentDownload = async (attachment: ProyectoAdjunto) => {
    const downloadId = resolveAttachmentId(attachment)
    if (!downloadId) {
      toast({
        title: "Descarga no disponible",
        description: "El adjunto seleccionado no tiene un identificador de descarga.",
        variant: "destructive",
      })
      return
    }

    setDownloadingExistingAttachmentId(downloadId)
    try {
      const response = await authorizedFetch(`${API_BASE_URL}/Adjuntos/${downloadId}/archivo`)
      if (!response.ok) {
        throw new Error("No se pudo descargar el archivo.")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = attachment.nombreArchivo ?? `adjunto-${downloadId}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error al descargar adjunto", error)
      toast({
        title: "No se pudo descargar",
        description: "Inténtalo nuevamente más tarde.",
        variant: "destructive",
      })
    } finally {
      setDownloadingExistingAttachmentId(null)
    }
  }

  const handleDeleteExistingAttachment = async (attachment: ProyectoAdjunto) => {
    const deleteId = resolveAttachmentId(attachment)
    if (!deleteId) {
      toast({
        title: "No se pudo eliminar",
        description: "El adjunto seleccionado no tiene un identificador válido.",
        variant: "destructive",
      })
      return
    }

    setDeletingExistingAttachmentId(deleteId)
    try {
      const response = await authorizedFetch(`${API_BASE_URL}/Adjuntos/${deleteId}`, { method: "DELETE" })
      if (!response.ok) {
        throw new Error("No fue posible eliminar el adjunto.")
      }

      toast({
        title: "Adjunto eliminado",
        description: "El archivo fue eliminado correctamente.",
        className: "bg-emerald-50 border-emerald-200 text-emerald-900",
      })
      await fetchExistingAttachments()
    } catch (error) {
      console.error("Error al eliminar adjunto", error)
      toast({
        title: "No se pudo eliminar",
        description: "Ocurrió un error al eliminar el archivo.",
        variant: "destructive",
      })
    } finally {
      setDeletingExistingAttachmentId(null)
    }
  }

  const handleExistingAttachmentUpload = async (file: File) => {
    if (!projectId) {
      toast({
        title: "Proyecto no disponible",
        description: "No se encontró el identificador del proyecto a editar.",
        variant: "destructive",
      })
      return false
    }

    if (existingAttachments.length >= MAX_ATTACHMENTS) {
      toast({
        title: "Límite alcanzado",
        description: "Solo puedes tener hasta 5 adjuntos. Elimina uno para agregar otro.",
        variant: "destructive",
      })
      return false
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "Archivo demasiado grande",
        description: "Cada adjunto debe pesar máximo 20 MB.",
        variant: "destructive",
      })
      return false
    }

    const submission = new FormData()
    submission.append("archivos", file)
    submission.append("proyectoSituacionId", String(projectId))

    setIsUploadingExistingAttachment(true)
    try {
      const response = await authorizedFetch(`${API_BASE_URL}/Adjuntos/multiples`, {
        method: "POST",
        body: submission,
      })

      if (!response.ok) {
        throw new Error("No fue posible subir el archivo.")
      }

      toast({
        title: "Adjunto agregado",
        description: "El archivo se guardó correctamente.",
        className: "bg-emerald-50 border-emerald-200 text-emerald-900",
      })
      await fetchExistingAttachments()
      return true
    } catch (error) {
      console.error("Error al subir adjunto", error)
      toast({
        title: "No se pudo subir el archivo",
        description: "Inténtalo nuevamente más tarde.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsUploadingExistingAttachment(false)
    }
  }

  const handleExistingAttachmentSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (existingAttachments.length + pendingExistingAttachments.length >= MAX_ATTACHMENTS) {
      toast({
        title: "Límite alcanzado",
        description: `Solo puedes adjuntar hasta ${MAX_ATTACHMENTS} archivos. Elimina uno para agregar otro.`,
        variant: "destructive",
      })
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "Archivo demasiado grande",
        description: "Cada adjunto debe pesar máximo 20 MB.",
        variant: "destructive",
      })
      return
    }

    const sanitizedBaseName = sanitizeBaseFileName(getFileBaseName(file.name)).slice(0, ATTACHMENT_NAME_MAX_LENGTH)
    const fallbackBaseName = getFileBaseName(file.name).slice(0, ATTACHMENT_NAME_MAX_LENGTH)
    const finalBaseName = sanitizedBaseName || fallbackBaseName
    const extension = getFileExtension(file.name)
    const nextName = `${finalBaseName}${extension}`
    const normalizedFile = new File([file], nextName, {
      type: file.type || "application/octet-stream",
    })

    const queuedAttachment: Attachment = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
      name: nextName,
      size: formatFileSize(file.size),
      type: file.type || "application/octet-stream",
      file: normalizedFile,
    }

    setPendingExistingAttachments((prev) => [...prev, queuedAttachment])
  }

  const startEditingAttachmentName = (attachment: ProyectoAdjunto) => {
    const resolvedId = resolveAttachmentId(attachment)
    if (!resolvedId) {
      toast({
        title: "No se puede editar",
        description: "El adjunto seleccionado no tiene un identificador válido.",
        variant: "destructive",
      })
      return
    }
    const currentName = attachment.nombreArchivo ?? ""
    setEditingAttachmentNameId(resolvedId)
    setAttachmentNameDraft(
      (sanitizeBaseFileName(currentName) || getFileBaseName(currentName)).slice(0, ATTACHMENT_NAME_MAX_LENGTH),
    )
  }

  const cancelAttachmentNameEditing = () => {
    setEditingAttachmentNameId(null)
    setAttachmentNameDraft("")
  }

  const saveAttachmentName = async (attachment: ProyectoAdjunto) => {
    const attachmentId = resolveAttachmentId(attachment)
    if (!attachmentId) {
      toast({
        title: "No se pudo actualizar",
        description: "El adjunto seleccionado no tiene un identificador válido.",
        variant: "destructive",
      })
      return
    }

    const rawBaseName = attachmentNameDraft.trim()
    const sanitizedBaseName = sanitizeBaseFileName(rawBaseName).slice(0, ATTACHMENT_NAME_MAX_LENGTH)
    const currentName = attachment.nombreArchivo ?? ""
    const extension = getFileExtension(currentName)
    const fallbackBaseName = getFileBaseName(currentName).slice(0, ATTACHMENT_NAME_MAX_LENGTH)
    const finalBaseName = sanitizedBaseName || fallbackBaseName
    const nextName = `${finalBaseName}${extension}`

    setSavingAttachmentNameId(attachmentId)
    try {
      const response = await authorizedFetch(`${API_BASE_URL}/Adjuntos/${attachmentId}/nombre`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authHeaders as Record<string, string>),
          correousuario: loggedUser.email ?? "",
        },
        body: JSON.stringify({ nombre: nextName }),
      })

      if (!response.ok) {
        throw new Error("No fue posible actualizar el nombre del adjunto.")
      }

      toast({
        title: "Nombre actualizado",
        description: "El adjunto fue renombrado correctamente.",
        className: "bg-emerald-50 border-emerald-200 text-emerald-900",
      })
      await fetchExistingAttachments()
      cancelAttachmentNameEditing()
    } catch (error) {
      console.error("Error al actualizar nombre de adjunto", error)
      toast({
        title: "No se pudo actualizar",
        description: "Ocurrió un error al cambiar el nombre del archivo.",
        variant: "destructive",
      })
    } finally {
      setSavingAttachmentNameId(null)
    }
  }

  const updatePendingExistingAttachmentName = (id: string, nextBaseName: string) => {
    const sanitizedBaseName = sanitizeBaseFileName(nextBaseName).slice(0, ATTACHMENT_NAME_MAX_LENGTH)

    setPendingExistingAttachments((prev) =>
      prev.map((attachment) => {
        if (attachment.id !== id) return attachment

        const extension = getFileExtension(attachment.file.name)
        const fallbackBaseName = getFileBaseName(attachment.name).slice(0, ATTACHMENT_NAME_MAX_LENGTH)
        const finalBaseName = sanitizedBaseName || fallbackBaseName
        const nextName = `${finalBaseName}${extension}`
        const updatedFile = new File([attachment.file], nextName, { type: attachment.file.type })

        return { ...attachment, name: nextName, file: updatedFile }
      }),
    )
  }

  const removePendingExistingAttachment = (id: string) => {
    setPendingExistingAttachments((prev) => prev.filter((att) => att.id !== id))
  }

  const savePendingExistingAttachment = async (attachment: Attachment) => {
    setSavingPendingAttachmentId(attachment.id)
    const wasUploaded = await handleExistingAttachmentUpload(attachment.file)
    if (wasUploaded) {
      setPendingExistingAttachments((prev) => prev.filter((item) => item.id !== attachment.id))
    }
    setSavingPendingAttachmentId(null)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const remainingSlots = MAX_ATTACHMENTS - attachments.length

      if (remainingSlots <= 0) {
        toast({
          title: "Límite alcanzado",
          description: `Solo puedes adjuntar hasta ${MAX_ATTACHMENTS} archivos.`,
          variant: "destructive",
        })
        e.target.value = ""
        return
      }

      const selectableFiles = Array.from(files)

      if (selectableFiles.length > remainingSlots) {
        toast({
          title: "Demasiados archivos",
          description: `Solo se cargarán los primeros ${MAX_ATTACHMENTS} archivos permitidos.`,
          variant: "destructive",
        })
      }

      const filesWithinLimit = selectableFiles.slice(0, remainingSlots)
      const validFiles = filesWithinLimit.filter((file) => file.size <= MAX_FILE_SIZE_BYTES)

          if (validFiles.length !== filesWithinLimit.length) {
            toast({
              title: "Archivo demasiado grande",
              description: "Cada adjunto debe pesar máximo 20 MB.",
              variant: "destructive",
            })
          }

      if (validFiles.length > 0) {
        const newAttachments: Attachment[] = validFiles.map((file) => {
          const sanitizedBaseName = sanitizeBaseFileName(getFileBaseName(file.name)).slice(
            0,
            ATTACHMENT_NAME_MAX_LENGTH,
          )
          const fallbackBaseName = getFileBaseName(file.name).slice(0, ATTACHMENT_NAME_MAX_LENGTH)
          const finalBaseName = sanitizedBaseName || fallbackBaseName
          const extension = getFileExtension(file.name)
          const nextName = `${finalBaseName}${extension}`
          const normalizedFile = new File([file], nextName, {
            type: file.type || "application/octet-stream",
          })

          return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: nextName,
            size: formatFileSize(file.size),
            type: file.type || "application/octet-stream",
            file: normalizedFile,
          }
        })
        setAttachments((prev) => [...prev, ...newAttachments])
      }
    }
    e.target.value = ""
  }

  const updateAttachmentName = (id: string, nextBaseName: string) => {
    const sanitizedBaseName = sanitizeBaseFileName(nextBaseName).slice(0, ATTACHMENT_NAME_MAX_LENGTH)

    setAttachments((prev) =>
      prev.map((attachment) => {
        if (attachment.id !== id) return attachment

        const extension = getFileExtension(attachment.file.name)
        const fallbackBaseName = getFileBaseName(attachment.name).slice(0, ATTACHMENT_NAME_MAX_LENGTH)
        const finalBaseName = sanitizedBaseName || fallbackBaseName
        const nextName = `${finalBaseName}${extension}`
        const updatedFile = new File([attachment.file], nextName, { type: attachment.file.type })

        return { ...attachment, name: nextName, file: updatedFile }
      }),
    )
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

    const impactosSinAccion = impactos.some((impacto) =>
      acciones.every((accion) => !accion.relatedImpactos.includes(impacto.id)),
    )
    const accionesSinResultado = acciones.some((accion) =>
      resultados.every((resultado) => !resultado.relatedAcciones.includes(accion.id)),
    )
    const resultadosSinLeccion = resultados.some((resultado) =>
      lecciones.every((leccion) => !leccion.relatedResultados.includes(resultado.id)),
    )

    if (impactosSinAccion || accionesSinResultado || resultadosSinLeccion) {
      toast({
        title: "Relaciones incompletas",
        description:
          "Cada impacto debe tener una acción, cada acción un resultado y cada resultado una lección asociada antes de guardar.",
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
                  maxLength={EVENT_TABLE_TEXTAREA_MAX_LENGTH}
                  className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
                />
                {renderCharLimitNotice(row.description, EVENT_TABLE_TEXTAREA_MAX_LENGTH)}
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
                          className={`group flex min-w-0 w-full sm:w-auto sm:max-w-xl items-start gap-2 rounded-lg border px-3 py-2 text-left text-xs leading-snug transition ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-[0_0_0_1px] shadow-emerald-100"
                              : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50"
                          }`}
                          onClick={() => toggleRelation(row.id, option.id, relationKey, setter)}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700 transition group-hover:bg-emerald-100 group-hover:text-emerald-800">
                            {originalIndex + 1}
                          </span>
                          <span className="min-w-0 whitespace-normal break-words text-left leading-snug">{option.description}</span>
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
                maxLength={EVENT_TABLE_TEXTAREA_MAX_LENGTH}
                className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
              />
              {renderCharLimitNotice(row.description, EVENT_TABLE_TEXTAREA_MAX_LENGTH)}
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

  const findEstadoByDescripcion = (descripcion: string): RemoteEntity | undefined =>
    estados.find(
      (estado) => normalizeStatus(getEstadoDescripcionFromEntity(estado)) === normalizeStatus(descripcion),
    )

  const handleWorkflowAction = async (action: WorkflowAction) => {
    if (!initialData?.proyecto?.id) {
      toast({
        title: "Acción no disponible",
        description: "Guarda el borrador antes de moverlo de estado.",
        variant: "destructive",
      })
      return
    }

    const targetEstado = workflowActionConfig[action].targetEstado
    const estadoCoincidente = findEstadoByDescripcion(targetEstado)
    const estadoIdCandidate =
      estadoCoincidente?.id ??
      estadoCoincidente?.Id ??
      (estadoCoincidente as { codigo?: string | number })?.codigo ??
      (estadoCoincidente as { Codigo?: string | number })?.Codigo

    const estadoId = Number(estadoIdCandidate)
    const proyectoId = Number(initialData.proyecto.id)

    if (!estadoCoincidente || !Number.isFinite(estadoId)) {
      toast({
        title: "Estado no encontrado",
        description: `No fue posible obtener el estado objetivo (${targetEstado}).`,
        variant: "destructive",
      })
      return
    }

    if (!Number.isFinite(proyectoId)) {
      toast({
        title: "Proyecto no válido",
        description: "No se pudo identificar el proyecto para actualizar el estado.",
        variant: "destructive",
      })
      return
    }

    setIsChangingStatus(true)
    try {
      const headers: Record<string, string> = {
        ...(authHeaders as Record<string, string>),
        "Content-Type": "application/json",
      }
      if (loggedUser.email) {
        headers.correousuario = loggedUser.email
      }

      const response = await authorizedFetch(`${API_BASE_URL}/ProyectoSituacion/estado`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ IdProyectoSituacion: proyectoId, IdEstado: estadoId }),
      })

      if (!response.ok) {
        throw new Error("No se pudo actualizar el estado")
      }

      setFormData((prev) => ({ ...prev, estado: targetEstado }))
      toast({
        title: "Estado actualizado",
        description: `El proyecto pasó a ${targetEstado}.`,
        className: "bg-emerald-50 border-emerald-200 text-emerald-900",
      })
      onSaved()
    } catch (error) {
      console.error(error)
      toast({
        title: "No se pudo actualizar",
        description: "Inténtalo nuevamente más tarde.",
        variant: "destructive",
      })
    } finally {
      setIsChangingStatus(false)
    }
  }

  const selectedDirectoryEntities = useMemo(
    () => availableUsers.filter((user) => selectedUsers.includes(user.id)),
    [availableUsers, selectedUsers],
  )

  const expandedSelectedLectores = useMemo(() => {
    const registry = new Map<string, DirectoryUser>()

    selectedDirectoryEntities.forEach((entity) => {
      if (entity.isGroup && entity.members?.length) {
        entity.members.forEach((member) => registry.set(member.id, member))
        return
      }

      registry.set(entity.id, entity)
    })

    return Array.from(registry.values())
  }, [selectedDirectoryEntities])

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

    if (nivelAcceso === "Privado" && expandedSelectedLectores.length === 0) {
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
    const selectedLectores = expandedSelectedLectores

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

      const headers: Record<string, string> = { ...(authHeaders as Record<string, string>) }

      if (loggedUser?.email) {
        headers.correousuario = loggedUser.email
      }

      const submission = new FormData()
      submission.append("Payload", JSON.stringify(payload))
      attachments.forEach((attachment) => {
        submission.append("Adjuntos", attachment.file)
      })

      const response = await authorizedFetch(endpointUrl, {
        method: isEditing ? "PUT" : "POST",
        headers,
        body: submission,
      })

      if (!response.ok) {
        throw new Error("No fue posible guardar la información")
      }

      toast({
        title: isEditing ? "Proyecto actualizado" : "Proyecto guardado",
        description: "El proyecto o situación se guardó correctamente.",
        className: "bg-emerald-50 border-emerald-200 text-emerald-900",
      })
      if (!isEditing && attachments.length > 0) {
        toast({
          title: "Estamos procesando tus adjuntos",
          description:
            "Dependiendo del tamaño de los archivos, podrían tardar algunos minutos en reflejarse en el proyecto o situación.",
          className: "bg-amber-50 border-amber-200 text-amber-900",
        })
      }
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

  const selectedUserObjects = selectedDirectoryEntities
  const autorDisplay = [formData.autorNombre, formData.autorCorreo].filter(Boolean).join(" - ")
  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], [])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-4 md:p-6">
      <Card className="w-full h-full max-h-screen max-w-full p-0 sm:h-auto sm:max-h-[92vh] sm:max-w-6xl border border-emerald-100 bg-white shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col text-[15px] leading-relaxed sm:text-base">
        <CardHeader className="sticky top-0 z-20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-[#0b7c4a] via-[#199a59] to-[#3f8f68] px-4 py-4 sm:px-6 sm:py-5 text-white shadow-md rounded-none sm:rounded-b-2xl">
          <div className="space-y-0.5">
            <CardTitle className="text-xl font-bold text-white">Proyecto o Situación</CardTitle>
            <CardDescription className="text-sm text-emerald-100 sm:text-base">
              Eventos y lecciones aprendidas de un proyecto o situación
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting}
            className="ml-auto h-9 w-9 rounded-full bg-white/10 text-white shadow-sm transition hover:bg-white/20 sm:ml-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3 border-b border-emerald-100 bg-[#f4fff9] px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="text-base font-semibold text-slate-700">Acciones de Flujo de Trabajo</div>
              <div className="text-sm text-slate-500 max-w-3xl">
                Las acciones disponibles dependen de tu rol, el estado y tu relación con el proyecto.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {initialData?.proyecto?.id ? (
                visibleWorkflowActions.length > 0 ? (
                  visibleWorkflowActions.map((action) => {
                    const config = workflowActionConfig[action]

                    return (
                      <Button
                        key={action}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleWorkflowAction(action)}
                        disabled={isChangingStatus || isSubmitting}
                        className="gap-2 border-[#8fd0ab] text-[#065f46] hover:bg-[#e0f3e8]"
                      >
                        {isChangingStatus ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          config.icon
                        )}
                        <span>{config.label}</span>
                      </Button>
                    )
                  })
                ) : (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                    No hay acciones disponibles para tu rol en este estado.
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                  Guarda el borrador para habilitar las acciones de flujo.
                </Badge>
              )}
            </div>
          </div>

        {!isEditable && editBlockedReason && (
          <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {editBlockedReason}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <fieldset disabled={isSubmitting || !isEditable} className="border-0 p-0 m-0">
            <CardContent className="space-y-8 p-6 sm:p-8">
              {/* ENCABEZADO - Información General hasta Anexos */}
              <div className="space-y-6">
                <div className="border-l-4 border-[#067138] pl-4">
                  <h3 className="text-xl font-bold text-slate-900">Información General</h3>
                  <p className="text-base text-slate-600">Datos básicos del evento o situación</p>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="autor" className="text-base font-semibold text-slate-700">
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
                  <Label htmlFor="estado" className="text-base font-semibold text-slate-700">
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
                  <Label htmlFor="fecha" className="text-base font-semibold text-slate-700">
                    Fecha *
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    max={todayIso}
                    className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="proceso" className="text-base font-semibold text-slate-700">
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
                  <Label htmlFor="compania" className="text-base font-semibold text-slate-700">
                    Compañía *
                  </Label>
                  <Select
                    value={formData.compania}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        compania: value,
                        sede: "", // 🔥 Cuando cambia compañía, resetea sede
                      })
                    }
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
                  <Label htmlFor="sede" className="text-base font-semibold text-slate-700">
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
                  <Label htmlFor="responsable" className="text-base font-semibold text-slate-700">
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
                              <span className="text-sm text-slate-500">{user.email ?? user.title}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="proyectoOSituacion" className="text-base font-semibold text-slate-700">
                    Proyecto o situación *
                  </Label>
                  <Textarea
                    id="proyectoOSituacion"
                    value={formData.proyectoOSituacion}
                    onChange={(e) => setFormData({ ...formData, proyectoOSituacion: e.target.value })}
                    placeholder="Descripción detallada del proyecto o situación"
                    rows={3}
                    maxLength={DEFAULT_TEXTAREA_MAX_LENGTH}
                    className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
                    required
                  />
                  {renderCharLimitNotice(formData.proyectoOSituacion, DEFAULT_TEXTAREA_MAX_LENGTH)}
                </div>
                <div className="space-y-3">
                  <Label htmlFor="aplicacionPractica" className="text-base font-semibold text-slate-700">
                    Aplicación Práctica *
                  </Label>
                  <Textarea
                    id="aplicacionPractica"
                    value={formData.aplicacionPractica}
                    onChange={(e) => setFormData({ ...formData, aplicacionPractica: e.target.value })}
                    placeholder="¿Cómo y donde puede usarse lo aprendido?"
                    rows={3}
                    maxLength={APPLICACION_PRACTICA_MAX_LENGTH}
                    className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
                    required
                  />
                  {renderCharLimitNotice(formData.aplicacionPractica, APPLICACION_PRACTICA_MAX_LENGTH)}
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label htmlFor="nivelAcceso" className="text-base font-semibold text-slate-700">
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
                  <p className="text-sm text-slate-500">
                    {nivelAcceso === "Público"
                      ? "Esta lección será visible para todos los usuarios"
                      : "Esta lección solo será visible para los lectores seleccionados"}
                  </p>
                </div>

                  {nivelAcceso === "Privado" && (
                    <div className="space-y-3 md:col-span-2" ref={userDropdownRef}>
                      <Label className="text-base font-semibold text-slate-700">Lectores *</Label>
                      <div className="space-y-3">
                        <div className="relative">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                            className="w-full justify-between border-slate-200 focus:border-[#067138]"
                          >
                            <span className="text-slate-600">
                              {expandedSelectedLectores.length === 0
                                ? "Seleccionar lectores..."
                                : `${expandedSelectedLectores.length} lector(es) agregado(s)`}
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
                                      {user.isGroup && (
                                        <div className="text-xs font-semibold text-emerald-700">Grupo</div>
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="text-xl font-bold text-slate-900">Eventos</h3>
                  <p className="text-base text-slate-600">Gestione los eventos relacionados con esta lección</p>
                </div>
                <Button
                  type="button"
                  onClick={openAddEventDialog}
                  className="w-full gap-2 bg-purple-600 text-base hover:bg-purple-700 sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Evento
                </Button>
              </div>

              {eventos.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <Table className="min-w-full md:min-w-[720px]">
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
                            <p className="line-clamp-2 text-base">{evento.evento}</p>
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
                <p className="text-base text-slate-600">Adjunte documentos, imágenes o archivos relacionados</p>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={existingAttachmentInputRef}
                    onChange={handleExistingAttachmentSelection}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt"
                  />

                  {existingAttachmentsError && (
                    <p className="text-sm text-red-600">{existingAttachmentsError}</p>
                  )}

                  {isLoadingExistingAttachments && (
                    <div className="flex items-center gap-2 text-base text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin text-[#067138]" /> Cargando adjuntos...
                    </div>
                  )}

                  {!isLoadingExistingAttachments && existingAttachments.length === 0 && !existingAttachmentsError && (
                    <p className="text-sm text-slate-500">No hay adjuntos asociados a este proyecto.</p>
                  )}

                  {existingAttachments.length > 0 && (
                    <div className="space-y-3">
                      {existingAttachments.map((attachment, index) => {
                        const attachmentKey = resolveAttachmentId(attachment) ?? index
                        const attachmentName = attachment.nombreArchivo ?? "Archivo sin nombre"
                        const attachmentExtension = getFileExtension(attachmentName)

                        return (
                          <div
                            key={attachmentKey}
                            className="flex flex-wrap items-start gap-3 rounded-2xl border border-emerald-50 bg-[#f8fdf9] p-4 shadow-inner"
                          >
                            <div className="flex-1 min-w-[240px] space-y-1">
                              <div className="flex flex-col gap-2">
                                <p className="font-medium text-slate-900 break-words">{attachmentName}</p>
                              </div>
                              <p className="text-sm text-slate-500">
                                ID de descarga: {resolveAttachmentId(attachment) ?? "N/D"}
                              </p>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full gap-2 border-[#8fd0ab] text-[#065f46] hover:bg-[#e0f3e8] sm:w-auto"
                                onClick={() => handleExistingAttachmentDownload(attachment)}
                                disabled={downloadingExistingAttachmentId === attachmentKey}
                              >
                                {downloadingExistingAttachmentId === attachmentKey ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Descargando...
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-4 w-4" />
                                    Descargar
                                  </>
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full gap-2 border-red-200 text-red-700 hover:bg-red-50 sm:w-auto"
                                onClick={() => handleDeleteExistingAttachment(attachment)}
                                disabled={deletingExistingAttachmentId === attachmentKey || isSubmitting || !isEditable}
                              >
                                {deletingExistingAttachmentId === attachmentKey ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Eliminando...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4" />
                                    Eliminar
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {pendingExistingAttachments.length > 0 && (
                    <div className="space-y-2">
                      {pendingExistingAttachments.map((attachment) => {
                        const baseName = getFileBaseName(attachment.name)
                        const extension = getFileExtension(attachment.name)

                        return (
                          <div
                            key={attachment.id}
                            className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3"
                          >
                            <FileText className="h-5 w-5 text-emerald-600" />
                            <div className="flex-1 min-w-[220px] space-y-1">
                              <label className="text-sm font-medium text-slate-800">Nombre del adjunto</label>
                              <div className="flex items-center gap-2">
                                <Input
                                  value={baseName}
                                  maxLength={ATTACHMENT_NAME_MAX_LENGTH}
                                  onChange={(event) =>
                                    updatePendingExistingAttachmentName(attachment.id, event.target.value)
                                  }
                                  className="bg-white"
                                  disabled={isUploadingExistingAttachment || savingPendingAttachmentId === attachment.id}
                                />
                                <span className="text-sm text-slate-500 whitespace-nowrap">{extension}</span>
                              </div>
                              <div className="text-sm text-slate-500">{attachment.size}</div>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="w-full gap-2 bg-[#067138] text-white hover:bg-[#05592d] sm:w-auto"
                                onClick={() => savePendingExistingAttachment(attachment)}
                                disabled={
                                  !isEditable ||
                                  isSubmitting ||
                                  isUploadingExistingAttachment ||
                                  savingPendingAttachmentId === attachment.id
                                }
                              >
                                {savingPendingAttachmentId === attachment.id || isUploadingExistingAttachment ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Guardando...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4" />
                                    Guardar adjunto
                                  </>
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto"
                                onClick={() => removePendingExistingAttachment(attachment.id)}
                                disabled={savingPendingAttachmentId === attachment.id || isUploadingExistingAttachment}
                              >
                                <Trash2 className="h-4 w-4" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4">
                    <div className="flex flex-col gap-1 text-sm text-slate-700">
                      <span className="font-medium text-slate-800">Agregar un archivo</span>
                      <span className="text-xs text-slate-600">Hasta 5 adjuntos de máximo 20 MB cada uno.</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50 sm:w-auto"
                      disabled={
                        !isEditable ||
                        isSubmitting ||
                        existingAttachments.length + pendingExistingAttachments.length >= MAX_ATTACHMENTS
                      }
                      onClick={() => existingAttachmentInputRef.current?.click()}
                    >
                      {isUploadingExistingAttachment ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Agregar archivo
                        </>
                      )}
                    </Button>
                  </div>

                  {existingAttachments.length + pendingExistingAttachments.length >= MAX_ATTACHMENTS && (
                    <p className="text-sm text-red-600">
                      Has alcanzado el máximo de 5 adjuntos. Elimina uno para poder cargar un nuevo archivo.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
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
                      className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50 sm:w-auto"
                    >
                      <Upload className="h-4 w-4" />
                      Subir archivos
                    </Button>
                    <span className="text-sm text-slate-500 text-justify sm:text-left">
                      Formatos soportados: PDF, Word, Excel, PowerPoint, imágenes, texto. Hasta 5 archivos de 20 MB cada uno.
                    </span>
                  </div>

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((attachment) => {
                        const baseName = getFileBaseName(attachment.name)
                        const extension = getFileExtension(attachment.name)

                        return (
                          <div
                            key={attachment.id}
                            className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            <FileText className="h-5 w-5 text-slate-500" />
                            <div className="flex-1 min-w-[220px] space-y-1">
                              <label className="text-sm font-medium text-slate-800">Nombre del adjunto</label>
                              <div className="flex items-center gap-2">
                                <Input
                                  value={baseName}
                                  maxLength={ATTACHMENT_NAME_MAX_LENGTH}
                                  onChange={(event) => updateAttachmentName(attachment.id, event.target.value)}
                                  className="bg-white"
                                />
                                <span className="text-sm text-slate-500 whitespace-nowrap">{extension}</span>
                              </div>
                              <div className="text-sm text-slate-500">{attachment.size}</div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(attachment.id)}
                              className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
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
      </div>
    </Card>

  <Dialog open={showEventDialog && isEditable} onOpenChange={(open) => !isSubmitting && isEditable && setShowEventDialog(open)}>
    <DialogContent
      className={`w-screen max-w-none p-0 m-0 rounded-none h-[90vh] overflow-y-auto min-w-full ${isSubmitting ? "pointer-events-none opacity-70" : ""}`}
      onInteractOutside={(event) => event.preventDefault()}
      onEscapeKeyDown={(event) => event.preventDefault()}
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
                maxLength={EVENT_DESCRIPTION_MAX_LENGTH}
                className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30"
                required
              />
              {renderCharLimitNotice(currentEvent.evento, EVENT_DESCRIPTION_MAX_LENGTH)}
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
