import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getTableName(category: string): string {
  const validCategories = ["mobile", "web", "ai"]
  if (!validCategories.includes(category.toLowerCase())) {
    throw new Error(`Invalid category: ${category}`)
  }
  return `${category.toLowerCase()}_r2_projects`
}

// GET - Fetch all R2 records for specific category
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await context.params
    const tableName = getTableName(category)

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error fetching R2 data:", error)
    return NextResponse.json({ error: "Failed to fetch R2 data" }, { status: 500 })
  }
}

// POST - Create new R2 record for specific category
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await context.params
    const tableName = getTableName(category)
    const { projectTitle, projectDescription } = await request.json()

    // Create combined embedding for project title + project description
    const combinedText = `${projectTitle} ${projectDescription}`

    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: combinedText,
        model: "text-embedding-ada-002",   // ✅ updated model
      }),
    })

    if (!embeddingResponse.ok) throw new Error("Failed to create embeddings")

    const embeddingData = await embeddingResponse.json()
    const combinedEmbedding = embeddingData.data[0].embedding

    // Extract metadata
    const metadata = {
      projectTitle,
      category,
      projectType: extractProjectType(projectTitle, projectDescription),
      technologies: extractTechnologiesFromProject(projectDescription),
      wordCount: projectDescription.split(" ").length,
      createdAt: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert({
        project_title: projectTitle,
        project_description: projectDescription,
        combined_embedding: combinedEmbedding,
        metadata,
      })
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error saving R2 data:", error)
    return NextResponse.json({ error: "Failed to save R2 data" }, { status: 500 })
  }
}

// PUT - Update existing R2 record for specific category
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await context.params
    const tableName = getTableName(category)
    const { id, projectTitle, projectDescription } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "ID is required for update" }, { status: 400 })
    }

    // Create combined embedding for updated data
    const combinedText = `${projectTitle} ${projectDescription}`

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

    if (!embeddingResponse.ok) throw new Error("Failed to create embeddings")

    const embeddingData = await embeddingResponse.json()
    const combinedEmbedding = embeddingData.data[0].embedding

    // Update metadata
    const metadata = {
      projectTitle,
      category,
      projectType: extractProjectType(projectTitle, projectDescription),
      technologies: extractTechnologiesFromProject(projectDescription),
      wordCount: projectDescription.split(" ").length,
      updatedAt: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from(tableName)
      .update({
        project_title: projectTitle,
        project_description: projectDescription,
        combined_embedding: combinedEmbedding,
        metadata,
      })
      .eq("id", id)
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error updating R2 data:", error)
    return NextResponse.json({ error: "Failed to update R2 data" }, { status: 500 })
  }
}

// DELETE - Delete R2 record for specific category
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await context.params
    const tableName = getTableName(category)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required for deletion" }, { status: 400 })
    }

    const { error } = await supabase.from(tableName).delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true, message: "R2 record deleted successfully" })
  } catch (error) {
    console.error("Error deleting R2 data:", error)
    return NextResponse.json({ error: "Failed to delete R2 data" }, { status: 500 })
  }
}

// Helper functions
function extractProjectType(title: string, description: string): string {
  const text = (title + " " + description).toLowerCase()

  if (text.includes("ai") || text.includes("machine learning") || text.includes("deep learning"))
    return "AI/ML"

  if (text.includes("web") || text.includes("react") || text.includes("frontend") || text.includes("backend"))
    return "Web Development"

  if (text.includes("mobile") || text.includes("ios") || text.includes("android") || text.includes("flutter"))
    return "Mobile Development"

  return "General"
}

function extractTechnologiesFromProject(description: string): string[] {
  const text = description.toLowerCase()
  const techKeywords = [
    "javascript","typescript","python","java","php","ruby","go","rust","swift","kotlin","c++","c#",
    "react","vue","angular","svelte","next.js","nuxt.js","gatsby",
    "node.js","express","django","flask","spring","laravel","rails","fastapi","nest.js",
    "flutter","react native","ionic","xamarin",
    "mongodb","postgresql","mysql","redis","elasticsearch","firebase","supabase",
    "aws","azure","gcp","docker","kubernetes","terraform",
    "tensorflow","pytorch","scikit-learn","pandas","numpy",
    "html","css","sass","graphql","rest api","websockets"
  ]

  const technologies = techKeywords.filter((tech) => text.includes(tech))
  return [...new Set(technologies)].slice(0, 10)
}
