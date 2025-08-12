"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
// Removed Label import as it is replaced with a native label element
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, X } from "lucide-react"

interface R1FormProps {
  onSuccess?: () => void
}

export function R1Form({ onSuccess }: R1FormProps) {
  const [jobTitle, setJobTitle] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!jobTitle.trim() || !jobDescription.trim() || !coverLetter.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/knowledge/r1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobTitle,
          jobDescription,
          coverLetter,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save data")
      }

      toast({
        title: "Success",
        description: "Job example with cover letter saved successfully",
      })

      // Reset form
      setJobTitle("")
      setJobDescription("")
      setCoverLetter("")

      // Call success callback
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="r1-job-title" className="text-gray-300 text-sm">
          Job Title
        </label>
        <Input
          id="r1-job-title"
          value={jobTitle}
          onChange={(e) => setJobTitle((e.target as HTMLInputElement).value)}
          className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="r1-job-description" className="text-gray-300 text-sm">
          Job Description
        </label>
        <Textarea
          id="r1-job-description"
          placeholder="Enter the complete job description..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="min-h-[120px] bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="r1-cover-letter" className="text-gray-300 text-sm">
          Cover Letter
        </label>
        <Textarea
          id="r1-cover-letter"
          placeholder="Enter the cover letter that was successful for this job..."
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          className="min-h-[150px] bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-white text-black hover:bg-gray-200 font-medium"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Save Job Example
            </>
          )}
        </Button>
        {onSuccess && (
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  )
}
