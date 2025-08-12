import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, jobDescription, coverLetter } = await request.json()

    // Create combined embedding for job title + job description
    const combinedText = `${jobTitle} ${jobDescription}`
    
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
      jobTitle,
      wordCount: jobDescription.split(' ').length,
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

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error saving R1 data:", error)
    return NextResponse.json(
      { error: "Failed to save R1 data" },
      { status: 500 }
    )
  }
}
