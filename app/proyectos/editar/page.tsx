import { Suspense } from "react"

import { ProjectEditorPageClient } from "./client-page"

export const dynamic = "force-static"


export default function ProjectEditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/20 to-background" />}>
      <ProjectEditorPageClient />
    </Suspense>
  )
}
