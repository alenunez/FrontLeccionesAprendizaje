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
        return "bg-[#e0f3e8] text-[#067138] border-emerald-200"
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
            <div className="rounded-lg bg-[#e0f3e8] p-2">
              <Filter className="h-5 w-5 text-[#067138]" />
            </div>
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Categoría</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30">
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
                <SelectTrigger className="border-slate-200 focus:border-[#067138] focus:ring-[#067138]/30">
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
                className="w-full rounded-full border-[#8fd0ab] text-[#067138] hover:bg-[#e0f3e8]"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-emerald-50 bg-white/80 shadow-sm backdrop-blur-sm">
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
                className="rounded-2xl border border-emerald-100 bg-white/90 p-6 transition-all duration-200 hover:border-[#067138]/40 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-lg text-slate-900 text-balance">{lesson.title}</h3>
                      <Badge variant="outline" className="rounded-full border-emerald-200 bg-[#e0f3e8] text-[#067138] font-medium">
                        {lesson.category}
                      </Badge>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{lesson.description}</p>
                    <div className="flex items-center gap-6 text-sm text-slate-500">
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
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="sm" className="text-[#067138] hover:bg-[#e0f3e8]">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-[#067138] hover:bg-[#e0f3e8]">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3 flex-wrap">
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
