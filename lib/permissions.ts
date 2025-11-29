import type { ProyectoSituacionDto } from "@/types/lessons"
import type { SimulatedUser } from "./user-context"

const normalize = (value?: string | null): string => {
  if (!value) return ""
  return value
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

const extractEstadoDescripcion = (lesson?: ProyectoSituacionDto | null): string => {
  const estado = lesson?.proyecto?.estado
  const estadoData = typeof estado === "object" ? (estado as { data?: { descripcion?: string; name?: string; value?: string } }) : undefined
  const descripcion =
    estadoData?.descripcion ??
    estadoData?.name ??
    estadoData?.value ??
    (estado as { descripcion?: string; name?: string; value?: string })?.descripcion ??
    (estado as { name?: string; value?: string })?.name ??
    (estado as { value?: string })?.value ??
    ""

  return descripcion ?? ""
}

export const canEditLesson = (lesson: ProyectoSituacionDto | null | undefined, user: SimulatedUser): boolean => {
  if (!lesson) return true
  if (normalize(user.role) === "administrador") return true

  const estadoDescripcion = normalize(extractEstadoDescripcion(lesson))
  const isBorrador = estadoDescripcion === "borrador"
  const isEnRevision = estadoDescripcion === "en revision"

  const userEmail = normalize(user.email)
  const autorEmail = normalize(lesson.proyecto?.correoAutor ?? lesson.proyecto?.nombreAutor ?? "")
  const responsableEmail = normalize(lesson.proyecto?.correoResponsable ?? lesson.proyecto?.nombreResponsable ?? "")

  if (isBorrador && userEmail && userEmail === autorEmail) return true
  if (isEnRevision && userEmail && userEmail === responsableEmail) return true

  return false
}
