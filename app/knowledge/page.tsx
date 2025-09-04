"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Database } from "lucide-react"
import { KnowledgeList } from "@/components/knowledge-list"
import { R1Form } from "@/components/r1-form"
import { R2Form } from "@/components/r2-form"
import { R3Form } from "@/components/r3-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState("r1")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addDialogType, setAddDialogType] = useState<"r1" | "r2" | "r3">("r1")

  const handleAddNew = (type: "r1" | "r2" | "r3") => {
    setAddDialogType(type)
    setShowAddDialog(true)
  }

  const handleFormSuccess = () => {
    setShowAddDialog(false)
    // The KnowledgeList component will automatically refresh
  }

  const getDialogTitle = () => {
    switch (addDialogType) {
      case "r1":
        return "Add Job Example"
      case "r2":
        return "Add Project"
      case "r3":
        return "Add Skill"
    }
  }

  const renderForm = () => {
    switch (addDialogType) {
      case "r1":
        return <R1Form onSuccess={handleFormSuccess} />
      case "r2":
        return <R2Form onSuccess={handleFormSuccess} />
      case "r3":
        return <R3Form onSuccess={handleFormSuccess} />
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black">
        <div className="flex items-center gap-4 p-6">
          <SidebarTrigger className="text-white hover:bg-gray-900" />
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-white" />
            <h1 className="text-2xl font-light text-white">Knowledge Base</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Knowledge Base Tabs */}
        <Card className="bg-gray-950 border-gray-800">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-gray-900">
                <TabsTrigger value="r1" className="text-gray-300 data-[state=active]:text-white">
                  Job Examples
                </TabsTrigger>
                <TabsTrigger value="r2" className="text-gray-300 data-[state=active]:text-white">
                  Past Projects
                </TabsTrigger>
                <TabsTrigger value="r3" className="text-gray-300 data-[state=active]:text-white">
                  Skills
                </TabsTrigger>
              </TabsList>

              <TabsContent value="r1" className="mt-6">
                <KnowledgeList type="r1" onAddNew={() => handleAddNew("r1")} />
              </TabsContent>

              <TabsContent value="r2" className="mt-6">
                <KnowledgeList type="r2" onAddNew={() => handleAddNew("r2")} />
              </TabsContent>

              <TabsContent value="r3" className="mt-6">
                <KnowledgeList type="r3" onAddNew={() => handleAddNew("r3")} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">{renderForm()}</div>
        </DialogContent>
      </Dialog>
    </div>
  )
}