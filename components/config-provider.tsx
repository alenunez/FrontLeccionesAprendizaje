"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { useAuth } from "./auth-provider"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export interface AppConfiguration {
  maxAttachments: number
  maxAttachmentMb: number
  attachmentNameMaxLength: number
  textareaMaxLength: number
  aplicacionPracticaMaxLength: number
  eventDescriptionMaxLength: number
  eventTableTextareaMaxLength: number
}

interface ConfigContextValue {
  config: AppConfiguration
  loading: boolean
  error?: string
  refresh: () => Promise<void>
}

const DEFAULT_CONFIGURATION: AppConfiguration = {
  maxAttachments: 3,
  maxAttachmentMb: 2,
  attachmentNameMaxLength: 50,
  textareaMaxLength: 100,
  aplicacionPracticaMaxLength: 100,
  eventDescriptionMaxLength: 100,
  eventTableTextareaMaxLength: 100,
}

const parsePositiveInteger = (value: number | string | undefined | null, fallback: number) => {
  const parsedValue = Number(value)

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return Math.floor(parsedValue)
  }

  return fallback
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined)

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth()
  const [config, setConfig] = useState<AppConfiguration>(DEFAULT_CONFIGURATION)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  const fetchConfiguration = useCallback(async () => {
    if (!session?.accessToken) {
      setLoading(false)
      return
    }

    if (!API_BASE_URL) {
      setError("La URL base del API no está configurada (NEXT_PUBLIC_API_BASE_URL).")
      setConfig(DEFAULT_CONFIGURATION)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/Configuraciones`, {
        headers: {
          Authorization: `${session.tokenType ?? "Bearer"} ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Error al cargar configuraciones: ${response.status}`)
      }

      const payload = (await response.json()) as Partial<AppConfiguration> & {
        nextPublicEventTableTextareaMaxLength?: number | string
      }

      const normalizedConfig: AppConfiguration = {
        maxAttachments: parsePositiveInteger(payload.maxAttachments, DEFAULT_CONFIGURATION.maxAttachments),
        maxAttachmentMb: parsePositiveInteger(payload.maxAttachmentMb, DEFAULT_CONFIGURATION.maxAttachmentMb),
        attachmentNameMaxLength: parsePositiveInteger(
          payload.attachmentNameMaxLength,
          DEFAULT_CONFIGURATION.attachmentNameMaxLength,
        ),
        textareaMaxLength: parsePositiveInteger(payload.textareaMaxLength, DEFAULT_CONFIGURATION.textareaMaxLength),
        aplicacionPracticaMaxLength: parsePositiveInteger(
          payload.aplicacionPracticaMaxLength,
          DEFAULT_CONFIGURATION.aplicacionPracticaMaxLength,
        ),
        eventDescriptionMaxLength: parsePositiveInteger(
          payload.eventDescriptionMaxLength,
          DEFAULT_CONFIGURATION.eventDescriptionMaxLength,
        ),
        eventTableTextareaMaxLength: parsePositiveInteger(
          payload.eventTableTextareaMaxLength ?? payload.nextPublicEventTableTextareaMaxLength,
          DEFAULT_CONFIGURATION.eventTableTextareaMaxLength,
        ),
      }

      setConfig(normalizedConfig)
      setError(undefined)
    } catch (err) {
      console.error("No fue posible cargar las configuraciones", err)
      setError("No fue posible cargar las configuraciones. Se usarán los valores por defecto.")
      setConfig(DEFAULT_CONFIGURATION)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    fetchConfiguration()
  }, [fetchConfiguration])

  const value = useMemo<ConfigContextValue>(
    () => ({
      config,
      loading,
      error,
      refresh: fetchConfiguration,
    }),
    [config, error, fetchConfiguration, loading],
  )

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export const useConfig = () => {
  const context = useContext(ConfigContext)
  if (!context) {
    throw new Error("useConfig debe ser usado dentro de ConfigProvider")
  }
  return context
}
