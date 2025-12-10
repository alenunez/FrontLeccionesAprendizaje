import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/auth-provider'

export const metadata: Metadata = {
  title: 'Sistema de Gestión de Lecciones Aprendidas',
  description: 'Plataforma para administrar el conocimiento organizacional',
  generator: 'v0.app',
  icons: {
    icon: '/solla-favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
