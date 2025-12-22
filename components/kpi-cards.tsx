import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, AlertTriangle, CheckCircle, ListChecks, TrendingUp, TrendingDown } from "lucide-react"

export function KPICards() {
  const kpis = [
    {
      title: "Lecciones Registradas",
      value: "156",
      change: "+12%",
      trend: "up",
      icon: CheckCircle,
      description: "Este mes",
      bgColor: "bg-[color:var(--brand-soft)]",
      iconColor: "text-[color:var(--brand-primary)]",
      borderColor: "border-[color:var(--brand-border)]",
    },
    {
      title: "Eventos totales",
      value: "342",
      change: "+28",
      trend: "up",
      icon: Calendar,
      description: "Eventos registrados",
      bgColor: "bg-[color:var(--brand-muted)]",
      iconColor: "text-[color:var(--brand-primary)]",
      borderColor: "border-[color:var(--brand-soft)]",
    },
    {
      title: "Acciones Implementadas",
      value: "487",
      change: "+35",
      trend: "up",
      icon: ListChecks,
      description: "Acciones totales",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      borderColor: "border-emerald-200",
    },
    {
      title: "Pendientes Revisión",
      value: "23",
      change: "+5",
      trend: "neutral",
      icon: AlertTriangle,
      description: "Requieren atención",
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
      borderColor: "border-amber-200",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        const TrendIcon = kpi.trend === "up" ? TrendingUp : kpi.trend === "down" ? TrendingDown : null

        return (
          <Card
            key={kpi.title}
            className={`${kpi.bgColor} ${kpi.borderColor} border shadow-sm hover:shadow-md transition-all duration-200`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">{kpi.title}</CardTitle>
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 mb-2">{kpi.value}</div>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  {TrendIcon && (
                    <TrendIcon
                      className={`h-3 w-3 ${
                        kpi.trend === "up" ? "text-green-600" : kpi.trend === "down" ? "text-red-600" : "text-slate-500"
                      }`}
                    />
                  )}
                  <span
                    className={`font-medium ${
                      kpi.trend === "up" ? "text-green-600" : kpi.trend === "down" ? "text-red-600" : "text-slate-600"
                    }`}
                  >
                    {kpi.change}
                  </span>
                </div>
                <span className="text-slate-500">{kpi.description}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
