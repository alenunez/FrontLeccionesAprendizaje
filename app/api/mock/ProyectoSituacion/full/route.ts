import { NextResponse } from "next/server"

const sampleResponse = [
  {
    proyecto: {
      id: "1",
      fecha: "2025-11-17T05:00:00Z",
      descripcion: "Test 1",
      aplicacionPractica: "Test 1 app practica",
      isPrivate: false,
      estado: {
        id: 1,
        value: null,
        data: {
          descripcion: "Borrador",
          isActive: true,
        },
      },
      responsable: {
        id: 13,
        value: null,
        nombre: null,
        oid: null,
        correo: null,
        userPrincipalName: null,
      },
      autor: {
        id: 14,
        value: null,
        nombre: null,
        oid: null,
        correo: null,
        userPrincipalName: null,
      },
      sede: {
        id: 1,
        value: null,
        data: {
          nombre: "Central",
          compania: {
            id: 1,
            value: null,
            data: {
              nombre: "Solla",
              isActive: true,
            },
          },
          isActive: true,
        },
      },
      proceso: {
        id: 2,
        value: null,
        data: {
          nombre: "Proceso de prueba 2",
          descripcion: null,
        },
      },
    },
    lectores: [],
    eventos: [
      {
        evento: {
          id: "1",
          descripcion: "Evento de prueba proy 1",
        },
        impactos: [
          {
            impacto: {
              id: "1",
              descripcion: "Impacto 1 proy 1",
              identificador: null,
            },
            accionIds: ["2", "1"],
          },
        ],
        acciones: [
          {
            accion: {
              id: "2",
              descripcion: "Acciion 2 even 1",
              identificador: null,
            },
            impactoIds: ["1"],
            resultadoIds: [],
          },
          {
            accion: {
              id: "1",
              descripcion: "Accion 1 even 1",
              identificador: null,
            },
            impactoIds: ["1"],
            resultadoIds: ["1", "2"],
          },
        ],
        resultados: [
          {
            resultado: {
              id: "1",
              descripcion: "res 1 evento 1",
              identificador: null,
            },
            accionIds: ["1"],
            leccionIds: ["1"],
          },
          {
            resultado: {
              id: "2",
              descripcion: "resu 2 even 1",
              identificador: null,
            },
            accionIds: ["1"],
            leccionIds: [],
          },
        ],
        lecciones: [
          {
            leccion: {
              id: "1",
              descripcion: "Leccion 1 even 1",
            },
            resultadoIds: ["1"],
          },
        ],
      },
    ],
  },
]

export async function GET() {
  return NextResponse.json(sampleResponse)
}
