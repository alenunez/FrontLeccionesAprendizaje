export interface ProyectoSituacionDto {
  proyecto?: {
    id?: string
    fecha?: string
    descripcion?: string
    aplicacionPractica?: string
    isPrivate?: boolean
    estado?: { data?: { descripcion?: string | null; isActive?: boolean } }
    nombreResponsable?: string | null
    correoResponsable?: string | null
    nombreAutor?: string | null
    correoAutor?: string | null
    sede?: { data?: { nombre?: string | null; compania?: { data?: { nombre?: string | null } } } }
    proceso?: { data?: { nombre?: string | null; descripcion?: string | null } }
  }
  lectores?: LectorDto[]
  eventos?: ProyectoSituacionEventoDto[]
}

export interface LectorDto {
  id?: number | string
  correoLector?: string | null
  nombreLector?: string | null
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
