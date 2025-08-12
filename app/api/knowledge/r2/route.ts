import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// GET - Fetch all R2 records
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("r2_past_projects")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error fetching R2 data:", error)
    return NextResponse.json({ error: "Failed to fetch R2 data" }, { status: 500 })
  }
}

// POST - Create new R2 record
export async function POST(request: NextRequest) {
  try {
    const { projectTitle, projectDescription } = await request.json()

    // Create combined embedding for project title + project description
    const combinedText = `${projectTitle} ${projectDescription}`

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

    // Extract metadata with technologies from project description
    const metadata = {
      projectTitle,
      projectType: extractProjectType(projectTitle, projectDescription),
      technologies: extractTechnologiesFromProject(projectDescription), // Updated function
      wordCount: projectDescription.split(" ").length,
      createdAt: new Date().toISOString(),
    }

    // Store in Supabase with new schema
    const { data, error } = await supabase
      .from("r2_past_projects")
      .insert({
        project_title: projectTitle,
        project_description: projectDescription,
        combined_embedding: combinedEmbedding,
        metadata,
      })
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error saving R2 data:", error)
    return NextResponse.json({ error: "Failed to save R2 data" }, { status: 500 })
  }
}

// PUT - Update existing R2 record
export async function PUT(request: NextRequest) {
  try {
    const { id, projectTitle, projectDescription } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "ID is required for update" }, { status: 400 })
    }

    // Create combined embedding for updated data
    const combinedText = `${projectTitle} ${projectDescription}`

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

    // Update metadata with technologies from project description
    const metadata = {
      projectTitle,
      projectType: extractProjectType(projectTitle, projectDescription),
      technologies: extractTechnologiesFromProject(projectDescription), // Updated function
      wordCount: projectDescription.split(" ").length,
      updatedAt: new Date().toISOString(),
    }

    // Update in Supabase
    const { data, error } = await supabase
      .from("r2_past_projects")
      .update({
        project_title: projectTitle,
        project_description: projectDescription,
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
    console.error("Error updating R2 data:", error)
    return NextResponse.json({ error: "Failed to update R2 data" }, { status: 500 })
  }
}

// DELETE - Delete R2 record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required for deletion" }, { status: 400 })
    }

    const { error } = await supabase.from("r2_past_projects").delete().eq("id", id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, message: "R2 record deleted successfully" })
  } catch (error) {
    console.error("Error deleting R2 data:", error)
    return NextResponse.json({ error: "Failed to delete R2 data" }, { status: 500 })
  }
}

// Helper functions
function extractProjectType(title: string, description: string): string {
  const text = (title + " " + description).toLowerCase()

  // AI/ML Detection
  if (
    text.includes("ai") ||
    text.includes("artificial intelligence") ||
    text.includes("machine learning") ||
    text.includes("ml") ||
    text.includes("deep learning") ||
    text.includes("neural network") ||
    text.includes("data science") ||
    text.includes("nlp") ||
    text.includes("computer vision") ||
    text.includes("tensorflow") ||
    text.includes("pytorch") ||
    text.includes("scikit-learn")
  ) {
    return "AI/ML"
  }

  // Web Development Detection
  if (
    text.includes("web") ||
    text.includes("frontend") ||
    text.includes("backend") ||
    text.includes("full stack") ||
    text.includes("react") ||
    text.includes("vue") ||
    text.includes("angular") ||
    text.includes("javascript") ||
    text.includes("html") ||
    text.includes("css") ||
    text.includes("node.js") ||
    text.includes("express")
  ) {
    return "Web Development"
  }

  // Mobile Development Detection
  if (
    text.includes("mobile") ||
    text.includes("app") ||
    text.includes("ios") ||
    text.includes("android") ||
    text.includes("flutter") ||
    text.includes("react native") ||
    text.includes("swift") ||
    text.includes("kotlin")
  ) {
    return "Mobile Development"
  }

  // Data Science Detection
  if (
    text.includes("data") ||
    text.includes("analytics") ||
    text.includes("statistics") ||
    text.includes("sql") ||
    text.includes("python") ||
    text.includes("r ") ||
    text.includes("tableau") ||
    text.includes("power bi") ||
    text.includes("data warehouse")
  ) {
    return "Data Science"
  }

  // DevOps Detection
  if (
    text.includes("devops") ||
    text.includes("cloud") ||
    text.includes("aws") ||
    text.includes("azure") ||
    text.includes("gcp") ||
    text.includes("docker") ||
    text.includes("kubernetes") ||
    text.includes("ci/cd") ||
    text.includes("terraform")
  ) {
    return "DevOps"
  }

  // Design Detection
  if (
    text.includes("design") ||
    text.includes("ui") ||
    text.includes("ux") ||
    text.includes("figma") ||
    text.includes("photoshop") ||
    text.includes("sketch")
  ) {
    return "Design"
  }

  // Management Detection
  if (
    text.includes("management") ||
    text.includes("project") ||
    text.includes("team") ||
    text.includes("leadership") ||
    text.includes("scrum") ||
    text.includes("agile")
  ) {
    return "Management"
  }

  // Marketing Detection
  if (
    text.includes("marketing") ||
    text.includes("campaign") ||
    text.includes("social media") ||
    text.includes("seo") ||
    text.includes("content") ||
    text.includes("advertising")
  ) {
    return "Marketing"
  }

  return "General"
}

// Updated function to extract technologies from project description
function extractTechnologiesFromProject(description: string): string[] {
  const text = description.toLowerCase()
  const technologies: string[] = []

  const techKeywords = [
    // Programming Languages
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
    "scala",
    "r",

    // Frontend Frameworks/Libraries
    "react",
    "vue",
    "angular",
    "svelte",
    "next.js",
    "nuxt.js",
    "gatsby",

    // Backend Frameworks
    "node.js",
    "express",
    "django",
    "flask",
    "spring",
    "laravel",
    "rails",
    "gin",
    "fastapi",
    "nest.js",

    // Mobile Development
    "flutter",
    "react native",
    "ionic",
    "xamarin",

    // Databases
    "mongodb",
    "postgresql",
    "mysql",
    "redis",
    "elasticsearch",
    "cassandra",
    "dynamodb",
    "firebase",
    "supabase",
    "sql server",
    "oracle",

    // Cloud & DevOps
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "terraform",
    "jenkins",
    "gitlab ci",
    "github actions",
    "ansible",
    "chef",
    "puppet",

    // AI/ML
    "tensorflow",
    "pytorch",
    "scikit-learn",
    "pandas",
    "numpy",
    "jupyter",
    "keras",
    "opencv",
    "hugging face",
    "langchain",

    // Design Tools
    "figma",
    "photoshop",
    "sketch",
    "adobe xd",
    "illustrator",
    "canva",

    // Analytics & BI
    "tableau",
    "power bi",
    "looker",
    "google analytics",
    "mixpanel",

    // Web Technologies
    "html",
    "css",
    "sass",
    "less",
    "webpack",
    "vite",
    "babel",
    "graphql",
    "rest api",
    "websockets",
    "microservices",
    "serverless",

    // Testing
    "jest",
    "cypress",
    "selenium",
    "pytest",
    "junit",
    "mocha",

    // Project Management
    "jira",
    "confluence",
    "trello",
    "asana",
    "notion",
    "slack",

    // Version Control
    "git",
    "github",
    "gitlab",
    "bitbucket",
    "svn",
  ]

  techKeywords.forEach((tech) => {
    if (text.includes(tech)) {
      technologies.push(tech)
    }
  })

  // Remove duplicates and return top 10 most relevant
  return [...new Set(technologies)].slice(0, 10)
}
