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
} from "@/components/ui/sidebar"
import { MessageSquare, BookOpen, Brain } from 'lucide-react'
import Link from "next/link"

const menuItems = [
  {
    title: "Chat",
    url: "/",
    icon: MessageSquare,
  },
  {
    title: "Knowledge",
    url: "/knowledge",
    icon: BookOpen,
  },
]

export function AppSidebar() {
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
    </Sidebar>
  )
}
