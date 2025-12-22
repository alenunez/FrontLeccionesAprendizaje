"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, Send, Bot, User, Lightbulb, Search, BookOpen } from "lucide-react"

interface Message {
  id: string
  type: "user" | "bot"
  content: string
  timestamp: Date
  relatedLessons?: string[]
}

export function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content:
        "¡Hola! Soy tu asistente de lecciones aprendidas. Puedo ayudarte a encontrar información sobre proyectos anteriores, mejores prácticas y experiencias organizacionales. ¿En qué puedo ayudarte hoy?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Sample lessons database for simulation
  const lessonsDatabase = [
    {
      id: "LA-2024-001",
      title: "Gestión de proveedores en proyectos SAP",
      category: "Tecnología",
      content:
        "En proyectos SAP es crucial establecer comunicación temprana con proveedores y definir claramente los entregables.",
      keywords: ["sap", "proveedores", "tecnología", "comunicación"],
    },
    {
      id: "LA-2024-002",
      title: "Comunicación con stakeholders en crisis",
      category: "Comunicación",
      content:
        "Durante crisis es fundamental mantener comunicación transparente y frecuente con todos los stakeholders.",
      keywords: ["crisis", "stakeholders", "comunicación", "transparencia"],
    },
    {
      id: "LA-2024-003",
      title: "Optimización de procesos de calidad",
      category: "Calidad",
      content:
        "La implementación de métricas automatizadas mejora significativamente los procesos de control de calidad.",
      keywords: ["calidad", "procesos", "métricas", "automatización"],
    },
    {
      id: "LA-2024-004",
      title: "Gestión de riesgos en proyectos remotos",
      category: "Gestión de Proyectos",
      content:
        "Los proyectos remotos requieren herramientas de seguimiento más robustas y reuniones de sincronización frecuentes.",
      keywords: ["riesgos", "remoto", "seguimiento", "sincronización"],
    },
  ]

  const generateBotResponse = (userMessage: string): { content: string; relatedLessons: string[] } => {
    const lowerMessage = userMessage.toLowerCase()
    const relatedLessons: string[] = []

    // Find relevant lessons based on keywords
    const relevantLessons = lessonsDatabase.filter(
      (lesson) =>
        lesson.keywords.some((keyword) => lowerMessage.includes(keyword)) ||
        lowerMessage.includes(lesson.category.toLowerCase()) ||
        lowerMessage.includes(lesson.title.toLowerCase()),
    )

    if (relevantLessons.length > 0) {
      relatedLessons.push(...relevantLessons.map((l) => l.id))

      const lessonSummaries = relevantLessons
        .map((lesson) => `**${lesson.title}** (${lesson.id}): ${lesson.content}`)
        .join("\n\n")

      return {
        content: `He encontrado ${relevantLessons.length} lección(es) relacionada(s) con tu consulta:\n\n${lessonSummaries}\n\n¿Te gustaría que profundice en alguna de estas lecciones o tienes alguna pregunta específica?`,
        relatedLessons,
      }
    }

    // Default responses for common queries
    if (lowerMessage.includes("hola") || lowerMessage.includes("ayuda")) {
      return {
        content:
          "¡Hola! Puedo ayudarte con consultas sobre lecciones aprendidas. Puedes preguntarme sobre:\n\n• Proyectos específicos (ej: 'proyectos SAP')\n• Categorías (ej: 'comunicación', 'calidad', 'tecnología')\n• Situaciones específicas (ej: 'gestión de crisis')\n• Mejores prácticas\n\n¿Qué te interesa saber?",
        relatedLessons: [],
      }
    }

    if (lowerMessage.includes("categorías") || lowerMessage.includes("tipos")) {
      return {
        content:
          "Las principales categorías de lecciones aprendidas en nuestro repositorio son:\n\n• **Tecnología** - Implementaciones técnicas y herramientas\n• **Comunicación** - Gestión de stakeholders y equipos\n• **Calidad** - Procesos y controles de calidad\n• **Gestión de Proyectos** - Metodologías y mejores prácticas\n• **Riesgos** - Identificación y mitigación de riesgos\n\n¿Sobre cuál categoría te gustaría saber más?",
        relatedLessons: [],
      }
    }

    return {
      content:
        "No encontré lecciones específicas para tu consulta, pero puedo ayudarte de otras formas:\n\n• Intenta usar palabras clave más específicas\n• Pregunta por categorías como 'tecnología', 'comunicación', 'calidad'\n• Consulta sobre situaciones específicas como 'gestión de crisis' o 'proyectos remotos'\n\n¿Puedes reformular tu pregunta o ser más específico?",
      relatedLessons: [],
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate AI processing delay
    setTimeout(() => {
      const { content, relatedLessons } = generateBotResponse(inputValue)

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content,
        timestamp: new Date(),
        relatedLessons: relatedLessons.length > 0 ? relatedLessons : undefined,
      }

      setMessages((prev) => [...prev, botMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const suggestedQueries = [
    "¿Qué lecciones hay sobre proyectos SAP?",
    "Mejores prácticas en comunicación",
    "Gestión de riesgos en proyectos",
    "Procesos de calidad",
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
      {/* Chat Interface */}
      <div className="lg:col-span-3">
        <Card className="h-full flex flex-col border border-[color:var(--brand-soft)] bg-white/80 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-4 border-b border-[color:var(--brand-soft)] bg-gradient-to-r from-[color:var(--brand-soft)] via-white to-[color:var(--brand-muted)]">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="rounded-lg bg-[color:var(--brand-primary)] p-2 text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              Consultor IA de Lecciones Aprendidas
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.type === "bot" && (
                      <div className="rounded-full bg-[color:var(--brand-soft)] p-2">
                        <Bot className="h-4 w-4 text-[color:var(--brand-primary)]" />
                      </div>
                    )}

                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.type === "user"
                          ? "bg-[color:var(--brand-primary)] text-white"
                          : "bg-slate-100 text-slate-900"
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>

                      {message.relatedLessons && message.relatedLessons.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="flex flex-wrap gap-2">
                            {message.relatedLessons.map((lessonId) => (
                              <Badge
                                key={lessonId}
                                variant="outline"
                                className="bg-white/50 text-xs cursor-pointer hover:bg-white"
                              >
                                <BookOpen className="h-3 w-3 mr-1" />
                                {lessonId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-xs opacity-70 mt-2">{message.timestamp.toLocaleTimeString()}</div>
                    </div>

                    {message.type === "user" && (
                      <div className="p-2 bg-slate-100 rounded-full">
                        <User className="h-4 w-4 text-slate-600" />
                      </div>
                    )}
                  </div>
                ))}

                    {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <div className="rounded-full bg-[color:var(--brand-soft)] p-2">
                      <Bot className="h-4 w-4 text-[color:var(--brand-primary)]" />
                    </div>
                    <div className="bg-slate-100 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-6 border-t bg-slate-50/50">
              <div className="flex gap-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Pregunta sobre lecciones aprendidas..."
                  className="flex-1 border-slate-200 focus:border-[color:var(--brand-primary)] focus:ring-[color:var(--brand-primary)]/30"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  className="rounded-full bg-[color:var(--brand-primary)] px-6 hover:bg-[color:var(--brand-primary-strong)]"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Suggested Queries */}
        <Card className="border border-emerald-50 bg-white/80 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Consultas Sugeridas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestedQueries.map((query, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto w-full justify-start rounded-2xl border-slate-200 bg-white p-3 text-left text-sm hover:bg-[color:var(--brand-soft)]"
                onClick={() => setInputValue(query)}
              >
                <Search className="h-4 w-4 mr-2 text-slate-400" />
                {query}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border border-emerald-50 bg-white/80 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Base de Conocimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Lecciones Disponibles</span>
              <Badge variant="secondary" className="rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand-primary)]">
                {lessonsDatabase.length}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Categorías</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                4
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Consultas Hoy</span>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                12
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
