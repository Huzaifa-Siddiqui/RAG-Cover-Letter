// components/AuthWrapper.tsx
"use client"

import { useAuth } from "@/contexts/AuthContext"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"

interface AuthWrapperProps {
  children: ReactNode
}

export const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  
  // Pages that don't need the sidebar (sign in page)
  const isAuthPage = pathname === '/'
  
  // If it's the auth page or user is not logged in, don't show sidebar
  if (isAuthPage || (!loading && !user)) {
    return <>{children}</>
  }
  
  // For authenticated pages, show the full layout
  return <>{children}</>
}