export interface ProyectoSituacionDto {
  proyecto?: {
    id?: string
    fecha?: string
    descripcion?: string
    aplicacionPractica?: string
    isPrivate?: boolean
    estado?: { data?: { descripcion?: string | null; isActive?: boolean } }
    responsable?: RemoteUser
    autor?: RemoteUser
    sede?: { data?: { nombre?: string | null; compania?: { data?: { nombre?: string | null } } } }
    proceso?: { data?: { nombre?: string | null; descripcion?: string | null } }
  }
  lectores?: RemoteUser[]
  eventos?: ProyectoSituacionEventoDto[]
}

export interface RemoteUser {
  id?: number | string
  value?: string | null
  nombre?: string | null
  oid?: string | null
  correo?: string | null
  userPrincipalName?: string | null
}

export interface ProyectoSituacionEventoDto {
  evento?: {
    id?: string
    descripcion?: string | null
  }
  impactos?: ProyectoSituacionImpactoDto[]
  acciones?: ProyectoSituacionAccionDto[]
  resultados?: ProyectoSituacionResultadoDto[]
  lecciones?: ProyectoSituacionLeccionDto[]
}

export interface ProyectoSituacionImpactoDto {
  impacto?: { id?: string; descripcion?: string | null; identificador?: string | null }
  accionIds?: string[]
}

export interface ProyectoSituacionAccionDto {
  accion?: { id?: string; descripcion?: string | null; identificador?: string | null }
  impactoIds?: string[]
  resultadoIds?: string[]
}

export interface ProyectoSituacionResultadoDto {
  resultado?: { id?: string; descripcion?: string | null; identificador?: string | null }
  accionIds?: string[]
  leccionIds?: string[]
}

export interface ProyectoSituacionLeccionDto {
  leccion?: { id?: string; descripcion?: string | null }
  resultadoIds?: string[]
}
