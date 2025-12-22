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

// Allows local previews without depending on the authenticated email domain.
// Accepts values: "solla", "distraves", "galponsas", "transgraneles" or the matching email domain.
const BRAND_OVERRIDE = process.env.NEXT_PUBLIC_BRAND_OVERRIDE?.trim().toLowerCase()

const BRAND_DOMAIN_MAP: Record<string, BrandKey> = {
  "solla.com": "solla",
  "distraves.com": "distraves",
  "galponsas.com": "galponsas",
  "transgraneles.com.co": "transgraneles",
}

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
    logoUrl: "/galponsas-logo.svg",
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
    logoUrl: "https://www.transgraneles.com.co/Content/themes/public/img/logo.png",
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

const normalizeBrandKey = (value?: string | null): BrandKey | undefined => {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()

  if ((Object.keys(BRAND_CONFIGS) as BrandKey[]).includes(normalized as BrandKey)) {
    return normalized as BrandKey
  }

  const domainMatch = BRAND_DOMAIN_MAP[normalized]
  if (domainMatch) return domainMatch

  return undefined
}

export const resolveBrandKey = (email?: string | null): BrandKey => {
  const override = normalizeBrandKey(BRAND_OVERRIDE)
  if (override) return override

  const emailDomain = email?.split("@")[1]?.toLowerCase()
  const brandFromDomain = normalizeBrandKey(emailDomain)
  if (brandFromDomain) return brandFromDomain

  return DEFAULT_BRAND
}
