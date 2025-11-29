import { Dashboard } from "@/components/dashboard"
import { UserProvider } from "@/lib/user-context"

export default function Home() {
  return (
    <UserProvider>
      <Dashboard />
    </UserProvider>
  )
}
