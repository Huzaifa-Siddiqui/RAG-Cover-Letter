import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { searchKnowledgeBase } from "@/lib/knowledge-search"
import { createPerfectRAGPrompt, createCustomClientPrompt, analyzeJobRequirements } from "@/lib/prompt-generator"
import { streamOpenAIResponse } from "@/lib/llm-client"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, jobDescription, clientName, questions } = await request.json()

    if (!jobTitle?.trim() || !jobDescription?.trim()) {
      return NextResponse.json(
        { error: "Job title and description are required" },
        { status: 400 }
      )
    }

    console.log("🚀 Starting enhanced two-stage RAG cover letter generation...")
    console.log("Job title:", jobTitle)
    console.log("Job description length:", jobDescription.length)
    console.log("Questions provided:", questions?.length ? "Yes" : "No")

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not found")
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    // **STAGE 1: Analyze job requirements with first LLM call**
    console.log("🔍 Stage 1: Analyzing job requirements for custom format needs...")
    const analysisResult = await analyzeJobRequirements(
      jobTitle,
      jobDescription,
      clientName,
    
    )

    console.log("📋 Analysis Result:", {
      shouldUseCustomPrompt: analysisResult.shouldUseCustomPrompt,
      hasSpecificFormat: analysisResult.hasSpecificFormat,
      clientQuestionsCount: analysisResult.clientQuestions.length,
      customInstructions: analysisResult.customInstructions.slice(0, 100) + "..."
    })

    // Step 2: Create combined embedding for received job title + job description
    let queryEmbedding: number[] = []

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

    // Step 3: Search global knowledge base across all tables
    console.log("Searching global knowledge base across all tables...")
    const searchResults = await searchKnowledgeBase(queryEmbedding, supabase)

    console.log("🎯 Global RAG Results:")
    console.log(`- Job Examples: ${searchResults.jobExamples.length} matches`)
    console.log(`- Projects: ${searchResults.projects.length} matches`)
    console.log(`- Skills: ${searchResults.skills.length} matches`)
    console.log(`- Total matches: ${searchResults.totalMatches}`)

    // Step 4: Create comprehensive context for LLM
    const context = {
      jobExamples: searchResults.jobExamples,
      projects: searchResults.projects,
      skills: searchResults.skills,
      hasKnowledgeBase: searchResults.totalMatches > 0,
      totalMatches: searchResults.totalMatches,
    }

    // **STAGE 2: Generate cover letter with appropriate prompt**
    let prompt: string
    
    if (analysisResult.shouldUseCustomPrompt) {
      console.log("🎯 Using CUSTOM prompt for client-specific requirements")
      console.log(`- Client has ${analysisResult.clientQuestions.length} specific questions`)
      console.log("- Custom formatting requirements detected")
      console.log("- Will make SECOND LLM call with custom prompt")
      
      prompt = createCustomClientPrompt(
        jobTitle,
        jobDescription,
        context,
        analysisResult,
        clientName,
        questions
      )
    } else {
      console.log("📝 Using STANDARD prompt format")
      console.log("- Will make SECOND LLM call with standard prompt")
      
      prompt = createPerfectRAGPrompt(
        jobTitle,
        jobDescription,
        context,
        clientName,
        questions
      )
    }

    console.log("🔄 Making SECOND LLM call to generate cover letter...")

    // Step 5: Stream the response with appropriate context and prompt
    return await streamOpenAIResponse(prompt, {
      ...context,
      analysisResult,
      promptType: analysisResult.shouldUseCustomPrompt ? "custom" : "standard"
    })

  } catch (error) {
    console.error("Error in enhanced cover letter generation:", error)
    return NextResponse.json(
      { error: "Failed to generate cover letter" },
      { status: 500 }
    )
  }
}