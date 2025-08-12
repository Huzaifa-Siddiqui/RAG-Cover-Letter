"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Save, X } from "lucide-react"

interface EditDialogProps {
  type: "r1" | "r2" | "r3"
  item: any
  onSave: (item: any) => void
  onCancel: () => void
}

export function EditDialog({ type, item, onSave, onCancel }: EditDialogProps) {
  const [formData, setFormData] = useState<any>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (type === "r1") {
      setFormData({
        id: item.id,
        jobTitle: item.job_title || "",
        jobDescription: item.job_description || "",
        coverLetter: item.cover_letter || "",
      })
    } else if (type === "r2") {
      setFormData({
        id: item.id,
        projectTitle: item.project_title || "",
        projectDescription: item.project_description || "",
      })
    } else if (type === "r3") {
      setFormData({
        id: item.id,
        skillName: item.skill_name || "",
        skillDescription: item.skill_description || "",
      })
    }
  }, [type, item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSave(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDialogConfig = () => {
    switch (type) {
      case "r1":
        return {
          title: "Edit Job Example",
          description: "Update the job example and cover letter details.",
        }
      case "r2":
        return {
          title: "Edit Project",
          description: "Update the project details.",
        }
      case "r3":
        return {
          title: "Edit Skill",
          description: "Update the skill details.",
        }
    }
  }

  const config = getDialogConfig()

  const renderForm = () => {
    if (type === "r1") {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="edit-job-title" className="text-gray-300 text-sm">
              Job Title
            </Label>
            <Input
              id="edit-job-title"
              value={formData.jobTitle || ""}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-job-description" className="text-gray-300 text-sm">
              Job Description
            </Label>
            <Textarea
              id="edit-job-description"
              value={formData.jobDescription || ""}
              onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
              className="min-h-[120px] bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-cover-letter" className="text-gray-300 text-sm">
              Cover Letter
            </Label>
            <Textarea
              id="edit-cover-letter"
              value={formData.coverLetter || ""}
              onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
              className="min-h-[150px] bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
            />
          </div>
        </>
      )
    }

    if (type === "r2") {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="edit-project-title" className="text-gray-300 text-sm">
              Project Title
            </Label>
            <Input
              id="edit-project-title"
              value={formData.projectTitle || ""}
              onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
              className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-project-description" className="text-gray-300 text-sm">
              Project Description
            </Label>
            <Textarea
              id="edit-project-description"
              value={formData.projectDescription || ""}
              onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
              className="min-h-[150px] bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
            />
          </div>
        </>
      )
    }

    if (type === "r3") {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="edit-skill-name" className="text-gray-300 text-sm">
              Skill Name
            </Label>
            <Input
              id="edit-skill-name"
              value={formData.skillName || ""}
              onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
              className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-skill-description" className="text-gray-300 text-sm">
              Skill Description
            </Label>
            <Textarea
              id="edit-skill-description"
              value={formData.skillDescription || ""}
              onChange={(e) => setFormData({ ...formData, skillDescription: e.target.value })}
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
          <DialogTitle className="text-white">{config.title}</DialogTitle>
          <DialogDescription className="text-gray-400">{config.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {renderForm()}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-white text-black hover:bg-gray-200">
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
