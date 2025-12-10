import { Suspense } from "react"

import { ProjectViewerPageClient } from "./client-page"

export const dynamic = "force-dynamic"

export default function ProjectViewerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/20 to-background" />}>
      <ProjectViewerPageClient />
    </Suspense>
  )
}
