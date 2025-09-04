import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const TABLE_NAME = "skills"

// GET - Fetch all skills
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error fetching skills:", error)
    return NextResponse.json({ error: "Failed to fetch skills" }, { status: 500 })
  }
}

// POST - Create new skill
export async function POST(request: NextRequest) {
  try {
    const { skillName, skillDescription } = await request.json()

    if (!skillName?.trim() || !skillDescription?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Skill name and description are required' },
        { status: 400 }
      )
    }

    // Create combined embedding for skill name + skill description
    let combinedEmbedding: number[] = []

    try {
      const combinedText = `${skillName} ${skillDescription}`

      const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: combinedText,
          model: "text-embedding-ada-002",
        }),
      })

      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json()
        combinedEmbedding = embeddingData.data[0].embedding
      }
    } catch (embeddingError) {
      console.warn('Failed to create embedding:', embeddingError)
      // Continue without embedding
    }

    // Extract metadata
    const metadata = {
      skillName,
      skillCategory: extractSkillCategory(skillName, skillDescription),
      proficiencyLevel: extractProficiencyLevel(skillDescription),
      yearsOfExperience: extractYearsOfExperience(skillDescription),
      descriptionLength: skillDescription.length,
      hasEmbedding: combinedEmbedding.length > 0,
      createdAt: new Date().toISOString(),
    }

    const insertData: any = {
      skill_name: skillName,
      skill_description: skillDescription,
      metadata,
    }

    // Only add embedding if it was successfully created
    if (combinedEmbedding.length > 0) {
      insertData.combined_embedding = combinedEmbedding
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(insertData)
      .select()

    if (error) {
      console.error("Error saving skill:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in POST skills:", error)
    return NextResponse.json({ success: false, error: "Failed to save skill" }, { status: 500 })
  }
}

// PUT - Update existing skill
export async function PUT(request: NextRequest) {
  try {
    const { id, skillName, skillDescription } = await request.json()

    if (!id || !skillName?.trim() || !skillDescription?.trim()) {
      return NextResponse.json(
        { success: false, error: 'ID, skill name, and description are required' },
        { status: 400 }
      )
    }

    // Create combined embedding for updated data
    let combinedEmbedding: number[] = []

    try {
      const combinedText = `${skillName} ${skillDescription}`

      const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: combinedText,
          model: "text-embedding-ada-002",
        }),
      })

      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json()
        combinedEmbedding = embeddingData.data[0].embedding
      }
    } catch (embeddingError) {
      console.warn('Failed to create embedding:', embeddingError)
    }

    // Update metadata
    const metadata = {
      skillName,
      skillCategory: extractSkillCategory(skillName, skillDescription),
      proficiencyLevel: extractProficiencyLevel(skillDescription),
      yearsOfExperience: extractYearsOfExperience(skillDescription),
      descriptionLength: skillDescription.length,
      hasEmbedding: combinedEmbedding.length > 0,
      updatedAt: new Date().toISOString(),
    }

    const updateData: any = {
      skill_name: skillName,
      skill_description: skillDescription,
      metadata,
    }

    if (combinedEmbedding.length > 0) {
      updateData.combined_embedding = combinedEmbedding
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updateData)
      .eq("id", id)
      .select()

    if (error) {
      console.error("Error updating skill:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT skills:", error)
    return NextResponse.json({ success: false, error: "Failed to update skill" }, { status: 500 })
  }
}

// DELETE - Delete skill
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id)
    
    if (error) {
      console.error("Error deleting skill:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE skills:", error)
    return NextResponse.json({ success: false, error: "Failed to delete skill" }, { status: 500 })
  }
}

// Helper functions
function extractSkillCategory(skillName: string, description: string): string {
  const text = (skillName + " " + description).toLowerCase()

  if (text.includes("programming") || text.includes("coding") || text.includes("development")) return "Programming"
  if (text.includes("design") || text.includes("ui") || text.includes("ux")) return "Design"
  if (text.includes("management") || text.includes("leadership") || text.includes("team")) return "Management"
  if (text.includes("marketing") || text.includes("social media") || text.includes("seo")) return "Marketing"
  if (text.includes("data") || text.includes("analytics") || text.includes("statistics")) return "Data Analysis"
  if (text.includes("communication") || text.includes("presentation") || text.includes("writing"))
    return "Communication"

  return "General"
}

function extractProficiencyLevel(description: string): string {
  const text = description.toLowerCase()

  if (text.includes("expert") || text.includes("advanced") || text.includes("senior")) return "Expert"
  if (text.includes("intermediate") || text.includes("proficient") || text.includes("experienced"))
    return "Intermediate"
  if (text.includes("beginner") || text.includes("basic") || text.includes("learning")) return "Beginner"

  return "Intermediate" // Default
}

function extractYearsOfExperience(description: string): string | null {
  const text = description.toLowerCase()
  
  // Look for patterns like "5 years", "2+ years", "over 3 years", etc.
  const yearMatches = text.match(/(\d+)[\s\+]*years?/i)
  if (yearMatches) {
    return yearMatches[1]
  }
  
  return null
}