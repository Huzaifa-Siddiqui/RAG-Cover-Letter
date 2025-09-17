// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/AuthContext"
import { AuthWrapper } from "@/components/AuthWrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RAG Cover Letter Generator",
  description: "AI-powered cover letter generator using RAG technology",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white`}>
        <AuthProvider>
          <AuthWrapper>
            <SidebarProvider>
              <AppSidebar />
              <main className="flex-1 bg-black">
                {children}
              </main>
            </SidebarProvider>
          </AuthWrapper>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}