"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { R1Form } from "@/components/r1-form"
import { R2Form } from "@/components/r2-form"
import { R3Form } from "@/components/r3-form"
import { KnowledgeList } from "@/components/knowledge-list"
import { Database, FileText, Award, Zap, List, Plus } from "lucide-react"

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState("r1")
  const [showForm, setShowForm] = useState<{ [key: string]: boolean }>({
    r1: false,
    r2: false,
    r3: false,
  })

  const handleAddNew = (type: string) => {
    setShowForm({ ...showForm, [type]: true })
  }

  const handleFormClose = (type: string) => {
    setShowForm({ ...showForm, [type]: false })
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
      <div className="max-w-6xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-950 border border-gray-800">
            <TabsTrigger
              value="r1"
              className="data-[state=active]:bg-white data-[state=active]:text-black text-gray-300"
            >
              <FileText className="h-4 w-4 mr-2" />
              Job Examples
            </TabsTrigger>
            <TabsTrigger
              value="r2"
              className="data-[state=active]:bg-white data-[state=active]:text-black text-gray-300"
            >
              <Award className="h-4 w-4 mr-2" />
              Past Projects
            </TabsTrigger>
            <TabsTrigger
              value="r3"
              className="data-[state=active]:bg-white data-[state=active]:text-black text-gray-300"
            >
              <Zap className="h-4 w-4 mr-2" />
              Skills
            </TabsTrigger>
          </TabsList>

          <TabsContent value="r1" className="mt-6">
            {showForm.r1 ? (
              // Side-by-side layout when adding new item
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Section */}
                <Card className="bg-gray-950 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-light flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add Job Example
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Store job titles, descriptions and their successful cover letters.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <R1Form onSuccess={() => handleFormClose("r1")} />
                  </CardContent>
                </Card>

                {/* List Section */}
                <Card className="bg-gray-950 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-light flex items-center gap-2">
                      <List className="h-5 w-5" />
                      Existing Job Examples
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KnowledgeList type="r1" onAddNew={() => {}} />
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Full width layout when just viewing
              <Card className="bg-gray-950 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white font-light flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Job Examples & Cover Letters
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage your job examples with combined embeddings for better matching.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <KnowledgeList type="r1" onAddNew={() => handleAddNew("r1")} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="r2" className="mt-6">
            {showForm.r2 ? (
              // Side-by-side layout when adding new item
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Section */}
                <Card className="bg-gray-950 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-light flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add Past Project
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Store your successful project titles and descriptions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <R2Form onSuccess={() => handleFormClose("r2")} />
                  </CardContent>
                </Card>

                {/* List Section */}
                <Card className="bg-gray-950 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-light flex items-center gap-2">
                      <List className="h-5 w-5" />
                      Existing Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KnowledgeList type="r2" onAddNew={() => {}} />
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Full width layout when just viewing
              <Card className="bg-gray-950 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white font-light flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Successful Past Projects
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage your project portfolio with combined embeddings for experience matching.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <KnowledgeList type="r2" onAddNew={() => handleAddNew("r2")} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="r3" className="mt-6">
            {showForm.r3 ? (
              // Side-by-side layout when adding new item
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Section */}
                <Card className="bg-gray-950 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-light flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add Skill
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Store skill names and descriptions with proficiency levels.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <R3Form onSuccess={() => handleFormClose("r3")} />
                  </CardContent>
                </Card>

                {/* List Section */}
                <Card className="bg-gray-950 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-light flex items-center gap-2">
                      <List className="h-5 w-5" />
                      Existing Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KnowledgeList type="r3" onAddNew={() => {}} />
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Full width layout when just viewing
              <Card className="bg-gray-950 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white font-light flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Skills Repository
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage your skills with combined embeddings for precise job matching.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <KnowledgeList type="r3" onAddNew={() => handleAddNew("r3")} />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
