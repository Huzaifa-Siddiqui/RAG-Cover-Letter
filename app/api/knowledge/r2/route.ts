import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { projectTitle, projectDescription } = await request.json()

    // Create combined embedding for project title + project description
    const combinedText = `${projectTitle} ${projectDescription}`
    
    const embeddingResponse = await fetch("https://api.cohere.ai/v1/embed", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
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
      projectTitle,
      projectType: extractProjectType(projectTitle, projectDescription),
      technologies: extractTechnologies(projectDescription),
      wordCount: projectDescription.split(' ').length,
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

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error saving R2 data:", error)
    return NextResponse.json(
      { error: "Failed to save R2 data" },
      { status: 500 }
    )
  }
}

// Helper functions
function extractProjectType(title: string, description: string): string {
  const text = (title + " " + description).toLowerCase()
  
  if (text.includes('web') || text.includes('frontend') || text.includes('backend')) return 'Web Development'
  if (text.includes('mobile') || text.includes('app') || text.includes('ios') || text.includes('android')) return 'Mobile Development'
  if (text.includes('data') || text.includes('analytics') || text.includes('machine learning')) return 'Data Science'
  if (text.includes('marketing') || text.includes('campaign') || text.includes('social media')) return 'Marketing'
  if (text.includes('design') || text.includes('ui') || text.includes('ux')) return 'Design'
  if (text.includes('management') || text.includes('project') || text.includes('team')) return 'Management'
  
  return 'General'
}

function extractTechnologies(description: string): string[] {
  const text = description.toLowerCase()
  const technologies = []
  
  const techKeywords = [
    'react', 'vue', 'angular', 'javascript', 'typescript', 'node.js', 'python', 'java',
    'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'flutter', 'react native',
    'mongodb', 'postgresql', 'mysql', 'redis', 'aws', 'azure', 'gcp', 'docker',
    'kubernetes', 'git', 'jenkins', 'terraform', 'figma', 'photoshop', 'sketch'
  ]
  
  techKeywords.forEach(tech => {
    if (text.includes(tech)) {
      technologies.push(tech)
    }
  })
  
  return technologies.slice(0, 5)
}
