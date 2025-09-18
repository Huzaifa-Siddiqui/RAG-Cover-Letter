import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TABLE_NAME = "skills"

// --- Utility: normalize embeddings (L2 norm) ---
function normalizeEmbedding(embedding: number[]): number[] {
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  return embedding.map((val) => val / norm)
}

// --- GET all skills ---
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

// --- POST new skill ---
export async function POST(request: NextRequest) {
  try {
    const { skillName, skillDescription } = await request.json()
    if (!skillName?.trim() || !skillDescription?.trim()) {
      return NextResponse.json({ success: false, error: 'Skill name and description are required' }, { status: 400 })
    }

    let combinedEmbedding: number[] = []
    try {
      const combinedText = `${skillName}. ${skillDescription}`.trim()
      const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: combinedText,
          model: "text-embedding-3-small",
        }),
      })
      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json()
        combinedEmbedding = normalizeEmbedding(embeddingData.data[0].embedding)
      }
    } catch (embeddingError) {
      console.warn("Failed to create embedding:", embeddingError)
    }

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
    if (combinedEmbedding.length > 0) insertData.combined_embedding = combinedEmbedding

    const { data, error } = await supabase.from(TABLE_NAME).insert(insertData).select()
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

// --- PUT update skill ---
export async function PUT(request: NextRequest) {
  try {
    const { id, skillName, skillDescription } = await request.json()
    if (!id || !skillName?.trim() || !skillDescription?.trim()) {
      return NextResponse.json({ success: false, error: 'ID, skill name, and description are required' }, { status: 400 })
    }

    let combinedEmbedding: number[] = []
    try {
      const combinedText = `${skillName}. ${skillDescription}`.trim()
      const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: combinedText,
          model: "text-embedding-3-small",
        }),
      })
      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json()
        combinedEmbedding = normalizeEmbedding(embeddingData.data[0].embedding)
      }
    } catch (embeddingError) {
      console.warn("Failed to create embedding:", embeddingError)
    }

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
    if (combinedEmbedding.length > 0) updateData.combined_embedding = combinedEmbedding

    const { data, error } = await supabase.from(TABLE_NAME).update(updateData).eq("id", id).select()
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

// --- DELETE skill ---
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })

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

// --- Helpers ---
function extractSkillCategory(skillName: string, description: string): string {
  const text = (skillName + " " + description).toLowerCase()
  if (text.includes("programming") || text.includes("coding") || text.includes("development")) return "Programming"
  if (text.includes("design") || text.includes("ui") || text.includes("ux")) return "Design"
  if (text.includes("management") || text.includes("leadership") || text.includes("team")) return "Management"
  if (text.includes("marketing") || text.includes("social media") || text.includes("seo")) return "Marketing"
  if (text.includes("data") || text.includes("analytics") || text.includes("statistics")) return "Data Analysis"
  if (text.includes("communication") || text.includes("presentation") || text.includes("writing")) return "Communication"
  return "General"
}

function extractProficiencyLevel(description: string): string {
  const text = description.toLowerCase()
  if (text.includes("expert") || text.includes("advanced") || text.includes("senior")) return "Expert"
  if (text.includes("intermediate") || text.includes("proficient") || text.includes("experienced")) return "Intermediate"
  if (text.includes("beginner") || text.includes("basic") || text.includes("learning")) return "Beginner"
  return "Intermediate"
}

function extractYearsOfExperience(description: string): string | null {
  const text = description.toLowerCase()
  const yearMatches = text.match(/(\d+)[\s\+]*years?/i)
  return yearMatches ? yearMatches[1] : null
}
