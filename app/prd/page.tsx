"use client"

import type React from "react"
import { Input } from "@/components/ui/input"
import { X, Sparkles } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Loader2, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function PRDPage() {
  const [jobDescription, setJobDescription] = useState("")
  const [projectRequirements, setProjectRequirements] = useState("")
  const [otherText, setOtherText] = useState("")
  const [listOfActors, setListOfActors] = useState("")
  const [prdDocument, setPrdDocument] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [actors, setActors] = useState<string[]>([])
  const [isGeneratingActors, setIsGeneratingActors] = useState(false)
  const [newActor, setNewActor] = useState("")
  const { toast } = useToast()

  // Refs for auto-resizing textareas
  const jobDescriptionRef = useRef<HTMLTextAreaElement>(null) as React.RefObject<HTMLTextAreaElement>
  const projectRequirementsRef = useRef<HTMLTextAreaElement>(null) as React.RefObject<HTMLTextAreaElement>
  const otherTextRef = useRef<HTMLTextAreaElement>(null) as React.RefObject<HTMLTextAreaElement>
  const listOfActorsRef = useRef<HTMLTextAreaElement>(null) as React.RefObject<HTMLTextAreaElement>

  // const { user, loading } = useAuth()
  // const router = useRouter()

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

  // Keep listOfActors in sync with tags
  useEffect(() => {
    if (actors.length) {
      setListOfActors(actors.join("\n"))
    } else {
      setListOfActors("")
    }
  }, [actors])

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
          // userId: user?.id,
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
          title: "Project Requirement Document",
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

  // Helper: normalize/clean one actor
  const normalizeActor = (s: string) =>
    s
      .replace(/^[-\d.)\s]+/, "")
      .replace(/\s{2,}/g, " ")
      .trim()

  // Add/remove actor tag
  const addActor = (name: string) => {
    const clean = normalizeActor(name)
    if (!clean) return
    setActors((prev) => {
      const exists = prev.some((a) => a.toLowerCase() === clean.toLowerCase())
      return exists ? prev : [...prev, clean]
    })
  }
  const removeActor = (name: string) => {
    setActors((prev) => prev.filter((a) => a.toLowerCase() !== name.toLowerCase()))
  }

  // Stream actors from API and progressively add tags
  const handleGenerateActors = async () => {
    if (!jobDescription.trim() || !projectRequirements.trim()) {
      toast({
        title: "Error",
        description: "Please enter both job description and project requirements",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingActors(true)
    // Clear existing actors when generating new ones
    setActors([])

    try {
      const response = await fetch("/api/generate-actors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          projectRequirements,
          otherText,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // Decode the chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          // Split by newlines to get complete actor names
          const lines = buffer.split("\n")
          
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || ""

          // Process complete lines (actor names)
          for (const line of lines) {
            const cleanedActor = normalizeActor(line)
            if (cleanedActor) {
              addActor(cleanedActor)
            }
          }
        }

        // Process any remaining content in buffer
        if (buffer.trim()) {
          const cleanedActor = normalizeActor(buffer)
          if (cleanedActor) {
            addActor(cleanedActor)
          }
        }
      }

      toast({
        title: "Success",
        description: `Generated ${actors.length} actor roles`,
      })
    } catch (error) {
      console.error(" Actors generation error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate actors. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingActors(false)
    }
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
  <div className="flex items-center justify-between">
    <Label htmlFor="list-of-actors" className="text-sm">
      List of Actors
    </Label>
    <Button
      type="button"
      onClick={handleGenerateActors}
      disabled={isGeneratingActors || !jobDescription || !projectRequirements}
      variant="outline"
      size="sm"
    >
      {isGeneratingActors ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Suggested Actors...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Suggested Actors
        </>
      )}
    </Button>
  </div>

          <div className="border rounded-md p-2 min-h-[56px] w-full overflow-hidden">
            <div className="flex flex-wrap gap-2 w-full">
              {actors.map((actor) => (
                <span
                  key={actor}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs bg-muted text-foreground shrink-0"
                >
                  {actor}
                  <button
                    type="button"
                    aria-label={`Remove ${actor}`}
                    className="hover:text-destructive"
                    onClick={() => removeActor(actor)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              <Input
                value={newActor}
                onChange={(e) => setNewActor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    if (newActor.trim()) {
                      addActor(newActor)
                      setNewActor("")
                    }
                  }
                }}
                placeholder="Type an actor and press Enter..."
                className="h-7 flex-1 min-w-[150px] max-w-full border-0 focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Keep original textarea in sync (hidden) */}
          <Textarea
            id="list-of-actors"
            value={listOfActors}
            onChange={(e) => {
              setListOfActors(e.target.value)
              const lines = e.target.value
                .split(/\r?\n/)
                .map((l) => normalizeActor(l))
                .filter(Boolean)
              setActors(
                Array.from(new Set(lines.map((l) => l.toLowerCase()))).map(
                  (l) => lines.find((orig) => orig.toLowerCase() === l) || l,
                ),
              )
            }}
            ref={listOfActorsRef}
            className="sr-only"
            readOnly
          />
        </div>
            <Button onClick={handleGeneratePRD} disabled={isGenerating} className="w-full font-medium py-3">
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
                <Button onClick={handleDownloadPDF} variant="outline" size="sm">
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
