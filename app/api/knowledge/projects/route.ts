import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TABLE_NAME = "projects"

// Helper: normalize a vector for consistent similarity scoring
function normalizeVector(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
  return norm === 0 ? vec : vec.map((v) => v / norm)
}

// 🔹 Create an embedding from OpenAI (text-embedding-3-small)
async function createEmbedding(text: string): Promise<number[]> {
  try {
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small",
      }),
    })

    if (!embeddingResponse.ok) {
      console.error("Embedding API error:", await embeddingResponse.text())
      return []
    }

    const embeddingData = await embeddingResponse.json()
    return normalizeVector(embeddingData.data[0].embedding)
  } catch (err) {
    console.error("Embedding fetch failed:", err)
    return []
  }
}

// GET - Fetch all projects
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

// POST - Create new project
export async function POST(request: NextRequest) {
  try {
    const { projectTitle, projectDescription, projectType } = await request.json()

    if (!projectTitle?.trim() || !projectDescription?.trim() || !projectType?.trim()) {
      return NextResponse.json(
        { success: false, error: "Project title, description, and type are required" },
        { status: 400 }
      )
    }

    // Validate project type
    const validProjectTypes = ["Web", "Mobile", "Web + AI", "AI/ML"]
    if (!validProjectTypes.includes(projectType)) {
      return NextResponse.json(
        { success: false, error: "Invalid project type" },
        { status: 400 }
      )
    }

  
    const combinedText = `Title: ${projectTitle}\nDescription: ${projectDescription}`
    const combinedEmbedding = await createEmbedding(combinedText)

    // Metadata with user-selected project type
    const metadata = {
      projectType, 
   
    }

    const insertData: any = {
      project_title: projectTitle,
      project_description: projectDescription,
      metadata,
    }

    if (combinedEmbedding.length > 0) {
      insertData.combined_embedding = combinedEmbedding
    }

    const { data, error } = await supabase.from(TABLE_NAME).insert(insertData).select()
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in POST projects:", error)
    return NextResponse.json({ success: false, error: "Failed to save project" }, { status: 500 })
  }
}

// PUT - Update existing project
export async function PUT(request: NextRequest) {
  try {
    const { id, projectTitle, projectDescription, projectType } = await request.json()

    if (!id || !projectTitle?.trim() || !projectDescription?.trim() || !projectType?.trim()) {
      return NextResponse.json(
        { success: false, error: "ID, project title, description, and type are required" },
        { status: 400 }
      )
    }

    // Validate project type
    const validProjectTypes = ["Web", "Mobile", "Web + AI", "AI/ML"]
    if (!validProjectTypes.includes(projectType)) {
      return NextResponse.json(
        { success: false, error: "Invalid project type" },
        { status: 400 }
      )
    }

    const combinedText = `Title: ${projectTitle}\nDescription: ${projectDescription}`
    const combinedEmbedding = await createEmbedding(combinedText)

    const metadata = {  
      projectType, 
    }

    const updateData: any = {
      project_title: projectTitle,
      project_description: projectDescription,
      metadata,
    }

    if (combinedEmbedding.length > 0) {
      updateData.combined_embedding = combinedEmbedding
    }

    const { data, error } = await supabase.from(TABLE_NAME).update(updateData).eq("id", id).select()
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT projects:", error)
    return NextResponse.json({ success: false, error: "Failed to update project" }, { status: 500 })
  }
}

// DELETE - Delete project
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 })
    }

    const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE projects:", error)
    return NextResponse.json({ success: false, error: "Failed to delete project" }, { status: 500 })
  }
}

