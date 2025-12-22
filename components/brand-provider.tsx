"use client"

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import { useAuth } from "./auth-provider"
import { BRAND_CONFIGS, resolveBrandKey, type BrandConfig, type BrandKey } from "@/lib/branding"

interface BrandingContextValue {
  brandKey: BrandKey
  brand: BrandConfig
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined)

const APPLY_AS_CSS_VARIABLES: Array<keyof BrandConfig["theme"]> = [
  "primary",
  "primaryStrong",
  "accent",
  "soft",
  "muted",
  "border",
  "contrast",
  "foreground",
]

export function BrandProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const pathname = usePathname()

  const isLoginExperience = pathname?.startsWith("/login") || pathname?.startsWith("/redirect")

  const brandKey = useMemo(() => {
    if (isLoginExperience) return "solla"
    return resolveBrandKey(session?.user?.email)
  }, [isLoginExperience, session?.user?.email])
  const brand = BRAND_CONFIGS[brandKey]

  useEffect(() => {
    const root = document.documentElement

    APPLY_AS_CSS_VARIABLES.forEach((token) => {
      const cssName = `--brand-${token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
      root.style.setProperty(cssName, brand.theme[token])
    })

    // Keep the base design tokens in sync with the brand palette
    root.style.setProperty("--primary", brand.theme.primary)
    root.style.setProperty("--primary-foreground", brand.theme.contrast)
    root.style.setProperty("--accent", brand.theme.accent)
    root.style.setProperty("--accent-foreground", brand.theme.contrast)
    root.style.setProperty("--ring", brand.theme.primary)
    root.style.setProperty("--chart-1", brand.theme.primary)
    root.style.setProperty("--chart-2", brand.theme.accent)
    root.style.setProperty("--chart-3", brand.theme.muted)
    root.style.setProperty("--sidebar-primary", brand.theme.primary)
    root.style.setProperty("--sidebar-primary-foreground", brand.theme.contrast)
    root.style.setProperty("--sidebar-accent", brand.theme.accent)
    root.style.setProperty("--sidebar-accent-foreground", brand.theme.foreground)
    root.style.setProperty("--sidebar-ring", brand.theme.primary)

    return () => {
      APPLY_AS_CSS_VARIABLES.forEach((token) => {
        const cssName = `--brand-${token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
        root.style.removeProperty(cssName)
      })
    }
  }, [brand.theme])

  const value = useMemo(
    () => ({
      brandKey,
      brand,
    }),
    [brand, brandKey],
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

export const useBranding = (): BrandingContextValue => {
  const context = useContext(BrandingContext)
  if (!context) {
    throw new Error("useBranding debe ser usado dentro de BrandProvider")
  }
  return context
}
