"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { R1Form } from "@/components/r1-form"
import { R2Form } from "@/components/r2-form"
import { R3Form } from "@/components/r3-form"
import { Database, FileText, Award, Zap } from 'lucide-react'

export default function KnowledgePage() {
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
      <div className="max-w-4xl mx-auto p-6">
        <Tabs defaultValue="r1" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-950 border border-gray-800">
            <TabsTrigger value="r1" className="data-[state=active]:bg-white data-[state=active]:text-black text-gray-300">
              <FileText className="h-4 w-4 mr-2" />
              Job Examples
            </TabsTrigger>
            <TabsTrigger value="r2" className="data-[state=active]:bg-white data-[state=active]:text-black text-gray-300">
              <Award className="h-4 w-4 mr-2" />
              Past Projects
            </TabsTrigger>
            <TabsTrigger value="r3" className="data-[state=active]:bg-white data-[state=active]:text-black text-gray-300">
              <Zap className="h-4 w-4 mr-2" />
              Skills
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="r1" className="mt-6">
            <Card className="bg-gray-950 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white font-light">Job Examples & Cover Letters</CardTitle>
                <CardDescription className="text-gray-400">
                  Store job titles, descriptions and their successful cover letters. Combined embeddings will be created for better matching.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <R1Form />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="r2" className="mt-6">
            <Card className="bg-gray-950 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white font-light">Successful Past Projects</CardTitle>
                <CardDescription className="text-gray-400">
                  Store your successful project titles and descriptions. Combined embeddings help match similar project experience.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <R2Form />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="r3" className="mt-6">
            <Card className="bg-gray-950 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white font-light">Skills Repository</CardTitle>
                <CardDescription className="text-gray-400">
                  Store skill names and descriptions. Combined embeddings enable precise skill matching with job requirements.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <R3Form />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
