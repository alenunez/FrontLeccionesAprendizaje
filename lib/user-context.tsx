"use client"

import { createContext, useContext } from "react"

export type UserRole = "Administrador" | "Autor" | "Responsable" | "Gestor de conocimiento" | string

export interface SimulatedUser {
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
}

const defaultUser: SimulatedUser = {
  name: "Laura Mejía",
  email: "laura.mejia@solla.com",
  role: "Administrador",
  avatarUrl: "",
}

const UserContext = createContext<SimulatedUser>(defaultUser)

export function UserProvider({ children, user }: { children: React.ReactNode; user?: SimulatedUser }) {
  return <UserContext.Provider value={user ?? defaultUser}>{children}</UserContext.Provider>
}

export const useSimulatedUser = () => useContext(UserContext)
