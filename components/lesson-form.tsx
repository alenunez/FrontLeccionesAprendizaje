"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Save, Plus, Trash2, Upload, FileText, Edit, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7043/api"

interface LessonFormProps {
  onClose: () => void
  onSaved: () => void
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

export function LessonForm({ onClose, onSaved }: LessonFormProps) {
  const [formData, setFormData] = useState({
    autor: "",
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

  const [nivelAcceso, setNivelAcceso] = useState<"Público" | "Privado">("Público")

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
    if (!formData.compania) {
      setSedes(allSedes)
      setFormData((prev) => (prev.sede ? { ...prev, sede: "" } : prev))
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
    setEditingEventId(null)
    setCurrentEvent({ evento: "" })
    setCurrentImpactos([{ id: "1", description: "" }])
    setCurrentAccionesImplementadas([{ id: "1", description: "", relatedImpactos: [] }])
    setCurrentResultados([{ id: "1", description: "", relatedAcciones: [] }])
    setCurrentLeccionesAprendidas([{ id: "1", description: "", relatedResultados: [] }])
    setShowEventDialog(true)
  }

  const openEditEventDialog = (event: Event) => {
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
              <div className="ml-2 pl-4 border-l-2 border-slate-200">
                <Label className="text-xs font-semibold text-slate-600 mb-2 block">{relationLabel}</Label>
                <div className="flex flex-wrap gap-2">
                  {relationOptions
                    .filter((opt) => opt.description.trim())
                    .map((option) => {
                      const originalIndex = relationOptions.findIndex((o) => o.id === option.id)
                      const isSelected = row[relationKey]?.includes(option.id)
                      return (
                        <Badge
                          key={option.id}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer text-xs ${
                            isSelected
                              ? "bg-[#067138] text-white hover:bg-[#05592d]"
                              : "bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                          onClick={() => toggleRelation(row.id, option.id, relationKey, setter)}
                        >
                          {originalIndex + 1}
                        </Badge>
                      )
                    })}
                  {relationOptions.filter((opt) => opt.description.trim()).length === 0 && (
                    <span className="text-xs text-slate-400 italic">Agregue {relationLabel.toLowerCase()} primero</span>
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

  const mapEventToDto = (event: Event) => {
    const impactoIndexMap = new Map(event.impactos.map((impacto, index) => [impacto.id, index]))
    const accionIndexMap = new Map(event.accionesImplementadas.map((accion, index) => [accion.id, index]))
    const resultadoIndexMap = new Map(event.resultados.map((resultado, index) => [resultado.id, index]))

    const resultadosDto = event.resultados.map((resultado, resultadoIndex) => {
      const accionesReferenciadas = resultado.relatedAcciones
        .map((accionId) => accionIndexMap.get(accionId))
        .filter(isDefined)
      const leccionesDto = event.leccionesAprendidas
        .filter((leccion) => leccion.relatedResultados.includes(resultado.id))
        .map((leccion) => ({
          leccion: {
            titulo: leccion.description,
            descripcion: leccion.description,
          },
          resultados: leccion.relatedResultados
            .map((resultadoId) => resultadoIndexMap.get(resultadoId))
            .filter(isDefined),
        }))

      return {
        resultado: {
          titulo: resultado.description,
          descripcion: resultado.description,
          identificador: resultadoIndex,
        },
        acciones: accionesReferenciadas,
        lecciones: leccionesDto,
      }
    })

    const accionesDto = event.accionesImplementadas.map((accion, accionIndex) => {
      const resultadosAsociados = resultadosDto.filter((_, resultadoIndex) =>
        event.resultados[resultadoIndex]?.relatedAcciones.includes(accion.id),
      )

      return {
        accion: {
          titulo: accion.description,
          descripcion: accion.description,
          identificador: accionIndex,
        },
        impactos: accion.relatedImpactos
          .map((impactoId) => impactoIndexMap.get(impactoId))
          .filter(isDefined),
        resultados: resultadosAsociados,
      }
    })

    const impactosDto = event.impactos.map((impacto, impactoIndex) => {
      const accionesRelacionadas = accionesDto.filter((_, accionIndex) =>
        event.accionesImplementadas[accionIndex]?.relatedImpactos.includes(impacto.id),
      )

      return {
        impacto: {
          titulo: impacto.description,
          descripcion: impacto.description,
          identificador: impactoIndex,
        },
        acciones: accionesRelacionadas,
      }
    })

    return {
      evento: {
        titulo: event.evento,
        descripcion: event.evento,
      },
      impactos: impactosDto,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

    const estadoBorrador = estados.find((estado) => {
      const descripcion =
        estado.descripcion ?? estado.description ?? estado.nombre ?? estado.Nombre ?? estado.name ?? estado.Name
      return typeof descripcion === "string" && descripcion.toLowerCase() === "borrador"
    })

    const estadoId = Number(
      estadoBorrador?.id ?? estadoBorrador?.Id ?? estadoBorrador?.codigo ?? estadoBorrador?.Codigo ?? null,
    )

    if (!estadoBorrador || !Number.isFinite(estadoId)) {
      toast({
        title: "No se pudo guardar",
        description: "No se encontró el estado 'Borrador'. Inténtalo nuevamente más tarde.",
        variant: "destructive",
      })
      return
    }

    const estadoDescripcion =
      estadoBorrador.descripcion ??
      estadoBorrador.description ??
      estadoBorrador.nombre ??
      estadoBorrador.Nombre ??
      estadoBorrador.name ??
      estadoBorrador.Name ??
      "Borrador"

    const payload = {
      proyecto: {
        titulo: formData.proyectoOSituacion,
        fecha: fechaIso,
        descripcion: formData.proyectoOSituacion,
        aplicacionPractica: formData.aplicacionPractica,
        correoAutor: formData.autor,
        nombreAutor: formData.autor,
        correoResponsable: formData.responsableCorreo || formData.responsable,
        nombreResponsable: formData.responsable,
        estado: {
          id: estadoId,
          value: estadoDescripcion,
          data: estadoDescripcion,
        },
        sede: {
          id: formData.sede,
          value: selectedSede?.nombre ?? formData.sede,
          data: selectedSede?.nombre ?? formData.sede,
        },
        proceso: {
          id: formData.proceso,
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
      const response = await fetch(`${API_BASE_URL}/ProyectoSituacion/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("No fue posible guardar la información")
      }

      toast({
        title: "Proyecto guardado",
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

        <form onSubmit={handleSubmit}>
          <fieldset disabled={isSubmitting} className="border-0 p-0 m-0">
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
                    value={formData.autor}
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
              disabled={isSubmitting}
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
                  Guardar
                </>
              )}
            </Button>
          </div>
          </fieldset>
        </form>
      </Card>

      <Dialog open={showEventDialog} onOpenChange={(open) => !isSubmitting && setShowEventDialog(open)}>
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
