import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const TABLE_NAME = "projects"

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
    const { projectTitle, projectDescription } = await request.json()

    if (!projectTitle?.trim() || !projectDescription?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Project title and description are required' },
        { status: 400 }
      )
    }

    // Create combined embedding for project title + project description
    let combinedEmbedding: number[] = []

    try {
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
      projectTitle,
      projectType: extractProjectType(projectTitle, projectDescription),
      technologies: extractTechnologiesFromProject(projectDescription),
      wordCount: projectDescription.split(" ").length,
      hasEmbedding: combinedEmbedding.length > 0,
      createdAt: new Date().toISOString(),
    }

    const insertData: any = {
      project_title: projectTitle,
      project_description: projectDescription,
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
      console.error("Error saving project:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in POST projects:", error)
    return NextResponse.json({ success: false, error: "Failed to save project" }, { status: 500 })
  }
}

// PUT - Update existing project
export async function PUT(request: NextRequest) {
  try {
    const { id, projectTitle, projectDescription } = await request.json()

    if (!id || !projectTitle?.trim() || !projectDescription?.trim()) {
      return NextResponse.json(
        { success: false, error: 'ID, project title, and description are required' },
        { status: 400 }
      )
    }

    // Create combined embedding for updated data
    let combinedEmbedding: number[] = []

    try {
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

      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json()
        combinedEmbedding = embeddingData.data[0].embedding
      }
    } catch (embeddingError) {
      console.warn('Failed to create embedding:', embeddingError)
    }

    // Update metadata
    const metadata = {
      projectTitle,
      projectType: extractProjectType(projectTitle, projectDescription),
      technologies: extractTechnologiesFromProject(projectDescription),
      wordCount: projectDescription.split(" ").length,
      hasEmbedding: combinedEmbedding.length > 0,
      updatedAt: new Date().toISOString(),
    }

    const updateData: any = {
      project_title: projectTitle,
      project_description: projectDescription,
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
      console.error("Error updating project:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

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
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id)
    
    if (error) {
      console.error("Error deleting project:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE projects:", error)
    return NextResponse.json({ success: false, error: "Failed to delete project" }, { status: 500 })
  }
}

// Helper functions
function extractProjectType(title: string, description: string): string {
  const text = (title + " " + description).toLowerCase()

  if (text.includes("ai") || text.includes("machine learning") || text.includes("deep learning")) return "AI/ML"

  if (text.includes("web") || text.includes("react") || text.includes("frontend") || text.includes("backend"))
    return "Web Development"

  if (text.includes("mobile") || text.includes("ios") || text.includes("android") || text.includes("flutter"))
    return "Mobile Development"

  return "General"
}

function extractTechnologiesFromProject(description: string): string[] {
  const text = description.toLowerCase()
  const techKeywords = [
    "javascript",
    "typescript",
    "python",
    "java",
    "php",
    "ruby",
    "go",
    "rust",
    "swift",
    "kotlin",
    "c++",
    "c#",
    "react",
    "vue",
    "angular",
    "svelte",
    "next.js",
    "nuxt.js",
    "gatsby",
    "node.js",
    "express",
    "django",
    "flask",
    "spring",
    "laravel",
    "rails",
    "fastapi",
    "nest.js",
    "flutter",
    "react native",
    "ionic",
    "xamarin",
    "mongodb",
    "postgresql",
    "mysql",
    "redis",
    "elasticsearch",
    "firebase",
    "supabase",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "terraform",
    "tensorflow",
    "pytorch",
    "scikit-learn",
    "pandas",
    "numpy",
    "html",
    "css",
    "sass",
    "graphql",
    "rest api",
    "websockets",
  ]

  const technologies = techKeywords.filter((tech) => text.includes(tech))
  return [...new Set(technologies)].slice(0, 10)
}