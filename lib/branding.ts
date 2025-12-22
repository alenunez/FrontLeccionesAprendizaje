import type { CSSProperties } from "react"

export type BrandKey = "solla" | "distraves" | "galponsas" | "transgraneles"

interface BrandTheme {
  primary: string
  primaryStrong: string
  accent: string
  soft: string
  muted: string
  border: string
  contrast: string
  foreground: string
}

export interface BrandConfig {
  key: BrandKey
  logoUrl: string
  theme: BrandTheme
}

export const themeToCssVariables = (theme: BrandTheme): CSSProperties => ({
  "--brand-primary": theme.primary,
  "--brand-primary-strong": theme.primaryStrong,
  "--brand-accent": theme.accent,
  "--brand-soft": theme.soft,
  "--brand-muted": theme.muted,
  "--brand-border": theme.border,
  "--brand-contrast": theme.contrast,
  "--brand-foreground": theme.foreground,
})

const DEFAULT_BRAND: BrandKey = "solla"

export const BRAND_CONFIGS: Record<BrandKey, BrandConfig> = {
  solla: {
    key: "solla",
    logoUrl: "https://www.solla.com/wp-content/uploads/2022/01/logo-solla-1.png",
    theme: {
      primary: "#067138",
      primaryStrong: "#05592d",
      accent: "#0fa958",
      soft: "#e0f3e8",
      muted: "#cbeed8",
      border: "#8fd0ab",
      contrast: "#ffffff",
      foreground: "#0b2a18",
    },
  },
  distraves: {
    key: "distraves",
    logoUrl:
      "https://b2cdistraves.vtexassets.com/assets/vtex.file-manager-graphql/images/38b7df33-9ae6-4b18-9211-12ec3d687595___b74f7ed1093afbd48e888421df48e9cc.svg",
    theme: {
      primary: "#b0002a",
      primaryStrong: "#8a0021",
      accent: "#d22b44",
      soft: "#ffe3ea",
      muted: "#ffd5dd",
      border: "#f2b8c4",
      contrast: "#ffffff",
      foreground: "#2d0b12",
    },
  },
  galponsas: {
    key: "galponsas",
    logoUrl:
      "/spg.png",
    theme: {
      primary: "#efb810",
      primaryStrong: "#d79f00",
      accent: "#224091",
      soft: "#fff3cd",
      muted: "#ffeec2",
      border: "#f3d179",
      contrast: "#0f172a",
      foreground: "#21130a",
    },
  },
  transgraneles: {
    key: "transgraneles",
    logoUrl: "/transgraneles.png",
    theme: {
      primary: "#e0131e",
      primaryStrong: "#b50f18",
      accent: "#ff6b72",
      soft: "#ffe1e3",
      muted: "#ffd5d8",
      border: "#ffb3b8",
      contrast: "#ffffff",
      foreground: "#2a0a0c",
    },
  },
}

export const resolveBrandKey = (email?: string | null): BrandKey => {
  // El inicio de sesión siempre debe usar la experiencia de Solla sin depender
  // del dominio del correo electrónico. Se conserva solo el valor por defecto
  // configurado en el proyecto para evitar variaciones por dominio.
  void email

  return DEFAULT_BRAND
}

export const SOLLA_BRAND_CSS_VARS = themeToCssVariables(BRAND_CONFIGS.solla.theme)
