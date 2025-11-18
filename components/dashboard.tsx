"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Plus, Search, Filter, Eye, BarChart3, Presentation } from "lucide-react"
import { LessonForm } from "./lesson-form"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("lessons")
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [workflowFilter, setWorkflowFilter] = useState<string | null>(null)

  const handleGeneratePPTX = (lesson: any) => {
    // Simulate PPTX generation
    console.log(`Generando presentación PPTX para: ${lesson.title}`)

    // Create a simple notification or download simulation
    const link = document.createElement("a")
    link.href = "#"
    link.download = `${lesson.id}_${lesson.title.replace(/\s+/g, "_")}.pptx`

    // Show a success message
    alert(`Generando presentación PPTX para: "${lesson.title}"\nArchivo: ${lesson.id}_presentacion.pptx`)
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
    { name: "María González", value: 28, color: "#3b82f6" },
    { name: "Carlos Ruiz", value: 22, color: "#10b981" },
    { name: "Ana López", value: 19, color: "#f59e0b" },
    { name: "Juan Pérez", value: 16, color: "#ef4444" },
    { name: "Luis Martín", value: 12, color: "#8b5cf6" },
  ]

  const lessonsByCompany = [
    { compania: "Acme Corp", lecciones: 45 },
    { compania: "Tech Solutions", lecciones: 38 },
    { compania: "Global Industries", lecciones: 32 },
    { compania: "Innovation Labs", lecciones: 28 },
    { compania: "Future Systems", lecciones: 24 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <header className="border-b bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-600 rounded-xl">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 text-balance">
                  Sistema de Gestión de Lecciones Aprendidas
                </h1>
                <p className="text-slate-600 font-medium">Sistema de gestión del conocimiento organizacional</p>
              </div>
            </div>
            <Button onClick={() => setShowForm(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg">
              <Plus className="h-4 w-4" />
              Nueva Lección
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 bg-white shadow-sm border">
            <TabsTrigger
              value="lessons"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Lecciones
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analíticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lessons">
            <div className="space-y-8">
              <div className="flex gap-4 items-start">
                {/* Búsqueda Rápida */}
                <Card className="shadow-sm border-0 bg-white/70 backdrop-blur-sm flex-1">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Search className="h-5 w-5 text-blue-600" />
                      </div>
                      Búsqueda Rápida
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <Input
                        placeholder="Buscar Proyecto o situación"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-slate-200 hover:bg-blue-50 bg-transparent"
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Estados del Flujo de Trabajo - Compact version */}
                <Card className="shadow-sm border-0 bg-white/70 backdrop-blur-sm">
                  <CardContent className="p-3">
                    <div className="flex gap-2">
                      {[
                        {
                          status: "Borrador",
                          count: 5,
                          color: "bg-slate-100 hover:bg-slate-200 border-slate-300",
                          textColor: "text-slate-700",
                          icon: "📝",
                        },
                        {
                          status: "En Revisión",
                          count: 3,
                          color: "bg-amber-100 hover:bg-amber-200 border-amber-300",
                          textColor: "text-amber-700",
                          icon: "👀",
                        },
                        {
                          status: "Publicada",
                          count: 24,
                          color: "bg-green-100 hover:bg-green-200 border-green-300",
                          textColor: "text-green-700",
                          icon: "🚀",
                        },
                      ].map((stage) => (
                        <Button
                          key={stage.status}
                          variant="outline"
                          size="sm"
                          className={`${stage.color} ${stage.textColor} border px-3 py-1 h-auto flex flex-col items-center gap-0.5 min-w-[70px] transition-all`}
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
              <Card className="shadow-sm border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Gestión de Lecciones
                    {workflowFilter && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
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
                    {[
                      {
                        id: "LA-2024-004",
                        projectOrSituation: "Implementación de SAP en planta de manufactura",
                        status: "Borrador",
                        responsable: "María González",
                        fecha: "2024-01-15",
                        proceso: "Gestión de Proyectos",
                        compania: "Acme Manufacturing",
                        sede: "Planta Norte - Monterrey",
                      },
                      {
                        id: "LA-2024-005",
                        projectOrSituation: "Construcción de centro de distribución regional",
                        status: "En Revisión",
                        responsable: "Carlos Ruiz",
                        fecha: "2024-02-03",
                        proceso: "Infraestructura TI",
                        compania: "Logistics Corp",
                        sede: "Centro - Guadalajara",
                      },
                      {
                        id: "LA-2024-006",
                        projectOrSituation: "Desarrollo de aplicación móvil para ventas",
                        status: "Publicada",
                        responsable: "Ana López",
                        fecha: "2024-01-28",
                        proceso: "Desarrollo de Software",
                        compania: "Tech Solutions",
                        sede: "Oficina Principal - CDMX",
                      },
                      {
                        id: "LA-2024-001",
                        projectOrSituation: "Actualización de infraestructura de red corporativa",
                        status: "Publicada",
                        responsable: "Juan Pérez",
                        fecha: "2024-01-10",
                        proceso: "Infraestructura TI",
                        compania: "Global Industries",
                        sede: "Campus Corporativo - Querétaro",
                      },
                      {
                        id: "LA-2024-007",
                        projectOrSituation: "Capacitación en metodologías ágiles para equipos remotos",
                        status: "Publicada",
                        responsable: "Luis Martín",
                        fecha: "2024-02-12",
                        proceso: "Recursos Humanos",
                        compania: "Innovation Labs",
                        sede: "Remoto - Múltiples ubicaciones",
                      },
                      {
                        id: "LA-2024-008",
                        projectOrSituation: "Integración de sistema de gestión de calidad ISO 9001",
                        status: "Publicada",
                        responsable: "Patricia Sánchez",
                        fecha: "2024-01-22",
                        proceso: "Gestión de Calidad",
                        compania: "Quality Systems Inc",
                        sede: "Planta Sur - Puebla",
                      },
                    ]
                      .filter((lesson) => !workflowFilter || lesson.status === workflowFilter)
                      .map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-start justify-between p-5 border border-slate-200 rounded-xl bg-white hover:shadow-md transition-all duration-200 gap-4"
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
                            <div className="grid grid-cols-3 gap-x-6 gap-y-3 pt-2">
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
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                lesson.status === "Publicada"
                                  ? "default"
                                  : lesson.status === "En Revisión"
                                    ? "secondary"
                                    : "outline"
                              }
                              className={
                                lesson.status === "Publicada"
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : lesson.status === "En Revisión"
                                    ? "bg-amber-100 text-amber-800 border-amber-200"
                                    : "bg-slate-100 text-slate-800 border-slate-200"
                              }
                            >
                              {lesson.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:bg-orange-50 text-orange-600 hover:text-orange-700"
                              onClick={() => handleGeneratePPTX(lesson)}
                              title="Generar presentación PPTX"
                            >
                              <Presentation className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="hover:bg-blue-50">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-8">
              <Card className="shadow-sm border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-green-600" />
                    </div>
                    Analíticas del Repositorio
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Visualización de métricas y tendencias del sistema de lecciones aprendidas
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Eventos por Proyecto */}
              <Card className="shadow-sm border-0 bg-white/70 backdrop-blur-sm">
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
                        <Bar dataKey="eventos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Lecciones por Proyecto */}
              <Card className="shadow-sm border-0 bg-white/70 backdrop-blur-sm">
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
                        <Bar dataKey="lecciones" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lecciones por Líder del Proyecto */}
                <Card className="shadow-sm border-0 bg-white/70 backdrop-blur-sm">
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
                            fill="#8884d8"
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
                <Card className="shadow-sm border-0 bg-white/70 backdrop-blur-sm">
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
                          <Bar dataKey="lecciones" fill="#f59e0b" radius={[0, 4, 4, 0]} />
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
      {showForm && <LessonForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
