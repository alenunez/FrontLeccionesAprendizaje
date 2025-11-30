import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { Plus_Jakarta_Sans, Public_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/auth-provider'

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

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
      <body
        className={`font-sans antialiased ${publicSans.variable} ${plusJakarta.variable} ${GeistMono.variable}`}
      >
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
