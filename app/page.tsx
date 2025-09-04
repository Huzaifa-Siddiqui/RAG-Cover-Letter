"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Send, Loader2, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ChatPage() {
  const [jobDescription, setJobDescription] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [clientName, setClientName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const { toast } = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto" // Reset height
      textarea.style.height = `${textarea.scrollHeight}px` // Set to scroll height
    }
  }, [jobDescription])

  const handleGenerate = async () => {
    if (!jobTitle.trim() || !jobDescription.trim()) {
      toast({
        title: "Error",
        description: "Please enter both job title and description",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setCoverLetter("")

    try {
      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobTitle,
          jobDescription,
          clientName,
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
                  setCoverLetter((prev) => prev + parsed.content)
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Generation error:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate cover letter. Please check your API configuration and try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black">
        <div className="flex items-center gap-4 p-6">
          <SidebarTrigger className="text-white hover:bg-gray-900" />
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-white" />
            <h1 className="text-2xl font-light text-white">Cover Letter Generator</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Input Section */}
        <Card className="bg-gray-950 border-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-white font-light text-xl">Generate Your Cover Letter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="client-name" className="text-gray-300 text-sm">
                Client Name (Optional)
              </Label>
              <Input
                id="client-name"
                placeholder="e.g., Sarah Johnson"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-title" className="text-gray-300 text-sm">
                Job Title
              </Label>
              <Input
                id="job-title"
                placeholder="e.g., Senior Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-description" className="text-gray-300 text-sm">
                Job Description
              </Label>
              <Textarea
                id="job-description"
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                ref={textareaRef}
                className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
                style={{ overflow: "hidden" }} // Hide scrollbar
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-white text-black hover:bg-gray-200 font-medium py-3"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Generate Cover Letter
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        {(coverLetter || isGenerating) && (
          <Card className="bg-gray-950 border-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-white font-light text-xl">Your Cover Letter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black border border-gray-800 rounded-lg p-6 min-h-[400px]">
                <div className="whitespace-pre-wrap text-gray-100 leading-relaxed">
                  {coverLetter ||
                    (isGenerating && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating your personalized cover letter...
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