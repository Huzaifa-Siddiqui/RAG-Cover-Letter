"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, X } from "lucide-react"

interface EditDialogProps {
  type: "r1" | "r2" | "r3"
  item: any
  onSave: (item: any) => void
  onCancel: () => void
}

const PROJECT_TYPES = [
  { value: "Web", label: "Web" },
  { value: "Mobile", label: "Mobile" },
  { value: "Web + AI", label: "Web + AI" },
  { value: "AI/ML", label: "AI/ML" },
]

export function EditDialog({ type, item, onSave, onCancel }: EditDialogProps) {
  const [formData, setFormData] = useState<any>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (item) {
      setFormData({ ...item })
    }
  }, [item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Convert database field names to API field names before sending
    const apiData = convertToApiFormat(formData, type)
    
    await onSave(apiData)
    setIsSubmitting(false)
  }

  // Convert database field names to API expected field names
  const convertToApiFormat = (data: any, type: "r1" | "r2" | "r3") => {
    switch (type) {
      case "r1":
        return {
          id: data.id,
          jobTitle: data.job_title,
          jobDescription: data.job_description,
          coverLetter: data.cover_letter
        }
      case "r2":
        return {
          id: data.id,
          projectTitle: data.project_title,
          projectDescription: data.project_description,
          projectType: data.project_type || data.metadata?.projectType // Handle both direct field and metadata
        }
      case "r3":
        return {
          id: data.id,
          skillName: data.skill_name,
          skillDescription: data.skill_description
        }
      default:
        return data
    }
  }

  const getTitle = () => {
    switch (type) {
      case "r1":
        return "Edit Job Example"
      case "r2":
        return "Edit Project"
      case "r3":
        return "Edit Skill"
    }
  }

  const renderFields = () => {
    switch (type) {
      case "r1":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="edit-job-title" className="text-gray-300 text-sm">
                Job Title
              </Label>
              <Input
                id="edit-job-title"
                value={formData.job_title || ""}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-job-description" className="text-gray-300 text-sm">
                Job Description
              </Label>
              <Textarea
                id="edit-job-description"
                value={formData.job_description || ""}
                onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                className="min-h-[120px] bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cover-letter" className="text-gray-300 text-sm">
                Cover Letter
              </Label>
              <Textarea
                id="edit-cover-letter"
                value={formData.cover_letter || ""}
                onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
                className="min-h-[150px] bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
              />
            </div>
          </>
        )
      case "r2":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="edit-project-title" className="text-gray-300 text-sm">
                Project Title
              </Label>
              <Input
                id="edit-project-title"
                value={formData.project_title || ""}
                onChange={(e) => setFormData({ ...formData, project_title: e.target.value })}
                className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-project-type" className="text-gray-300 text-sm">
                Project Type
              </Label>
              <Select 
                value={formData.project_type || formData.metadata?.projectType || ""} 
                onValueChange={(value) => setFormData({ ...formData, project_type: value })}
              >
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
              <Label htmlFor="edit-project-description" className="text-gray-300 text-sm">
                Project Description
              </Label>
              <Textarea
                id="edit-project-description"
                value={formData.project_description || ""}
                onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
                className="min-h-[150px] bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
              />
            </div>
          </>
        )
      case "r3":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="edit-skill-name" className="text-gray-300 text-sm">
                Skill Name
              </Label>
              <Input
                id="edit-skill-name"
                value={formData.skill_name || ""}
                onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
                className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-skill-description" className="text-gray-300 text-sm">
                Skill Description
              </Label>
              <Textarea
                id="edit-skill-description"
                value={formData.skill_description || ""}
                onChange={(e) => setFormData({ ...formData, skill_description: e.target.value })}
                className="min-h-[120px] bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
              />
            </div>
          </>
        )
    }
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">{getTitle()}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {renderFields()}
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
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}