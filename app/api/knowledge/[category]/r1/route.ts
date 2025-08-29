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
  return `${category.toLowerCase()}_r1_job_examples`
}

// GET - Fetch all R1 records for specific category
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
    console.error("Error fetching R1 data:", error)
    return NextResponse.json({ error: "Failed to fetch R1 data" }, { status: 500 })
  }
}

// POST - Create new R1 record for specific category
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await context.params
    const tableName = getTableName(category)
    const { jobTitle, jobDescription, coverLetter } = await request.json()

    // Create combined embedding for job title + job description
    const combinedText = `${jobTitle}\n\n${jobDescription}`

    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: combinedText,
        model: "text-embedding-ada-002", // ✅ updated to ada-002
      }),
    })

    if (!embeddingResponse.ok) throw new Error("Failed to create embeddings")

    const embeddingData = await embeddingResponse.json()
    const combinedEmbedding = embeddingData.data[0].embedding

    // Extract metadata
    const metadata = {
      jobTitle,
      category,
      wordCount: jobDescription.split(" ").length,
      coverLetterLength: coverLetter.length,
      createdAt: new Date().toISOString(),
    }

    // Store in category-specific Supabase table
    const { data, error } = await supabase
      .from(tableName)
      .insert({
        job_title: jobTitle,
        job_description: jobDescription,
        cover_letter: coverLetter,
        combined_embedding: combinedEmbedding,
        metadata,
      })
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error saving R1 data:", error)
    return NextResponse.json({ error: "Failed to save R1 data" }, { status: 500 })
  }
}

// PUT - Update existing R1 record for specific category
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await context.params
    const tableName = getTableName(category)
    const { id, jobTitle, jobDescription, coverLetter } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "ID is required for update" }, { status: 400 })
    }

    // Create combined embedding for updated data
    const combinedText = `${jobTitle}\n\n${jobDescription}`

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
      jobTitle,
      category,
      wordCount: jobDescription.split(" ").length,
      coverLetterLength: coverLetter.length,
      updatedAt: new Date().toISOString(),
    }

    // Update in category-specific Supabase table
    const { data, error } = await supabase
      .from(tableName)
      .update({
        job_title: jobTitle,
        job_description: jobDescription,
        cover_letter: coverLetter,
        combined_embedding: combinedEmbedding,
        metadata,
      })
      .eq("id", id)
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error updating R1 data:", error)
    return NextResponse.json({ error: "Failed to update R1 data" }, { status: 500 })
  }
}

// DELETE - Delete R1 record for specific category
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

    return NextResponse.json({ success: true, message: "R1 record deleted successfully" })
  } catch (error) {
    console.error("Error deleting R1 data:", error)
    return NextResponse.json({ error: "Failed to delete R1 data" }, { status: 500 })
  }
}
