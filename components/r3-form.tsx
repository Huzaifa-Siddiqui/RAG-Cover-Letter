"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, X } from "lucide-react"

interface R3FormProps {
  onSuccess?: () => void
}

export function R3Form({ onSuccess }: R3FormProps) {
  const [skillName, setSkillName] = useState("")
  const [skillDescription, setSkillDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!skillName.trim() || !skillDescription.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/knowledge/r3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skillName,
          skillDescription,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save data")
      }

      toast({
        title: "Success",
        description: "Skill saved successfully",
      })

      // Reset form
      setSkillName("")
      setSkillDescription("")

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
        <Label htmlFor="r3-skill-name" className="text-gray-300 text-sm">
          Skill Name
        </Label>
        <Input
          id="r3-skill-name"
          placeholder="e.g., React.js, Project Management, Data Analysis"
          value={skillName}
          onChange={(e) => setSkillName(e.target.value)}
          className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="r3-skill-description" className="text-gray-300 text-sm">
          Skill Description
        </Label>
        <Textarea
          id="r3-skill-description"
          placeholder="Describe your experience and proficiency with this skill. Include specific examples, years of experience, and achievements..."
          value={skillDescription}
          onChange={(e) => setSkillDescription(e.target.value)}
          className="min-h-[120px] bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600 resize-none"
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
              Save Skill
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
