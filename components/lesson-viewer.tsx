"use client"

import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProyectoSituacionDto } from "@/types/lessons"
import { flattenEventoDto } from "@/lib/event-normalizer"
import {
  CalendarDays,
  Download,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
  UserCircle2,
  Users,
  X,
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL 

interface LessonViewerProps {
  lesson: ProyectoSituacionDto
  onClose: () => void
}

interface NormalizedEntity {
  id: string
  descripcion: string
  lookupIds?: string[]
}

interface NormalizableEntity {
  id: string | number
  descripcion: string
  lookupIds?: (string | number | undefined)[]
}

interface ProyectoAdjunto {
  id?: number
  idAdjunto?: number
  proyectoSituacionId?: number
  nombreArchivo?: string
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

const normalizeEntities = (entities: NormalizableEntity[]): NormalizedEntity[] =>
  entities.map((entity) => {
    const lookupIds = new Set<string>()
    const addId = (value: string | number | undefined) => {
      if (value !== undefined && value !== null) {
        lookupIds.add(String(value))
      }
    }

    addId(entity.id)
    entity.lookupIds?.forEach(addId)

    return {
      ...entity,
      id: String(entity.id),
      descripcion: safeText(entity.descripcion),
      lookupIds: Array.from(lookupIds),
    }
  })

const getRelatedDescriptions = (ids: (string | number)[] | undefined, dataset: NormalizedEntity[]): string[] => {
  if (!ids || ids.length === 0) return []

  const lookupMap = new Map<string, string>()
  const seen = new Set<string>()

  dataset.forEach((item, index) => {
    const candidateIds = [
      item.id,
      ...(item.lookupIds ?? []),
      String(index + 1),
      String(index),
    ].map((value) => String(value).trim())

    candidateIds.forEach((candidateId) => {
      if (!lookupMap.has(candidateId)) {
        lookupMap.set(candidateId, item.descripcion)
      }
    })
  })

  return ids.reduce<string[]>((matches, rawId) => {
    const normalizedId = String(rawId ?? "").trim()
    if (!normalizedId) return matches

    const description = lookupMap.get(normalizedId)
    if (!description || seen.has(description)) return matches

    seen.add(description)
    matches.push(description)
    return matches
  }, [])
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
  const { session } = useAuth()
  const authHeaders = useMemo<HeadersInit>(
    () => (session?.accessToken ? { Authorization: `${session.tokenType ?? "Bearer"} ${session.accessToken}` } : {}),
    [session?.accessToken, session?.tokenType],
  )

  const [attachments, setAttachments] = useState<ProyectoAdjunto[]>([])
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false)
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null)
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | string | null>(null)

  useEffect(() => {
    if (!proyecto.id) return

    const controller = new AbortController()

    const fetchAttachments = async () => {
      setIsLoadingAttachments(true)
      setAttachmentsError(null)
      try {
        const response = await fetch(`${API_BASE_URL}/Adjuntos/proyecto/${proyecto.id}`, {
          signal: controller.signal,
          headers: authHeaders,
        })
        if (!response.ok) {
          throw new Error("No fue posible cargar los adjuntos.")
        }
        const data = await response.json()
        setAttachments(Array.isArray(data) ? data : [])
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        console.error("Error al cargar adjuntos", error)
        setAttachmentsError("No fue posible cargar los adjuntos.")
        setAttachments([])
      } finally {
        setIsLoadingAttachments(false)
      }
    }

    fetchAttachments()

    return () => controller.abort()
  }, [authHeaders, proyecto.id])

  const handleDownload = async (attachment: ProyectoAdjunto) => {
    const downloadId = attachment.id ?? attachment.idAdjunto
    if (!downloadId) {
      alert("El adjunto seleccionado no tiene un identificador disponible para descargar.")
      return
    }

    setDownloadingAttachmentId(downloadId)
    try {
      const response = await fetch(`${API_BASE_URL}/Adjuntos/${downloadId}/archivo`, { headers: authHeaders })
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
      alert("No se pudo descargar el adjunto. Inténtalo nuevamente.")
    } finally {
      setDownloadingAttachmentId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-3 py-6 sm:px-4 sm:py-8">
      <Card className="w-full max-w-6xl max-h-[calc(100vh-2rem)] sm:max-h-[95vh] rounded-3xl border border-emerald-100 shadow-2xl break-words flex flex-col overflow-hidden text-[15px] leading-relaxed sm:text-base pt-0">
        <CardHeader className="sticky top-0 z-20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-[#0b7c4a] via-[#199a59] to-[#3f8f68] px-4 py-4 sm:px-6 sm:py-5 text-white shadow-md rounded-none sm:rounded-b-2xl">
          <div className="space-y-0.5">
            <CardTitle className="text-xl font-bold text-white">Visualización del Proyecto</CardTitle>
            <CardDescription className="text-sm text-emerald-50 sm:text-base">
              Consulta los detalles completos del proyecto o situación y sus eventos asociados.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-auto h-9 w-9 rounded-full bg-white/10 text-white shadow-sm transition hover:bg-white/20 sm:ml-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-10 bg-gradient-to-b from-[#f4fff9] via-white to-[#f0fbf4] p-6 sm:p-8 flex-1 overflow-y-auto">
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
                  lookupIds: [impacto.impacto?.id, impacto.impacto?.identificador],
                })),
              )

              const acciones = normalizeEntities(
                (flattened.acciones ?? []).map((accion, accionIndex) => ({
                  id: accion.accion?.identificador ?? accion.accion?.id ?? `accion-${accionIndex}`,
                  descripcion:
                    accion.accion?.descripcion ?? (accion.accion as { titulo?: string })?.titulo ?? "Sin descripción",
                  lookupIds: [accion.accion?.id, accion.accion?.identificador],
                })),
              )

              const resultados = normalizeEntities(
                (flattened.resultados ?? []).map((resultado, resultadoIndex) => ({
                  id: resultado.resultado?.identificador ?? resultado.resultado?.id ?? `resultado-${resultadoIndex}`,
                  descripcion:
                    resultado.resultado?.descripcion ??
                    (resultado.resultado as { titulo?: string })?.titulo ??
                    "Sin descripción",
                  lookupIds: [resultado.resultado?.id, resultado.resultado?.identificador],
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
                  lookupIds: [
                    (leccion.leccion as { identificador?: string | number })?.identificador,
                    leccion.leccion?.id,
                  ],
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

          <section className="space-y-4 rounded-3xl border border-emerald-100 bg-white/80 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#067138]/70">Adjuntos</p>
                <h3 className="text-xl font-semibold text-slate-900">Archivos relacionados</h3>
                <p className="text-sm text-slate-600">
                  Consulta y descarga los archivos asociados a este proyecto o situación.
                </p>
              </div>
              <Badge className="rounded-full bg-[#e0f3e8] text-[#067138]">
                {attachments.length} adjunto{attachments.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {attachmentsError && <p className="text-sm text-red-600">{attachmentsError}</p>}

            {isLoadingAttachments && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-[#067138]" />
                Cargando adjuntos...
              </div>
            )}

            {!isLoadingAttachments && attachments.length === 0 && !attachmentsError && (
              <p className="text-sm text-slate-500">No hay adjuntos disponibles para este proyecto.</p>
            )}

            {attachments.length > 0 && (
              <div className="space-y-3">
                {attachments.map((attachment, index) => {
                  const downloadKey = attachment.id ?? attachment.idAdjunto ?? index
                  return (
                    <div
                      key={downloadKey}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-50 bg-[#f8fdf9] p-4 shadow-inner"
                    >
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-medium text-slate-900 break-words">
                          {attachment.nombreArchivo ?? "Archivo sin nombre"}
                        </p>
                        <p className="text-xs text-slate-500">
                          ID de descarga: {attachment.id ?? attachment.idAdjunto ?? "N/D"}
                        </p>
                      </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 border-[#8fd0ab] text-[#065f46] hover:bg-[#e0f3e8]"
                    onClick={() => handleDownload(attachment)}
                    disabled={downloadingAttachmentId === downloadKey}
                  >
                    {downloadingAttachmentId === downloadKey ? (
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
                </div>
              )
            })}
              </div>
            )}
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
