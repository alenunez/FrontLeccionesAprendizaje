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

  if (!estado || typeof estado !== "object") return ""

  const estadoData = (estado as { data?: { descripcion?: string; name?: string; value?: string } })?.data

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

  const estadoDescripcion = normalize(extractEstadoDescripcion(lesson))
  const isBorrador = estadoDescripcion === "borrador"
  const isEnRevision = estadoDescripcion === "en revision"
  const isPublicado = estadoDescripcion === "publicado" || estadoDescripcion === "publicada"

  const role = normalize(user.role)
  if (role === "administrador") return true

  const userEmail = getUserEmail(user)
  const autorEmail = getAutorEmail(lesson)
  const responsableEmail = getResponsableEmail(lesson)

  if (role === "colaborador") {
    return isBorrador && isSamePerson(userEmail, autorEmail)
  }

  if (role === "responsable") {
    if (isPublicado) return false

    if (isEnRevision && isSamePerson(userEmail, responsableEmail)) return true
    if (isBorrador && isSamePerson(userEmail, autorEmail)) return true

    return false
  }

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
  const isBorrador = estadoDescripcion === "borrador"
  const isEnRevision = estadoDescripcion === "en revision"
  const isPublicado = estadoDescripcion === "publicado" || estadoDescripcion === "publicada"

  const role = normalize(user.role)
  const isAdmin = role === "administrador"
  const isResponsableRole = role === "responsable"
  const isColaborador = role === "colaborador"

  const userEmail = getUserEmail(user)
  const autorEmail = getAutorEmail(lesson)
  const responsableEmail = getResponsableEmail(lesson)

  const isAuthor = isSamePerson(userEmail, autorEmail)
  const isResponsibleUser = isSamePerson(userEmail, responsableEmail)

  const actions = new Set<WorkflowAction>()

  if (isAdmin) {
    if (isBorrador) {
      actions.add("sendToReview")
      actions.add("publish")
    }

    if (isEnRevision) {
      actions.add("publish")
      actions.add("returnToDraft")
    }

    if (isPublicado) {
      actions.add("returnToDraft")
      actions.add("returnToReview")
    }
  }

  if (isColaborador && isAuthor && isBorrador) actions.add("sendToReview")

  if (isResponsableRole) {
    if (isPublicado) return []

    if (isEnRevision && isResponsibleUser) {
      actions.add("publish")
      actions.add("returnToDraft")
    }

    if (isBorrador && isAuthor) {
      actions.add("publish")
    }
  }

  if ((isPublicado || isEnRevision) && !isAdmin && !isResponsableRole) return []

  return WORKFLOW_ACTION_ORDER.filter((action) => actions.has(action))
}
