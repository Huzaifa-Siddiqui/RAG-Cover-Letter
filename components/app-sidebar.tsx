// components/app-sidebar.tsx
"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { MessageSquare, BookOpen, Brain, LogOut, User } from 'lucide-react'
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

const menuItems = [
  {
    title: "Chat",
    url: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Knowledge",
    url: "/knowledge",
    icon: BookOpen,
  },
]

export function AppSidebar() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      })
    }
  }

  // Don't render sidebar if no user
  if (!user) {
    return null
  }

  return (
    <Sidebar className="bg-black border-r border-gray-800">
      <SidebarHeader className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Brain className="h-7 w-7 text-white" />
          <div>
            <h1 className="font-semibold text-lg text-white">RAG Cover Letter</h1>
            <p className="text-xs text-gray-400">AI-Powered Generator</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="bg-black">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="hover:bg-gray-900 text-gray-300 hover:text-white">
                    <Link href={item.url} className="flex items-center gap-3 px-4 py-3">
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-gray-800">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-400 px-2">
            <User className="h-4 w-4" />
            <span className="truncate">{user.email}</span>
          </div>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-900"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}