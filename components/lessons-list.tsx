"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Edit, Filter, Clock, User, FolderOpen } from "lucide-react"

interface LessonsListProps {
  searchQuery: string
}

export function LessonsList({ searchQuery }: LessonsListProps) {
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  const lessons = [
    {
      id: "LA-2024-001",
      title: "Gestión de proveedores en proyectos SAP",
      description: "Lecciones sobre la selección y gestión de proveedores especializados en implementaciones SAP",
      category: "Tecnología",
      impact: "Alto",
      severity: "Alto",
      date: "2024-01-15",
      status: "Publicado",
      owner: "Juan Pérez",
      project: "SAP S/4HANA Implementation",
      applicability: "Alta",
    },
    {
      id: "LA-2024-002",
      title: "Comunicación con stakeholders en crisis",
      description: "Estrategias efectivas de comunicación durante situaciones de crisis del proyecto",
      category: "Comunicación",
      impact: "Crítico",
      severity: "Crítico",
      date: "2024-01-12",
      status: "Aprobada",
      owner: "María García",
      project: "Transformación Digital",
      applicability: "Alta",
    },
    {
      id: "LA-2024-003",
      title: "Optimización de procesos de calidad",
      description: "Mejoras implementadas en los procesos de control de calidad",
      category: "Calidad",
      impact: "Medio",
      severity: "Medio",
      date: "2024-01-10",
      status: "En Revisión",
      owner: "Carlos López",
      project: "Mejora Continua Q1",
      applicability: "Media",
    },
    {
      id: "LA-2024-004",
      title: "Gestión de riesgos en desarrollo ágil",
      description: "Identificación temprana y mitigación de riesgos en metodologías ágiles",
      category: "Riesgo",
      impact: "Alto",
      severity: "Alto",
      date: "2024-01-08",
      status: "Borrador",
      owner: "Ana Martínez",
      project: "Desarrollo App Mobile",
      applicability: "Alta",
    },
    {
      id: "LA-2024-005",
      title: "Capacitación de usuarios finales",
      description: "Estrategias efectivas para la adopción de nuevas tecnologías",
      category: "Personas",
      impact: "Medio",
      severity: "Medio",
      date: "2024-01-05",
      status: "Publicado",
      owner: "Roberto Silva",
      project: "CRM Implementation",
      applicability: "Alta",
    },
  ]

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === "all" || lesson.category === filterCategory
    const matchesStatus = filterStatus === "all" || lesson.status === filterStatus

    return matchesSearch && matchesCategory && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Publicado":
        return "bg-green-100 text-green-800 border-green-200"
      case "Aprobada":
        return "bg-[color:var(--brand-soft)] text-[color:var(--brand-primary)] border-[color:var(--brand-soft)]"
      case "En Revisión":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "Borrador":
        return "bg-slate-100 text-slate-800 border-slate-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Crítico":
        return "destructive"
      case "Alto":
        return "default"
      case "Medio":
        return "secondary"
      case "Bajo":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-8">
      <Card className="border border-emerald-50 bg-white/80 shadow-sm backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="rounded-lg bg-[color:var(--brand-soft)] p-2">
              <Filter className="h-5 w-5 text-[color:var(--brand-primary)]" />
            </div>
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Categoría</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="border-slate-200 focus:border-[color:var(--brand-primary)] focus:ring-[color:var(--brand-primary)]/30">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="Tecnología">Tecnología</SelectItem>
                  <SelectItem value="Comunicación">Comunicación</SelectItem>
                  <SelectItem value="Calidad">Calidad</SelectItem>
                  <SelectItem value="Riesgo">Riesgo</SelectItem>
                  <SelectItem value="Personas">Personas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Estado</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="border-slate-200 focus:border-[color:var(--brand-primary)] focus:ring-[color:var(--brand-primary)]/30">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Borrador">Borrador</SelectItem>
                  <SelectItem value="En Revisión">En Revisión</SelectItem>
                  <SelectItem value="Aprobada">Aprobada</SelectItem>
                  <SelectItem value="Publicado">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterCategory("all")
                  setFilterStatus("all")
                }}
                className="w-full rounded-full border-[color:var(--brand-border)] text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-soft)]"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[color:var(--brand-soft)] bg-white/80 shadow-sm backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Lecciones Aprendidas</CardTitle>
          <CardDescription className="text-slate-600">
            {filteredLessons.length} de {lessons.length} lecciones encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-2xl border border-[color:var(--brand-soft)] bg-white/90 p-6 transition-all duration-200 hover:border-[color:var(--brand-primary)]/50 hover:shadow-lg"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-bold text-lg text-slate-900 text-balance">{lesson.title}</h3>
                      <Badge
                        variant="outline"
                        className="rounded-full border-[color:var(--brand-soft)] bg-[color:var(--brand-soft)] text-[color:var(--brand-primary)] font-medium"
                      >
                        {lesson.category}
                      </Badge>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-pretty">{lesson.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="font-semibold text-slate-700">{lesson.id}</span>
                      <span className="flex items-center gap-1">
                        <FolderOpen className="h-3 w-3" />
                        {lesson.project}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {lesson.owner}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {lesson.date}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:ml-4">
                    <Button variant="ghost" size="sm" className="text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-soft)]">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-soft)]">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="default" className={getStatusColor(lesson.status)}>
                      {lesson.status}
                    </Badge>
                    <Badge variant={getSeverityColor(lesson.severity)} className="font-medium">
                      Impacto: {lesson.severity}
                    </Badge>
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                      Aplicabilidad: {lesson.applicability}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
