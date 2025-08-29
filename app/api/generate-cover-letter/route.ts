import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { searchKnowledgeBase } from "@/lib/knowledge-search"
import { createPerfectRAGPrompt } from "@/lib/prompt-generator"
import { streamOpenAIResponse } from "@/lib/llm-client"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, jobDescription, clientName, category } = await request.json()

    if (!jobTitle?.trim() || !jobDescription?.trim() || !category?.trim()) {
      return NextResponse.json(
        { error: "Job title, description, and category are required" },
        { status: 400 }
      )
    }

    const validCategories = ["mobile", "web", "ai"]
    if (!validCategories.includes(category.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid category. Must be mobile, web, or ai" },
        { status: 400 }
      )
    }

    console.log(`🚀 Starting ${category.toUpperCase()}-focused RAG cover letter generation...`)
    console.log("Job title:", jobTitle)
    console.log("Category:", category)
    console.log("Job description length:", jobDescription.length)

    // Step 1: Create combined embedding for received job title + job description
    let queryEmbedding: number[] = []

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not found")
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    try {
      console.log("Creating combined embedding for job title + description...")
      const combinedJobText = `${jobTitle} ${jobDescription}`

      const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: combinedJobText,
          model: "text-embedding-ada-002", 
        }),
      })

      if (!embeddingResponse.ok) {
        const errorText = await embeddingResponse.text()
        console.error("OpenAI API error:", errorText)
        throw new Error("Failed to create embedding")
      }

      const embeddingData = await embeddingResponse.json()
      queryEmbedding = embeddingData.data[0].embedding
      console.log("Combined embedding created successfully, dimension:", queryEmbedding.length)
    } catch (error) {
      console.error("🔥 Embedding creation failed:", error)
      return NextResponse.json(
        { error: "Failed to create embedding for job" },
        { status: 500 }
      )
    }

    // Step 2: Search category-specific knowledge base
    console.log(`Searching ${category.toUpperCase()} knowledge base...`)
    const searchResults = await searchKnowledgeBase(queryEmbedding, supabase, category)

    console.log(`🎯 ${category.toUpperCase()} RAG Results:`)
    console.log(`- R1 (Similar Cover Letters): ${searchResults.r1CoverLetters.length} matches`)
    console.log(`- R2 (Category Projects): ${searchResults.r2Projects.length} matches`)
    console.log(`- R3 (Category Skills): ${searchResults.r3Skills.length} matches`)

    // Step 3: Create comprehensive context for LLM
    const context = {
      r1:
        searchResults.r1CoverLetters.length > 0
          ? searchResults.r1CoverLetters
          : searchResults.fallbackData.r1,
      r2:
        searchResults.r2Projects.length > 0
          ? searchResults.r2Projects
          : searchResults.fallbackData.r2,
      r3:
        searchResults.r3Skills.length > 0
          ? searchResults.r3Skills
          : searchResults.fallbackData.r3,
      hasKnowledgeBase: searchResults.totalMatches > 0,
      totalMatches: searchResults.totalMatches,
      fallbackUsed: searchResults.totalMatches === 0,
      category: category.toLowerCase(),
    }

    // Step 4: Generate cover letter with category-specific RAG context
    const prompt = createPerfectRAGPrompt(
      jobTitle,
      jobDescription,
      context,
      category.toLowerCase(),
      clientName
    )

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    console.log(`Generating perfectly structured ${category.toUpperCase()} cover letter...`)

    // Step 5: Stream the response with category-specific instructions
    return await streamOpenAIResponse(prompt, context, category.toLowerCase())
  } catch (error) {
    console.error("Error generating cover letter:", error)
    return NextResponse.json(
      { error: "Failed to generate cover letter" },
      { status: 500 }
    )
  }
}
