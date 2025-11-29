"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProyectoSituacionDto } from "@/types/lessons"
import { flattenEventoDto } from "@/lib/event-normalizer"
import {
  CalendarDays,
  Lock,
  MapPin,
  ShieldCheck,
  UserCircle2,
  Users,
  X,
} from "lucide-react"

interface LessonViewerProps {
  lesson: ProyectoSituacionDto
  onClose: () => void
}

interface NormalizedEntity {
  id: string
  descripcion: string
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

const safeText = (value?: string | null): string => {
  if (!value) return "Sin información"
  return value.trim() === "" ? "Sin información" : value
}

const normalizeEntities = (entities: NormalizedEntity[]): NormalizedEntity[] =>
  entities.map((entity) => ({
    ...entity,
    id: String(entity.id),
    descripcion: safeText(entity.descripcion ?? String(entity.id)),
  }))

const getRelatedDescriptions = (ids: string[] | undefined, dataset: NormalizedEntity[]): string[] => {
  if (!ids || ids.length === 0) return []

  const normalizedIds = ids.map(String)

  return normalizedIds.map((id) => dataset.find((item) => item.id === id)?.descripcion ?? `ID: ${id}`)
}

const normalizeAccessLevel = (value: unknown): "Público" | "Privado" | null => {
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

  return null
}

export function LessonViewer({ lesson, onClose }: LessonViewerProps) {
  const proyecto = lesson.proyecto ?? {}
  const eventos = lesson.eventos ?? []
  const normalizedAccess = normalizeAccessLevel(proyecto.isPrivate)
  const privacyLabel = normalizedAccess ?? "No especificado"
  const lectores = lesson.lectores ?? []
  const responsableNombre = safeText(proyecto.nombreResponsable ?? proyecto.nombreAutor ?? undefined)
  const autorNombre = safeText(proyecto.nombreAutor ?? proyecto.nombreResponsable ?? undefined)
  const lectorNames = lectores.map((lector) => lector.nombreLector).filter((name): name is string => Boolean(name))
  const lectoresLabel = lectorNames.length ? lectorNames.join(", ") : "Sin lectores"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-hidden border border-emerald-100 shadow-2xl break-words">
        <CardHeader className="flex flex-row items-center justify-between gap-4 bg-gradient-to-r from-[#067138] via-[#0fa958] to-[#45a06c] text-white">
          <div>
            <CardTitle className="text-xl font-semibold text-white">Visualización del Proyecto</CardTitle>
            <CardDescription className="text-emerald-50">
              Consulta los detalles completos del proyecto o situación y sus eventos asociados.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-10 overflow-y-auto bg-gradient-to-b from-[#f4fff9] via-white to-[#f0fbf4] p-8">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-3xl border border-emerald-100 bg-white/80 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#067138]/70">Proyecto o situación</p>
              <h2 className="text-2xl font-semibold text-slate-900 break-words">{safeText(proyecto.descripcion)}</h2>
              <p className="text-sm text-slate-600 break-words">{safeText(proyecto.aplicacionPractica)}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[{
                label: "Estado",
                value: safeText(proyecto.estado?.data?.descripcion ?? undefined),
                icon: <ShieldCheck className="h-4 w-4" />,
              },
              {
                label: "Responsable",
                value: responsableNombre,
                icon: <UserCircle2 className="h-4 w-4" />,
              },
              {
                label: "Autor",
                value: autorNombre,
                icon: <UserCircle2 className="h-4 w-4" />,
              },
              {
                label: "Fecha",
                value: formatDate(proyecto.fecha),
                icon: <CalendarDays className="h-4 w-4" />,
              },
              {
                label: "Proceso",
                value: safeText(proyecto.proceso?.data?.nombre ?? undefined),
                icon: <MapPin className="h-4 w-4" />,
              },
              {
                label: "Compañía",
                value: safeText(proyecto.sede?.data?.compania?.data?.nombre ?? undefined),
                icon: <MapPin className="h-4 w-4" />,
              },
              {
                label: "Sede",
                value: safeText(proyecto.sede?.data?.nombre ?? undefined),
                icon: <MapPin className="h-4 w-4" />,
              },
              {
                label: "Nivel de acceso",
                value: privacyLabel,
                icon: <Lock className="h-4 w-4" />,
              },
              {
                label: "Lectores asignados",
                value: lectoresLabel,
                icon: <Users className="h-4 w-4" />,
              }].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-emerald-50 bg-white/80 p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {item.icon}
                    {item.label}
                  </div>
                  <p className="mt-2 text-base font-medium text-slate-900 break-words">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#067138]/70">Eventos</p>
                <h3 className="text-xl font-semibold text-slate-900">Contexto de aprendizaje</h3>
                <p className="text-sm text-slate-600">Visualiza lo que ocurrió, sus impactos y las acciones tomadas.</p>
              </div>
              <Badge className="rounded-full bg-[#e0f3e8] text-[#067138]">
                {eventos.length} evento{eventos.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {eventos.length === 0 && (
              <div className="rounded-3xl border border-dashed border-emerald-200 bg-white/70 p-6 text-center text-sm text-slate-500">
                No se registran eventos para este proyecto.
              </div>
            )}

            {eventos.map((eventoDto, index) => {
              const flattened = flattenEventoDto(eventoDto, index)

              const impactos = normalizeEntities(
                (flattened.impactos ?? []).map((impacto, impactoIndex) => ({
                  id: impacto.impacto?.identificador ?? impacto.impacto?.id ?? `impacto-${impactoIndex}`,
                  descripcion:
                    impacto.impacto?.descripcion ?? (impacto.impacto as { titulo?: string })?.titulo ?? "Sin descripción",
                })),
              )

              const acciones = normalizeEntities(
                (flattened.acciones ?? []).map((accion, accionIndex) => ({
                  id: accion.accion?.identificador ?? accion.accion?.id ?? `accion-${accionIndex}`,
                  descripcion:
                    accion.accion?.descripcion ?? (accion.accion as { titulo?: string })?.titulo ?? "Sin descripción",
                })),
              )

              const resultados = normalizeEntities(
                (flattened.resultados ?? []).map((resultado, resultadoIndex) => ({
                  id: resultado.resultado?.identificador ?? resultado.resultado?.id ?? `resultado-${resultadoIndex}`,
                  descripcion:
                    resultado.resultado?.descripcion ??
                    (resultado.resultado as { titulo?: string })?.titulo ??
                    "Sin descripción",
                })),
              )

              const lecciones = normalizeEntities(
                (flattened.lecciones ?? []).map((leccion, leccionIndex) => ({
                  id:
                    (leccion.leccion as { identificador?: string })?.identificador ??
                    leccion.leccion?.id ??
                    `leccion-${leccionIndex}`,
                  descripcion:
                    leccion.leccion?.descripcion ?? (leccion.leccion as { titulo?: string })?.titulo ?? "Sin descripción",
                })),
              )

              return (
                <div key={`evento-${index}`} className="space-y-4 rounded-3xl border border-emerald-100 bg-white/80 p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Evento #{index + 1}</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {safeText(eventoDto.evento?.descripcion ?? eventoDto.evento?.titulo)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full border-emerald-200 text-[#067138]">
                        {impactos.length} impacto{impactos.length === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-emerald-200 text-[#067138]">
                        {acciones.length} acción{acciones.length === 1 ? "" : "es"}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-emerald-200 text-[#067138]">
                        {resultados.length} resultado{resultados.length === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-emerald-200 text-[#067138]">
                        {lecciones.length} lección{lecciones.length === 1 ? "" : "es"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-4">
                    <EventColumn
                      title="Impactos"
                      subtitle="Cómo nos afectó"
                      items={flattened.impactos?.map((impacto, impactoIndex) => ({
                        id: String(impacto.impacto?.identificador ?? impacto.impacto?.id ?? `impacto-${impactoIndex}`),
                        descripcion: safeText(
                          impacto.impacto?.descripcion ?? (impacto.impacto as { titulo?: string })?.titulo,
                        ),
                        relations: getRelatedDescriptions(impacto.accionIds, acciones),
                        relationLabel: "Acciones relacionadas",
                      })) ?? []}
                    />
                    <EventColumn
                      title="Acciones implementadas"
                      subtitle="Qué se ejecutó"
                      items={flattened.acciones?.map((accion, accionIndex) => ({
                        id: String(accion.accion?.identificador ?? accion.accion?.id ?? `accion-${accionIndex}`),
                        descripcion: safeText(
                          accion.accion?.descripcion ?? (accion.accion as { titulo?: string })?.titulo,
                        ),
                        relations: [
                          ...getRelatedDescriptions(accion.impactoIds, impactos).map((value) => `Impacto: ${value}`),
                          ...getRelatedDescriptions(accion.resultadoIds, resultados).map((value) => `Resultado: ${value}`),
                        ],
                        relationLabel: "Relaciones",
                      })) ?? []}
                    />
                    <EventColumn
                      title="Resultados"
                      subtitle="Efecto de las acciones"
                      items={flattened.resultados?.map((resultado, resultadoIndex) => ({
                        id: String(
                          resultado.resultado?.identificador ??
                            resultado.resultado?.id ??
                            `resultado-${resultadoIndex}`,
                        ),
                        descripcion: safeText(
                          resultado.resultado?.descripcion ?? (resultado.resultado as { titulo?: string })?.titulo,
                        ),
                        relations: [
                          ...getRelatedDescriptions(resultado.accionIds, acciones).map((value) => `Acción: ${value}`),
                          ...getRelatedDescriptions(resultado.leccionIds, lecciones).map((value) => `Lección: ${value}`),
                        ],
                        relationLabel: "Relaciones",
                      })) ?? []}
                    />
                    <EventColumn
                      title="Lecciones aprendidas"
                      subtitle="Qué se aprendió"
                      items={flattened.lecciones?.map((leccion, leccionIndex) => ({
                        id: String(
                          (leccion.leccion as { identificador?: string })?.identificador ??
                            leccion.leccion?.id ??
                            `leccion-${leccionIndex}`,
                        ),
                        descripcion: safeText(
                          leccion.leccion?.descripcion ?? (leccion.leccion as { titulo?: string })?.titulo,
                        ),
                        relations: getRelatedDescriptions(leccion.resultadoIds, resultados).map((value) => `Resultado: ${value}`),
                        relationLabel: "Resultados relacionados",
                      })) ?? []}
                    />
                  </div>
                </div>
              )
            })}
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

interface EventColumnProps {
  title: string
  subtitle: string
  items: {
    id: string
    descripcion: string
    relations?: string[]
    relationLabel?: string
  }[]
}

function EventColumn({ title, subtitle, items }: EventColumnProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-emerald-50 bg-[#f8fdf9] p-4 shadow-inner">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#067138]/70">{subtitle}</p>
        <h4 className="text-base font-semibold text-slate-900">{title}</h4>
      </div>
      {items.length === 0 && <p className="text-sm text-slate-500">Sin información disponible.</p>}
      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id} className="rounded-2xl border border-emerald-100 bg-white/80 p-3 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">#{index + 1}</div>
              <p className="text-sm font-medium text-slate-900 break-words">{item.descripcion}</p>
              {item.relations && item.relations.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-slate-500">
                    {item.relationLabel ?? "Relaciones"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {item.relations.map((relation, relationIndex) => (
                      <Badge
                        key={`${item.id}-${relation}-${relationIndex}`}
                        variant="outline"
                        className="rounded-full border-emerald-200 text-[11px] text-[#067138] break-words whitespace-normal"
                      >
                        {relation}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
