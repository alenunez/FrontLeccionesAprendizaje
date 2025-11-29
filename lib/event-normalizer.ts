import type {
  ProyectoSituacionAccionDto,
  ProyectoSituacionEventoDto,
  ProyectoSituacionImpactoDto,
  ProyectoSituacionLeccionDto,
  ProyectoSituacionResultadoDto,
} from "@/types/lessons"

interface NormalizedEntity<T> {
  record: T
  relations: Set<string>
}

interface NormalizedEvento {
  impactos: Array<ProyectoSituacionImpactoDto & { accionIds?: string[] }>
  acciones: Array<ProyectoSituacionAccionDto & { impactoIds?: string[]; resultadoIds?: string[] }>
  resultados: Array<ProyectoSituacionResultadoDto & { accionIds?: string[]; leccionIds?: string[] }>
  lecciones: Array<ProyectoSituacionLeccionDto & { resultadoIds?: string[] }>
}

const asString = (value: string | number | undefined): string | undefined =>
  value === undefined ? undefined : String(value)

const buildId = (candidate: string | number | undefined, fallback: string): string =>
  asString(candidate) ?? fallback

export const flattenEventoDto = (
  eventoDto: ProyectoSituacionEventoDto,
  eventIndex = 0,
): NormalizedEvento => {
  const impactos = new Map<string, NormalizedEntity<ProyectoSituacionImpactoDto>>()
  const acciones = new Map<string, NormalizedEntity<ProyectoSituacionAccionDto & { impactoIds?: string[]; resultadoIds?: string[] }>>()
  const resultados = new Map<string, NormalizedEntity<ProyectoSituacionResultadoDto & { accionIds?: string[]; leccionIds?: string[] }>>()
  const lecciones = new Map<string, NormalizedEntity<ProyectoSituacionLeccionDto & { resultadoIds?: string[] }>>()

  const ensureImpacto = (impactoDto: ProyectoSituacionImpactoDto, impactoId: string) => {
    const existing = impactos.get(impactoId)
    if (existing) return existing

    const record: ProyectoSituacionImpactoDto & { accionIds?: string[] } = {
      impacto: {
        ...impactoDto.impacto,
        id: impactoDto.impacto?.id ?? impactoId,
        identificador: impactoDto.impacto?.identificador ?? impactoDto.impacto?.id ?? impactoId,
      },
      accionIds: [],
    }

    const normalized: NormalizedEntity<ProyectoSituacionImpactoDto & { accionIds?: string[] }> = {
      record,
      relations: new Set<string>(),
    }

    impactos.set(impactoId, normalized)

    const rawId = asString(impactoDto.impacto?.id)
    if (rawId && rawId !== impactoId) {
      impactos.set(rawId, normalized)
    }

    return normalized
  }

  const ensureAccion = (accionDto: ProyectoSituacionAccionDto, accionId: string) => {
    const existing = acciones.get(accionId)
    if (existing) return existing

    const record: ProyectoSituacionAccionDto & { impactoIds?: string[]; resultadoIds?: string[] } = {
      accion: {
        ...accionDto.accion,
        id: accionDto.accion?.id ?? accionId,
        identificador: accionDto.accion?.identificador ?? accionDto.accion?.id ?? accionId,
      },
      impactoIds: [],
      resultadoIds: [],
      resultados: [],
    }

    const normalized: NormalizedEntity<ProyectoSituacionAccionDto & { impactoIds?: string[]; resultadoIds?: string[] }> = {
      record,
      relations: new Set<string>(),
    }

    acciones.set(accionId, normalized)

    const rawId = asString(accionDto.accion?.id)
    if (rawId && rawId !== accionId) {
      acciones.set(rawId, normalized)
    }

    return normalized
  }

  const ensureResultado = (resultadoDto: ProyectoSituacionResultadoDto, resultadoId: string) => {
    const existing = resultados.get(resultadoId)
    if (existing) return existing

    const record: ProyectoSituacionResultadoDto & { accionIds?: string[]; leccionIds?: string[] } = {
      resultado: {
        ...resultadoDto.resultado,
        id: resultadoDto.resultado?.id ?? resultadoId,
        identificador: resultadoDto.resultado?.identificador ?? resultadoDto.resultado?.id ?? resultadoId,
      },
      accionIds: [],
      leccionIds: [],
      lecciones: [],
    }

    const normalized: NormalizedEntity<ProyectoSituacionResultadoDto & { accionIds?: string[]; leccionIds?: string[] }> = {
      record,
      relations: new Set<string>(),
    }

    resultados.set(resultadoId, normalized)

    const rawId = asString(resultadoDto.resultado?.id)
    if (rawId && rawId !== resultadoId) {
      resultados.set(rawId, normalized)
    }

    return normalized
  }

  const ensureLeccion = (leccionDto: ProyectoSituacionLeccionDto, leccionId: string) => {
    const existing = lecciones.get(leccionId)
    if (existing) return existing

    const record: ProyectoSituacionLeccionDto & { resultadoIds?: string[] } = {
      leccion: {
        ...leccionDto.leccion,
        id: leccionDto.leccion?.id ?? leccionId,
        identificador: (leccionDto.leccion as { identificador?: string | number })?.identificador ?? leccionId,
      },
      resultadoIds: [],
    }

    const normalized: NormalizedEntity<ProyectoSituacionLeccionDto & { resultadoIds?: string[] }> = {
      record,
      relations: new Set<string>(),
    }

    lecciones.set(leccionId, normalized)

    const rawId = asString(leccionDto.leccion?.id)
    if (rawId && rawId !== leccionId) {
      lecciones.set(rawId, normalized)
    }

    return normalized
  }

  const processLecciones = (
    leccionesDto: ProyectoSituacionLeccionDto[] | undefined,
    resultadoId: string,
    eventPath: string,
  ) => {
    leccionesDto?.forEach((leccionDto, leccionIndex) => {
      const leccionId = buildId(
        (leccionDto.leccion as { identificador?: string | number })?.identificador ?? leccionDto.leccion?.id,
        `${eventPath}-leccion-${leccionIndex}`,
      )
      const leccion = ensureLeccion(leccionDto, leccionId)
      leccion.relations.add(resultadoId)
      leccion.record.resultadoIds = Array.from(new Set([...(leccion.record.resultadoIds ?? []), resultadoId]))

      const resultado = resultados.get(resultadoId)
      if (resultado) {
        resultado.record.leccionIds = Array.from(
          new Set([...(resultado.record.leccionIds ?? []), leccionId]),
        )
      }
    })
  }

  const processResultados = (
    resultadosDto: ProyectoSituacionResultadoDto[] | undefined,
    accionId: string,
    eventPath: string,
  ) => {
    resultadosDto?.forEach((resultadoDto, resultadoIndex) => {
      const resultadoId = buildId(
        resultadoDto.resultado?.identificador ?? resultadoDto.resultado?.id,
        `${eventPath}-resultado-${resultadoIndex}`,
      )
      const resultado = ensureResultado(resultadoDto, resultadoId)
      resultado.relations.add(accionId)
      resultado.record.accionIds = Array.from(new Set([...(resultado.record.accionIds ?? []), accionId]))

      const accion = acciones.get(accionId)
      if (accion) {
        accion.record.resultadoIds = Array.from(new Set([...(accion.record.resultadoIds ?? []), resultadoId]))
      }

      processLecciones(resultadoDto.lecciones, resultadoId, `${eventPath}-resultado-${resultadoIndex}`)
    })
  }

  const processAcciones = (
    accionesDto: ProyectoSituacionAccionDto[] | undefined,
    impactoId: string,
    eventPath: string,
  ) => {
    accionesDto?.forEach((accionDto, accionIndex) => {
      const accionId = buildId(
        accionDto.accion?.identificador ?? accionDto.accion?.id,
        `${eventPath}-accion-${accionIndex}`,
      )
      const accion = ensureAccion(accionDto, accionId)
      accion.relations.add(impactoId)
      accion.record.impactoIds = Array.from(new Set([...(accion.record.impactoIds ?? []), impactoId]))

      const impacto = impactos.get(impactoId)
      if (impacto) {
        impacto.relations.add(accionId)
      }

      processResultados(accionDto.resultados, accionId, `${eventPath}-accion-${accionIndex}`)
    })
  }

  eventoDto.impactos?.forEach((impactoDto, impactoIndex) => {
    const impactoId = buildId(
      impactoDto.impacto?.identificador ?? impactoDto.impacto?.id,
      `evento-${eventIndex}-impacto-${impactoIndex}`,
    )
    const impacto = ensureImpacto(impactoDto, impactoId)

    processAcciones(impactoDto.acciones, impactoId, `evento-${eventIndex}-impacto-${impactoIndex}`)

    impacto.relations.forEach((accionId) => {
      impacto.record.accionIds = Array.from(new Set([...(impacto.record.accionIds ?? []), accionId]))
    })
  })

  // Backwards compatibility with previous flat structure
  eventoDto.impactos?.forEach((impactoDto, impactoIndex) => {
    const impactoId = buildId(
      impactoDto.impacto?.identificador ?? impactoDto.impacto?.id,
      `evento-${eventIndex}-impacto-${impactoIndex}`,
    )
    const impacto = ensureImpacto(impactoDto, impactoId)
    impactoDto.accionIds?.forEach((accionId) => impacto.relations.add(asString(accionId) ?? ""))
  })

  eventoDto.acciones?.forEach((accionDto, accionIndex) => {
    const accionId = buildId(accionDto.accion?.identificador ?? accionDto.accion?.id, `evento-${eventIndex}-accion-${accionIndex}`)
    const accion = ensureAccion(accionDto, accionId)
    accionDto.impactoIds?.forEach((impactoId) => {
      const impactoIdStr = asString(impactoId) ?? ""
      accion.relations.add(impactoIdStr)
      const impacto = impactos.get(impactoIdStr)
      if (impacto) {
        impacto.relations.add(accionId)
      }
    })
    accionDto.resultadoIds?.forEach((resultadoId) => accion.record.resultadoIds?.push(String(resultadoId)))
  })

  eventoDto.resultados?.forEach((resultadoDto, resultadoIndex) => {
    const resultadoId = buildId(
      resultadoDto.resultado?.identificador ?? resultadoDto.resultado?.id,
      `evento-${eventIndex}-resultado-${resultadoIndex}`,
    )
    const resultado = ensureResultado(resultadoDto, resultadoId)
    resultadoDto.accionIds?.forEach((accionId) => resultado.relations.add(asString(accionId) ?? ""))
    resultadoDto.leccionIds?.forEach((leccionId) => resultado.record.leccionIds?.push(String(leccionId)))
  })

  eventoDto.lecciones?.forEach((leccionDto, leccionIndex) => {
    const leccionId = buildId(leccionDto.leccion?.id, `evento-${eventIndex}-leccion-${leccionIndex}`)
    const leccion = ensureLeccion(leccionDto, leccionId)
    leccionDto.resultadoIds?.forEach((resultadoId) => leccion.relations.add(asString(resultadoId) ?? ""))
  })

  impactos.forEach((impacto) => {
    impacto.record.accionIds = Array.from(impacto.relations).filter(Boolean)
  })

  acciones.forEach((accion) => {
    accion.record.impactoIds = Array.from(accion.relations).filter(Boolean)
    accion.record.resultadoIds = Array.from(new Set(accion.record.resultadoIds ?? [])).filter(Boolean)
  })

  resultados.forEach((resultado) => {
    resultado.record.accionIds = Array.from(resultado.relations).filter(Boolean)
    resultado.record.leccionIds = Array.from(new Set(resultado.record.leccionIds ?? [])).filter(Boolean)
  })

  lecciones.forEach((leccion) => {
    leccion.record.resultadoIds = Array.from(leccion.relations).filter(Boolean)
  })

  return {
    impactos: Array.from(impactos.values()).map((item) => item.record),
    acciones: Array.from(acciones.values()).map((item) => item.record),
    resultados: Array.from(resultados.values()).map((item) => item.record),
    lecciones: Array.from(lecciones.values()).map((item) => item.record),
  }
}
