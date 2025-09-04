import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('job_examples')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching job examples:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in GET job examples:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, jobDescription, coverLetter } = await request.json()

    if (!jobTitle?.trim() || !jobDescription?.trim() || !coverLetter?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Job title, description, and cover letter are required' },
        { status: 400 }
      )
    }

    // Create embedding for the combined content
    let combinedEmbedding: number[] = []
    
    try {
      const combinedText = `${jobTitle} ${jobDescription} ${coverLetter}`
      
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

    // Calculate metadata
    const metadata = {
      wordCount: coverLetter.split(' ').length,
      hasEmbedding: combinedEmbedding.length > 0,
    }

    // Insert into database
    const insertData: any = {
      job_title: jobTitle,
      job_description: jobDescription,
      cover_letter: coverLetter,
      metadata,
    }

    // Only add embedding if it was successfully created
    if (combinedEmbedding.length > 0) {
      insertData.combined_embedding = combinedEmbedding
    }

    const { data, error } = await supabase
      .from('job_examples')
      .insert(insertData)
      .select()

    if (error) {
      console.error('Error saving job example:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in POST job examples:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, jobTitle, jobDescription, coverLetter } = await request.json()

    if (!id || !jobTitle?.trim() || !jobDescription?.trim() || !coverLetter?.trim()) {
      return NextResponse.json(
        { success: false, error: 'ID, job title, description, and cover letter are required' },
        { status: 400 }
      )
    }

    // Create embedding for the updated content
    let combinedEmbedding: number[] = []
    
    try {
      const combinedText = `${jobTitle} ${jobDescription} ${coverLetter}`
      
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

    // Calculate updated metadata
    const metadata = {
      wordCount: coverLetter.split(' ').length,
      hasEmbedding: combinedEmbedding.length > 0,
    }

    const updateData: any = {
      job_title: jobTitle,
      job_description: jobDescription,
      cover_letter: coverLetter,
      metadata,
    }

    if (combinedEmbedding.length > 0) {
      updateData.combined_embedding = combinedEmbedding
    }

    const { data, error } = await supabase
      .from('job_examples')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error updating job example:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in PUT job examples:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('job_examples')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting job example:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE job examples:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}