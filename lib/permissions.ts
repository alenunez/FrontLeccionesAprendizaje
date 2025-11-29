import type { ProyectoSituacionDto } from "@/types/lessons"
import type { SimulatedUser } from "./user-context"

export type WorkflowAction = "sendToReview" | "publish" | "returnToDraft" | "returnToReview"

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

const getUserEmail = (user: SimulatedUser): string => normalize(user.email)

const getAutorEmail = (lesson?: ProyectoSituacionDto | null): string =>
  normalize(lesson?.proyecto?.correoAutor ?? lesson?.proyecto?.nombreAutor ?? "")

const getResponsableEmail = (lesson?: ProyectoSituacionDto | null): string =>
  normalize(lesson?.proyecto?.correoResponsable ?? lesson?.proyecto?.nombreResponsable ?? "")

const isSamePerson = (first: string, second: string): boolean => Boolean(first) && first === second

export const canEditLesson = (lesson: ProyectoSituacionDto | null | undefined, user: SimulatedUser): boolean => {
  if (!lesson) return true
  if (normalize(user.role) === "administrador") return true

  const estadoDescripcion = normalize(extractEstadoDescripcion(lesson))
  const isBorrador = estadoDescripcion === "borrador"
  const isEnRevision = estadoDescripcion === "en revision"

  const userEmail = getUserEmail(user)
  const autorEmail = getAutorEmail(lesson)
  const responsableEmail = getResponsableEmail(lesson)

  if (isBorrador && isSamePerson(userEmail, autorEmail)) return true
  if (isEnRevision && isSamePerson(userEmail, responsableEmail)) return true

  return false
}

const WORKFLOW_ACTION_ORDER: WorkflowAction[] = ["publish", "sendToReview", "returnToDraft", "returnToReview"]

export const getWorkflowActions = (
  lesson: ProyectoSituacionDto | null | undefined,
  user: SimulatedUser,
  options?: { overrideEstado?: string },
): WorkflowAction[] => {
  if (!lesson?.proyecto?.id) return []

  const estadoDescripcion = normalize(options?.overrideEstado ?? extractEstadoDescripcion(lesson))

  const isAdmin = normalize(user.role) === "administrador"
  const isResponsableRole = normalize(user.role) === "responsable"
  const isColaborador = normalize(user.role) === "colaborador"

  const userEmail = getUserEmail(user)
  const autorEmail = getAutorEmail(lesson)
  const responsableEmail = getResponsableEmail(lesson)

  const isAuthor = isSamePerson(userEmail, autorEmail)
  const isResponsibleUser = isSamePerson(userEmail, responsableEmail)

  const actions = new Set<WorkflowAction>()

  if (isAdmin) {
    if (estadoDescripcion === "borrador") {
      actions.add("sendToReview")
      actions.add("publish")
    }

    if (estadoDescripcion === "en revision") {
      actions.add("publish")
      actions.add("returnToDraft")
    }

    if (estadoDescripcion === "publicado" || estadoDescripcion === "publicada") {
      actions.add("returnToReview")
    }
  }

  if (estadoDescripcion === "borrador") {
    if (isAuthor && isResponsableRole) {
      actions.add("publish")
    } else if (isAuthor && isColaborador) {
      actions.add("sendToReview")
    }
  }

  if (estadoDescripcion === "en revision" && isResponsableRole && isResponsibleUser) {
    actions.add("publish")
    actions.add("returnToDraft")
  }

  if (estadoDescripcion === "publicado" && isAdmin) {
    actions.add("returnToReview")
  }

  if (estadoDescripcion === "borrador" && isAuthor && (isResponsableRole || isAdmin)) {
    actions.delete("sendToReview")
    actions.add("publish")
  }

  return WORKFLOW_ACTION_ORDER.filter((action) => actions.has(action))
}
