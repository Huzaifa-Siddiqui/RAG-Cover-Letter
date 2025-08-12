import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// GET - Fetch all R1 records
export async function GET() {
  try {
    const { data, error } = await supabase.from("r1_job_examples").select("*").order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error fetching R1 data:", error)
    return NextResponse.json({ error: "Failed to fetch R1 data" }, { status: 500 })
  }
}

// POST - Create new R1 record
export async function POST(request: NextRequest) {
  try {
    const { jobTitle, jobDescription, coverLetter } = await request.json()

    // Create combined embedding for job title + job description
    const combinedText = `${jobTitle} ${jobDescription}`

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
      jobTitle,
      wordCount: jobDescription.split(" ").length,
      coverLetterLength: coverLetter.length,
      createdAt: new Date().toISOString(),
    }

    // Store in Supabase with new schema
    const { data, error } = await supabase
      .from("r1_job_examples")
      .insert({
        job_title: jobTitle,
        job_description: jobDescription,
        cover_letter: coverLetter,
        combined_embedding: combinedEmbedding,
        metadata,
      })
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error saving R1 data:", error)
    return NextResponse.json({ error: "Failed to save R1 data" }, { status: 500 })
  }
}

// PUT - Update existing R1 record
export async function PUT(request: NextRequest) {
  try {
    const { id, jobTitle, jobDescription, coverLetter } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "ID is required for update" }, { status: 400 })
    }

    // Create combined embedding for updated data
    const combinedText = `${jobTitle} ${jobDescription}`

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
      jobTitle,
      wordCount: jobDescription.split(" ").length,
      coverLetterLength: coverLetter.length,
      updatedAt: new Date().toISOString(),
    }

    // Update in Supabase
    const { data, error } = await supabase
      .from("r1_job_examples")
      .update({
        job_title: jobTitle,
        job_description: jobDescription,
        cover_letter: coverLetter,
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
    console.error("Error updating R1 data:", error)
    return NextResponse.json({ error: "Failed to update R1 data" }, { status: 500 })
  }
}

// DELETE - Delete R1 record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required for deletion" }, { status: 400 })
    }

    const { error } = await supabase.from("r1_job_examples").delete().eq("id", id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, message: "R1 record deleted successfully" })
  } catch (error) {
    console.error("Error deleting R1 data:", error)
    return NextResponse.json({ error: "Failed to delete R1 data" }, { status: 500 })
  }
}
