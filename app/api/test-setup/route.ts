import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  const checks = {
    supabase: false,
    cohere: false,
    openrouter: false,
    knowledgeBase: {
      r1Count: 0,
      r2Count: 0,
      r3Count: 0,
    }
  }

  // Test Supabase connection and knowledge base
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      // Check if tables exist and count records
      const [r1Result, r2Result, r3Result] = await Promise.all([
        supabase.from('r1_job_examples').select('count', { count: 'exact' }),
        supabase.from('r2_past_applications').select('count', { count: 'exact' }),
        supabase.from('r3_skills').select('count', { count: 'exact' })
      ])

      checks.supabase = !r1Result.error && !r2Result.error && !r3Result.error
      checks.knowledgeBase = {
        r1Count: r1Result.count || 0,
        r2Count: r2Result.count || 0,
        r3Count: r3Result.count || 0,
      }
    }
  } catch (error) {
    console.error("Supabase test failed:", error)
  }

  // Test Cohere API
  try {
    if (process.env.COHERE_API_KEY) {
      const response = await fetch("https://api.cohere.ai/v1/embed", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          texts: ["test"],
          model: "embed-english-v3.0",
          input_type: "search_query",
        }),
      })
      checks.cohere = response.ok
    }
  } catch (error) {
    console.error("Cohere test failed:", error)
  }

  // Test OpenRouter API
  try {
    if (process.env.OPENROUTER_API_KEY) {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
      })
      checks.openrouter = response.ok
    }
  } catch (error) {
    console.error("OpenRouter test failed:", error)
  }

  const totalKnowledgeBase = checks.knowledgeBase.r1Count + checks.knowledgeBase.r2Count + checks.knowledgeBase.r3Count

  return NextResponse.json({
    status: "RAG Cover Letter Generator - Setup Check",
    checks,
    recommendations: {
      supabase: checks.supabase ? "✅ Connected" : "❌ Check your Supabase URL and service role key",
      cohere: checks.cohere ? "✅ Connected" : "❌ Check your Cohere API key",
      openrouter: checks.openrouter ? "✅ Connected" : "❌ Check your OpenRouter API key",
      knowledgeBase: totalKnowledgeBase > 0 
        ? `✅ Knowledge base populated (${totalKnowledgeBase} total records)`
        : "⚠️ Knowledge base is empty - add data via the Knowledge Page for personalized results"
    },
    knowledgeBaseDetails: {
      r1_job_examples: `${checks.knowledgeBase.r1Count} records`,
      r2_past_applications: `${checks.knowledgeBase.r2Count} records`,
      r3_skills: `${checks.knowledgeBase.r3Count} records`,
    }
  })
}
