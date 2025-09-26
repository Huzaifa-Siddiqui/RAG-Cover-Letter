"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { FileText, Loader2, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

export default function PRDPage() {
  const [jobDescription, setJobDescription] = useState("")
  const [projectRequirements, setProjectRequirements] = useState("")
  const [otherText, setOtherText] = useState("")
  const [listOfActors, setListOfActors] = useState("")
  const [prdDocument, setPrdDocument] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  // Refs for auto-resizing textareas
  const jobDescriptionRef = useRef<HTMLTextAreaElement>(null) as React.RefObject<HTMLTextAreaElement>
  const projectRequirementsRef = useRef<HTMLTextAreaElement>(null) as React.RefObject<HTMLTextAreaElement>
  const otherTextRef = useRef<HTMLTextAreaElement>(null) as React.RefObject<HTMLTextAreaElement>
  const listOfActorsRef = useRef<HTMLTextAreaElement>(null) as React.RefObject<HTMLTextAreaElement>

  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  // Auto-resize textareas based on content
  useEffect(() => {
    const resizeTextarea = (ref: React.RefObject<HTMLTextAreaElement>) => {
      const textarea = ref.current
      if (textarea) {
        textarea.style.height = "auto"
        textarea.style.height = `${textarea.scrollHeight}px`
      }
    }

    resizeTextarea(jobDescriptionRef)
  }, [jobDescription])

  useEffect(() => {
    const resizeTextarea = (ref: React.RefObject<HTMLTextAreaElement>) => {
      const textarea = ref.current
      if (textarea) {
        textarea.style.height = "auto"
        textarea.style.height = `${textarea.scrollHeight}px`
      }
    }

    resizeTextarea(projectRequirementsRef)
  }, [projectRequirements])

  useEffect(() => {
    const resizeTextarea = (ref: React.RefObject<HTMLTextAreaElement>) => {
      const textarea = ref.current
      if (textarea) {
        textarea.style.height = "auto"
        textarea.style.height = `${textarea.scrollHeight}px`
      }
    }

    resizeTextarea(otherTextRef)
  }, [otherText])

  useEffect(() => {
    const resizeTextarea = (ref: React.RefObject<HTMLTextAreaElement>) => {
      const textarea = ref.current
      if (textarea) {
        textarea.style.height = "auto"
        textarea.style.height = `${textarea.scrollHeight}px`
      }
    }

    resizeTextarea(listOfActorsRef)
  }, [listOfActors])

  const handleGeneratePRD = async () => {
    if (!jobDescription.trim() || !projectRequirements.trim()) {
      toast({
        title: "Error",
        description: "Please enter both job description and project requirements",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setPrdDocument("")

    try {
      const response = await fetch("/api/generate-prd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobDescription,
          projectRequirements,
          otherText,
          listOfActors,
          userId: user?.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim()
              if (data === "[DONE]") return

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  setPrdDocument((prev) => prev + parsed.content)
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("PRD generation error:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate PRD. Please check your API configuration and try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!prdDocument.trim()) {
      toast({
        title: "Error",
        description: "No PRD document to download",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/download-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: prdDocument,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate PDF")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "PRD-Document.pdf"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      })
    } catch (error) {
      console.error("PDF download error:", error)
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      })
    }
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black">
        <div className="flex items-center gap-4 p-6">
          <SidebarTrigger className="text-white hover:bg-gray-900" />
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-white" />
            <h1 className="text-2xl font-light text-white">PRD Generator</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Input Section */}
        <Card className="bg-gray-950 border-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-white font-light text-xl">Generate Your Project Requirement Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="job-description" className="text-gray-300 text-sm">
                Job Description
              </Label>
              <Textarea
                id="job-description"
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                ref={jobDescriptionRef}
                className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
                style={{ overflow: "hidden" }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-requirements" className="text-gray-300 text-sm">
                Project Requirements
              </Label>
              <Textarea
                id="project-requirements"
                placeholder="Enter the project requirements here..."
                value={projectRequirements}
                onChange={(e) => setProjectRequirements(e.target.value)}
                ref={projectRequirementsRef}
                className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
                style={{ overflow: "hidden" }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other-text" className="text-gray-300 text-sm">
                Other Text (Optional)
              </Label>
              <Textarea
                id="other-text"
                placeholder="Enter any additional context or information..."
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                ref={otherTextRef}
                className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
                style={{ overflow: "hidden" }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="list-of-actors" className="text-gray-300 text-sm">
                List of Actors
              </Label>
              <Textarea
                id="list-of-actors"
                placeholder="Enter the list of actors/stakeholders (one per line)..."
                value={listOfActors}
                onChange={(e) => setListOfActors(e.target.value)}
                ref={listOfActorsRef}
                className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
                style={{ overflow: "hidden" }}
              />
            </div>

            <Button
              onClick={handleGeneratePRD}
              disabled={isGenerating}
              className="w-full bg-white text-black hover:bg-gray-200 font-medium py-3"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating PRD...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate PRD
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        {(prdDocument || isGenerating) && (
          <Card className="bg-gray-950 border-gray-800">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-white font-light text-xl">Your Project Requirement Document</CardTitle>
              {prdDocument && !isGenerating && (
                <Button
                  onClick={handleDownloadPDF}
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="bg-black border border-gray-800 rounded-lg p-6 min-h-[400px]">
                <div className="whitespace-pre-wrap text-gray-100 leading-relaxed">
                  {prdDocument ||
                    (isGenerating && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating your comprehensive PRD document...
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
