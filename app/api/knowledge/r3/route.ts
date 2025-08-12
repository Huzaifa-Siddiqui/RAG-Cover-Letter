import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// GET - Fetch all R3 records
export async function GET() {
  try {
    const { data, error } = await supabase.from("r3_skills").select("*").order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error fetching R3 data:", error)
    return NextResponse.json({ error: "Failed to fetch R3 data" }, { status: 500 })
  }
}

// POST - Create new R3 record
export async function POST(request: NextRequest) {
  try {
    const { skillName, skillDescription } = await request.json()

    // Create combined embedding for skill name + skill description
    const combinedText = `${skillName} ${skillDescription}`

    const embeddingResponse = await fetch("https://api.cohere.ai/v1/embed", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        texts: [combinedText],
        model: "embed-english-v3.0",
        input_type: "search_document",
      }),
    })

    if (!embeddingResponse.ok) {
      throw new Error("Failed to create embeddings")
    }

    const embeddingData = await embeddingResponse.json()
    const combinedEmbedding = embeddingData.embeddings[0]

    // Extract metadata
    const metadata = {
      skillName,
      skillCategory: extractSkillCategory(skillName, skillDescription),
      proficiencyLevel: extractProficiencyLevel(skillDescription),
      descriptionLength: skillDescription.length,
      createdAt: new Date().toISOString(),
    }

    // Store in Supabase with new schema
    const { data, error } = await supabase
      .from("r3_skills")
      .insert({
        skill_name: skillName,
        skill_description: skillDescription,
        combined_embedding: combinedEmbedding,
        metadata,
      })
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error saving R3 data:", error)
    return NextResponse.json({ error: "Failed to save R3 data" }, { status: 500 })
  }
}

// PUT - Update existing R3 record
export async function PUT(request: NextRequest) {
  try {
    const { id, skillName, skillDescription } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "ID is required for update" }, { status: 400 })
    }

    // Create combined embedding for updated data
    const combinedText = `${skillName} ${skillDescription}`

    const embeddingResponse = await fetch("https://api.cohere.ai/v1/embed", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        texts: [combinedText],
        model: "embed-english-v3.0",
        input_type: "search_document",
      }),
    })

    if (!embeddingResponse.ok) {
      throw new Error("Failed to create embeddings")
    }

    const embeddingData = await embeddingResponse.json()
    const combinedEmbedding = embeddingData.embeddings[0]

    // Update metadata
    const metadata = {
      skillName,
      skillCategory: extractSkillCategory(skillName, skillDescription),
      proficiencyLevel: extractProficiencyLevel(skillDescription),
      descriptionLength: skillDescription.length,
      updatedAt: new Date().toISOString(),
    }

    // Update in Supabase
    const { data, error } = await supabase
      .from("r3_skills")
      .update({
        skill_name: skillName,
        skill_description: skillDescription,
        combined_embedding: combinedEmbedding,
        metadata,
      })
      .eq("id", id)
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error updating R3 data:", error)
    return NextResponse.json({ error: "Failed to update R3 data" }, { status: 500 })
  }
}

// DELETE - Delete R3 record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required for deletion" }, { status: 400 })
    }

    const { error } = await supabase.from("r3_skills").delete().eq("id", id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, message: "R3 record deleted successfully" })
  } catch (error) {
    console.error("Error deleting R3 data:", error)
    return NextResponse.json({ error: "Failed to delete R3 data" }, { status: 500 })
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
