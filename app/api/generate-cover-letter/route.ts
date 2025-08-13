import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { analyzeJobDescription } from "@/lib/job-analysis"
import { searchKnowledgeBase } from "@/lib/knowledge-search"
import { createPerfectRAGPrompt } from "@/lib/prompt-generator"
import { streamOpenRouterResponse } from "@/lib/llm-client"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, jobDescription, clientName } = await request.json()

    if (!jobTitle?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Job title and description are required" }, { status: 400 })
    }

    console.log(" Starting enhanced RAG cover letter generation...")
    console.log("Job title:", jobTitle)
    console.log("Job description length:", jobDescription.length)

    // Step 1: Analyze job description for domain and technologies
    const jobAnalysis = analyzeJobDescription(jobTitle, jobDescription)
    console.log("📊 Job Analysis:", jobAnalysis)

    // Step 2: Create combined embedding for received job title + job description
    let queryEmbedding: number[] = []

    if (!process.env.COHERE_API_KEY) {
      console.error("COHERE_API_KEY not found")
      return NextResponse.json({ error: "Cohere API key not configured" }, { status: 500 })
    }

    try {
      console.log("Creating combined embedding for job title + description...")
      const combinedJobText = `${jobTitle} ${jobDescription}`

      const embeddingResponse = await fetch("https://api.cohere.ai/v1/embed", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          texts: [combinedJobText],
          model: "embed-english-v3.0",
          input_type: "search_query",
        }),
      })

      if (!embeddingResponse.ok) {
        const errorText = await embeddingResponse.text()
        console.error("Cohere API error:", errorText)
        throw new Error("Failed to create embedding")
      }

      const embeddingData = await embeddingResponse.json()
      queryEmbedding = embeddingData.embeddings[0]
      console.log("Combined embedding created successfully, dimension:", queryEmbedding.length)
    } catch (error) {
      console.error(" Embedding creation failed:", error)
      return NextResponse.json({ error: "Failed to create embedding for job" }, { status: 500 })
    }

    // Step 3: Search knowledge base with domain-aware filtering
    console.log("Searching knowledge base with domain-aware filtering...")
    const searchResults = await searchKnowledgeBase(queryEmbedding, jobAnalysis, supabase)

    console.log(` Enhanced RAG Results:`)
    console.log(`- R1 (Similar Cover Letters): ${searchResults.r1CoverLetters.length} matches`)
    console.log(`- R2 (Domain-Filtered Projects): ${searchResults.r2Projects.length} matches`)
    console.log(`- R3 (Relevant Skills): ${searchResults.r3Skills.length} matches`)

    // Step 4: Create comprehensive context for LLM
    const context = {
      r1: searchResults.r1CoverLetters.length > 0 ? searchResults.r1CoverLetters : searchResults.fallbackData.r1,
      r2: searchResults.r2Projects.length > 0 ? searchResults.r2Projects : searchResults.fallbackData.r2,
      r3: searchResults.r3Skills.length > 0 ? searchResults.r3Skills : searchResults.fallbackData.r3,
      hasKnowledgeBase: searchResults.totalMatches > 0,
      totalMatches: searchResults.totalMatches,
      fallbackUsed: searchResults.totalMatches === 0,
      jobAnalysis,
    }

    // Step 5: Generate cover letter with enhanced RAG context
    const prompt = createPerfectRAGPrompt(jobTitle, jobDescription, context, clientName)

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 })
    }

    console.log(" Generating perfectly matched cover letter...")

    // Step 6: Stream the response
    return await streamOpenRouterResponse(prompt, context)
  } catch (error) {
    console.error("Error generating cover letter:", error)
    return NextResponse.json({ error: "Failed to generate cover letter" }, { status: 500 })
  }
}
