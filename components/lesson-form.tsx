"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Save, Plus, Trash2, Upload, FileText, Edit, Send, Globe, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface LessonFormProps {
  onClose: () => void
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

const availableUsers = [
  { id: "1", name: "Ana García", role: "Gerente de Proyecto" },
  { id: "2", name: "Carlos Rodríguez", role: "Líder Técnico" },
  { id: "3", name: "María López", role: "Desarrolladora Senior" },
  { id: "4", name: "Juan Pérez", role: "Arquitecto de Software" },
  { id: "5", name: "Laura Martínez", role: "Product Owner" },
  { id: "6", name: "Diego Sánchez", role: "Scrum Master" },
  { id: "7", name: "Carmen Ruiz", role: "Analista de Negocio" },
  { id: "8", name: "Roberto Silva", role: "DevOps Engineer" },
]

export function LessonForm({ onClose }: LessonFormProps) {
  const [formData, setFormData] = useState({
    autor: "",
    estado: "Borrador",
    fecha: "",
    proceso: "",
    compania: "",
    sede: "",
    responsable: "",
    proyectoOSituacion: "",
    aplicacionPractica: "",
  })

  const [nivelAcceso, setNivelAcceso] = useState<"Público" | "Privado">("Público")

  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])

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

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
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
    const eventData: Event = {
      id: editingEventId || Date.now().toString(),
      evento: currentEvent.evento,
      impactos: currentImpactos.filter((row) => row.description.trim()),
      accionesImplementadas: currentAccionesImplementadas.filter((row) => row.description.trim()),
      resultados: currentResultados.filter((row) => row.description.trim()),
      leccionesAprendidas: currentLeccionesAprendidas.filter((row) => row.description.trim()),
    }

    if (editingEventId) {
      // Update existing event
      setEventos((prev) => prev.map((e) => (e.id === editingEventId ? eventData : e)))
    } else {
      // Add new event
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
                  className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
              {data.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeRow(row.id, setter)}
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
                              ? "bg-blue-600 text-white hover:bg-blue-700"
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
          className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
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
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            {data.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeRow(row.id, setter)}
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
          className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>
    </div>
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const lessonData = {
      ...formData,
      audienciaClave: selectedUsers,
      attachments: attachments,
      eventos: eventos,
      nivelAcceso: nivelAcceso,
    }
    console.log("Guardando lección:", lessonData)
    onClose()
  }

  const selectedUserObjects = availableUsers.filter((user) => selectedUsers.includes(user.id))

  // Handlers for approval workflow buttons
  const handleSendToReview = () => {
    console.log("Enviando a revisión...")
    // Logic to send lesson to review
  }

  const handleReturnToReview = () => {
    console.log("Devolviendo a revisión...")
    // Logic to return lesson to review
  }

  const handlePublish = () => {
    console.log("Publicando lección...")
    // Logic to publish lesson
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-[90%] max-h-[90vh] overflow-y-auto shadow-2xl border-0">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div>
            <CardTitle className="text-xl text-white">Proyecto o Situación</CardTitle>
            <CardDescription className="text-blue-100">
              Eventos y lecciones aprendidas de un proyecto o situación
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <div className="flex items-center justify-between gap-3 px-8 py-4 bg-slate-50 border-b border-slate-200">
          <div className="text-sm font-medium text-slate-700">Acciones de Flujo de Trabajo</div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendToReview}
              className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 bg-transparent"
            >
              <Send className="h-4 w-4" />
              Enviar a revisión
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReturnToReview}
              className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 bg-transparent"
            >
              <RotateCcw className="h-4 w-4" />
              Devolver a revisión
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePublish}
              className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 bg-transparent"
            >
              <Globe className="h-4 w-4" />
              Publicar
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-8 p-8">
            {/* ENCABEZADO - Información General hasta Anexos */}
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-4">
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
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
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
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                      <SelectValue placeholder="Seleccionar proceso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gestion-proyectos">Gestión de Proyectos</SelectItem>
                      <SelectItem value="desarrollo-software">Desarrollo de Software</SelectItem>
                      <SelectItem value="infraestructura-ti">Infraestructura TI</SelectItem>
                      <SelectItem value="recursos-humanos">Recursos Humanos</SelectItem>
                      <SelectItem value="finanzas">Finanzas</SelectItem>
                      <SelectItem value="operaciones">Operaciones</SelectItem>
                      <SelectItem value="calidad">Calidad</SelectItem>
                      <SelectItem value="seguridad">Seguridad</SelectItem>
                      <SelectItem value="innovacion">Innovación</SelectItem>
                      <SelectItem value="servicio-cliente">Servicio al Cliente</SelectItem>
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
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                      <SelectValue placeholder="Seleccionar compañía" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresa-a">Empresa A</SelectItem>
                      <SelectItem value="empresa-b">Empresa B</SelectItem>
                      <SelectItem value="empresa-c">Empresa C</SelectItem>
                      <SelectItem value="filial-1">Filial 1</SelectItem>
                      <SelectItem value="filial-2">Filial 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="sede" className="text-sm font-semibold text-slate-700">
                    Sede *
                  </Label>
                  <Select value={formData.sede} onValueChange={(value) => setFormData({ ...formData, sede: value })}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                      <SelectValue placeholder="Seleccionar sede" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bogota">Bogotá</SelectItem>
                      <SelectItem value="medellin">Medellín</SelectItem>
                      <SelectItem value="cali">Cali</SelectItem>
                      <SelectItem value="barranquilla">Barranquilla</SelectItem>
                      <SelectItem value="bucaramanga">Bucaramanga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="responsable" className="text-sm font-semibold text-slate-700">
                    Responsable *
                  </Label>
                  <Select
                    value={formData.responsable}
                    onValueChange={(value) => setFormData({ ...formData, responsable: value })}
                  >
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                      <SelectValue placeholder="Seleccionar responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.name}>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-slate-500">{user.role}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
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
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    required
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label htmlFor="nivelAcceso" className="text-sm font-semibold text-slate-700">
                    Nivel de Acceso *
                  </Label>
                  <Select value={nivelAcceso} onValueChange={(value: "Público" | "Privado") => setNivelAcceso(value)}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500">
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
                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-sm font-semibold text-slate-700">Lectores *</Label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowUserDropdown(!showUserDropdown)}
                          className="w-full justify-between border-slate-200 focus:border-blue-500"
                        >
                          <span className="text-slate-600">
                            {selectedUsers.length === 0
                              ? "Seleccionar usuarios..."
                              : `${selectedUsers.length} usuario(s) seleccionado(s)`}
                          </span>
                          <Plus className="h-4 w-4" />
                        </Button>

                        {showUserDropdown && (
                          <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {availableUsers.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                                onClick={() => toggleUser(user.id)}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.includes(user.id)}
                                  onChange={() => {}}
                                  className="rounded border-slate-300"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-slate-900">{user.name}</div>
                                  <div className="text-sm text-slate-500">{user.role}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {selectedUserObjects.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedUserObjects.map((user) => (
                            <Badge
                              key={user.id}
                              variant="secondary"
                              className="gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              {user.name}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeUser(user.id)}
                                className="h-4 w-4 p-0 hover:bg-blue-200"
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
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
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
              <div className="border-l-4 border-green-500 pl-4">
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

          <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 rounded-b-lg">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 hover:bg-slate-100 bg-transparent"
            >
              Cancelar
            </Button>
            <Button type="submit" className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </div>
        </form>
      </Card>

      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="w-screen max-w-none p-0 m-0 rounded-none h-[90vh] overflow-y-auto min-w-full">
          <div className="space-y-6 px-6 pt-6 pb-4">
            <div className="space-y-3">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-bold text-slate-900">Evento (Qué ocurrió)</h3>
              </div>
              <Textarea
                id="evento-desc"
                value={currentEvent.evento}
                onChange={(e) => setCurrentEvent({ ...currentEvent, evento: e.target.value })}
                placeholder="Describa el evento relacionado con esta lección"
                rows={3}
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
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
            <Button type="button" variant="outline" onClick={() => setShowEventDialog(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={saveEvent}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={!currentEvent.evento.trim()}
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
