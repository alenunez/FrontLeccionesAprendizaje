export interface ProyectoSituacionDto {
  proyecto?: {
    id?: string | number
    fecha?: string
    descripcion?: string
    aplicacionPractica?: string
    isPrivate?: boolean
    estado?: {
      id?: string | number
      value?: string | null
      data?: { descripcion?: string | null; isActive?: boolean }
    }
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
    titulo?: string | null
    descripcion?: string | null
  }
  impactos?: ProyectoSituacionImpactoDto[]
  acciones?: ProyectoSituacionAccionDto[]
  resultados?: ProyectoSituacionResultadoDto[]
  lecciones?: ProyectoSituacionLeccionDto[]
}

export interface ProyectoSituacionImpactoDto {
  impacto?: { id?: string; titulo?: string | null; descripcion?: string | null; identificador?: string | number | null }
  acciones?: ProyectoSituacionAccionDto[]
  accionIds?: string[]
}

export interface ProyectoSituacionAccionDto {
  accion?: { id?: string; titulo?: string | null; descripcion?: string | null; identificador?: string | number | null }
  impactos?: (string | number)[]
  impactoIds?: string[]
  resultados?: ProyectoSituacionResultadoDto[]
  resultadoIds?: string[]
}

export interface ProyectoSituacionResultadoDto {
  resultado?: { id?: string; titulo?: string | null; descripcion?: string | null; identificador?: string | number | null }
  acciones?: (string | number)[]
  accionIds?: string[]
  lecciones?: ProyectoSituacionLeccionDto[]
  leccionIds?: string[]
}

export interface ProyectoSituacionLeccionDto {
  leccion?: { id?: string; titulo?: string | null; descripcion?: string | null; identificador?: string | number | null }
  resultados?: (string | number)[]
  resultadoIds?: string[]
}

export interface ProyectoSituacionEstadoCounts {
  borrador?: number
  enRevision?: number
  publicado?: number
}

export interface ProyectoSituacionPaginatedResponse {
  items?: ProyectoSituacionDto[]
  totalCount?: number
  pageNumber?: number
  pageSize?: number
  estadoCounts?: ProyectoSituacionEstadoCounts
}
