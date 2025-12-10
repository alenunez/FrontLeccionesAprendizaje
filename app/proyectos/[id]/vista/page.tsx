import { ProjectViewerPageClient } from "./client-page"

export const dynamicParams = true

export function generateStaticParams() {
  return []
}

export default function ProjectViewerPage() {
  return <ProjectViewerPageClient />
}
