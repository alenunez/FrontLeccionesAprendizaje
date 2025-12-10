import { ProjectEditorPageClient } from "./client-page"

export const dynamicParams = true

export function generateStaticParams() {
  return []
}

export default function ProjectEditorPage() {
  return <ProjectEditorPageClient />
}
