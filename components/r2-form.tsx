"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, X } from "lucide-react"

interface R2FormProps {
  onSuccess?: () => void
  // For edit mode
  initialData?: {
    projectTitle: string
    projectDescription: string
    projectType: string
    id?: string
  }
  mode?: "create" | "edit"
}

const PROJECT_TYPES = [
  { value: "Web", label: "Web" },
  { value: "Mobile", label: "Mobile" },
  { value: "Web + AI", label: "Web + AI" },
  { value: "AI/ML", label: "AI/ML" },
]

export function R2Form({ onSuccess, initialData, mode = "create" }: R2FormProps) {
  const [projectTitle, setProjectTitle] = useState(initialData?.projectTitle || "")
  const [projectDescription, setProjectDescription] = useState(initialData?.projectDescription || "")
  const [projectType, setProjectType] = useState(initialData?.projectType || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectTitle.trim() || !projectDescription.trim() || !projectType.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields including project type",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const url = `/api/knowledge/projects`
      const method = mode === "edit" ? "PUT" : "POST"
      
      const requestBody: any = {
        projectTitle,
        projectDescription,
        projectType,
      }

      if (mode === "edit" && initialData?.id) {
        requestBody.id = initialData.id
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save data")
      }

      toast({
        title: "Success",
        description: mode === "edit" ? "Project updated successfully" : "Project saved successfully",
      })

      // Reset form only in create mode
      if (mode === "create") {
        setProjectTitle("")
        setProjectDescription("")
        setProjectType("")
      }

      // Call success callback
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="r2-project-title" className="text-gray-300 text-sm">
          Project Title
        </Label>
        <Input
          id="r2-project-title"
          placeholder="e.g., E-commerce Platform Development, Marketing Campaign Management"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="r2-project-type" className="text-gray-300 text-sm">
          Project Type
        </Label>
        <Select value={projectType} onValueChange={setProjectType}>
          <SelectTrigger className="bg-black border-gray-700 text-white focus:border-gray-600">
            <SelectValue placeholder="Select project type" />
          </SelectTrigger>
          <SelectContent className="bg-black border-gray-700">
            {PROJECT_TYPES.map((type) => (
              <SelectItem 
                key={type.value} 
                value={type.value}
                className="text-white hover:bg-gray-800 focus:bg-gray-800"
              >
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="r2-project-description" className="text-gray-300 text-sm">
          Project Description
        </Label>
        <Textarea
          id="r2-project-description"
          placeholder="Describe the successful project you completed. Include key responsibilities, technologies used, outcomes achieved, and impact..."
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.target.value)}
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
              {mode === "edit" ? "Updating..." : "Saving..."}
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              {mode === "edit" ? "Update Project" : "Save Successful Project"}
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