import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type R1RPCRow = {
  id: number
  similarity: number
  cover_letter?: string | null
  job_title?: string | null
  job_description?: string | null
  metadata?: any
}

type R1Row = {
  id: number
  job_title: string | null
  job_description: string | null
  cover_letter: string | null
  metadata: any
  created_at: string | null
  combined_embedding: number[] | null
  similarity?: number
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, jobDescription, clientName } = await request.json()

    if (!jobTitle?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Job title and description are required" }, { status: 400 })
    }

    console.log("🚀 Starting enhanced RAG cover letter generation...")
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
      console.log("🔗 Creating combined embedding for job title + description...")
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
      console.log("✅ Combined embedding created successfully, dimension:", queryEmbedding.length)
    } catch (error) {
      console.error("❌ Embedding creation failed:", error)
      return NextResponse.json({ error: "Failed to create embedding for job" }, { status: 500 })
    }

    // Step 3: Search for similar content using combined embeddings with domain filtering
    console.log("🔍 Searching knowledge base with domain-aware filtering...")

    const [r1CoverLetters, r2Projects, r3Skills] = await Promise.all([
      searchSimilarR1CoverLetters(queryEmbedding),
      searchSimilarR2ProjectsWithDomainFilter(queryEmbedding, jobAnalysis),
      searchSimilarR3Skills(queryEmbedding),
    ])

    console.log(`📊 Enhanced RAG Results:`)
    console.log(`- R1 (Similar Cover Letters): ${r1CoverLetters.length} matches`)
    console.log(`- R2 (Domain-Filtered Projects): ${r2Projects.length} matches`)
    console.log(`- R3 (Relevant Skills): ${r3Skills.length} matches`)

    const short = (v: any, n = 180) =>
      String(v || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, n)

    console.groupCollapsed("📦 Retrieved Items")
    // R1: exact cover letters (hydrated)
    console.groupCollapsed("R1: Cover letters fetched with similar embeddings")
    if (r1CoverLetters.length === 0) {
      console.log("(none)")
    } else {
      r1CoverLetters.forEach((row: any, i: number) => {
        console.log(
          `#${i + 1} id=${row.id} similarity=${(row.similarity ?? 0).toFixed(3)} title="${row.job_title || ""}"\n` +
            `cover_letter: "${short(row.cover_letter)}${row.cover_letter && String(row.cover_letter).length > 180 ? "..." : ""}"`,
        )
      })
    }
    console.groupEnd()

    // R2: domain-filtered projects
    console.groupCollapsed("R2: Domain-Filtered Projects")
    if (r2Projects.length === 0) {
      console.log("(none)")
    } else {
      r2Projects.forEach((p: any, i: number) => {
        console.log(
          `#${i + 1} similarity=${(p.similarity ?? 0).toFixed(3)} domain=${p.metadata?.projectType || "General"} title="${p.project_title || ""}"\n` +
            `description: "${short(p.project_description)}${p.project_description && String(p.project_description).length > 180 ? "..." : ""}"`,
        )
      })
    }
    console.groupEnd()

    // R3: skills
    console.groupCollapsed("R3: Skills")
    if (r3Skills.length === 0) {
      console.log("(none)")
    } else {
      r3Skills.forEach((s: any, i: number) => {
        console.log(
          `#${i + 1} similarity=${(s.similarity ?? 0).toFixed(3)} name="${s.skill_name || ""}"\n` +
            `description: "${short(s.skill_description)}${s.skill_description && String(s.skill_description).length > 180 ? "..." : ""}"`,
        )
      })
    }
    console.groupEnd()
    console.groupEnd()

    // Step 4: Implement fallback if no matches
    let fallbackData = { r1: [] as any[], r2: [] as any[], r3: [] as any[] }
    const totalMatches = r1CoverLetters.length + r2Projects.length + r3Skills.length

    if (totalMatches === 0) {
      console.log("🔄 No matches found, getting fallback data...")
      fallbackData = await getFallbackData()
    }

    // Step 5: Create comprehensive context for LLM
    const context = {
      r1: r1CoverLetters.length > 0 ? r1CoverLetters : fallbackData.r1,
      r2: r2Projects.length > 0 ? r2Projects : fallbackData.r2,
      r3: r3Skills.length > 0 ? r3Skills : fallbackData.r3,
      hasKnowledgeBase: totalMatches > 0,
      totalMatches,
      fallbackUsed: totalMatches === 0,
      jobAnalysis, // Include job analysis in context
    }

    // Step 6: Generate cover letter with enhanced RAG context
    const prompt = createPerfectRAGPrompt(jobTitle, jobDescription, context, clientName)

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 })
    }

    console.log("🤖 Generating perfectly matched cover letter...")
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Perfect RAG Cover Letter Generator",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert cover letter writer specializing in creating perfectly matched cover letters using RAG technology.
Your goal is to analyze similar cover letters from the knowledge base and create a new cover letter that:
1. EXACTLY matches the writing style, tone, and structure of similar previous cover letters
2. Uses the same opening patterns, paragraph flow, and closing techniques
3. Incorporates relevant past projects as concrete examples
4. Maintains the professional voice and personality shown in previous letters
${
  context.hasKnowledgeBase
    ? "You have access to highly relevant similar cover letters, domain-filtered projects, and relevant skills. Use this data to create a perfectly matched letter."
    : "Limited knowledge base data available. Create a professional template following best practices."
}`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: true,
        max_tokens: 1500,
        temperature: 0.6,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenRouter API error:", response.status, errorText)
      return NextResponse.json({ error: `OpenRouter API error: ${response.status}` }, { status: 500 })
    }

    console.log("✅ Streaming perfectly matched cover letter...")
    // Stream the response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.error(new Error("No response body"))
          return
        }
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              controller.close()
              break
            }
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split("\n")
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim()

                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                  controller.close()
                  return
                }
                if (data && data !== "") {
                  try {
                    const parsed = JSON.parse(data)
                    if (parsed.choices?.[0]?.delta?.content) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ content: parsed.choices[0].delta.content })}\n\n`),
                      )
                    }
                  } catch (e) {
                    // Ignore parsing errors
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  } catch (error) {
    console.error("Error generating cover letter:", error)
    return NextResponse.json({ error: "Failed to generate cover letter" }, { status: 500 })
  }
}

// New function to analyze job description for domain and technologies
function analyzeJobDescription(jobTitle: string, jobDescription: string) {
  const combinedText = `${jobTitle} ${jobDescription}`.toLowerCase()

  // Extract technologies from job description
  const technologies = extractTechnologiesFromJobDescription(combinedText)

  // Determine primary domains
  const domains = []

  // AI/ML Domain
  if (
    combinedText.includes("ai") ||
    combinedText.includes("artificial intelligence") ||
    combinedText.includes("machine learning") ||
    combinedText.includes("ml") ||
    combinedText.includes("deep learning") ||
    combinedText.includes("neural network") ||
    combinedText.includes("data science") ||
    combinedText.includes("nlp") ||
    combinedText.includes("computer vision") ||
    combinedText.includes("tensorflow") ||
    combinedText.includes("pytorch") ||
    combinedText.includes("scikit-learn")
  ) {
    domains.push("AI/ML")
  }

  // Web Development Domain
  if (
    combinedText.includes("web") ||
    combinedText.includes("frontend") ||
    combinedText.includes("backend") ||
    combinedText.includes("full stack") ||
    combinedText.includes("react") ||
    combinedText.includes("vue") ||
    combinedText.includes("angular") ||
    combinedText.includes("javascript") ||
    combinedText.includes("html") ||
    combinedText.includes("css") ||
    combinedText.includes("node.js") ||
    combinedText.includes("express")
  ) {
    domains.push("Web Development")
  }

  // Mobile Development Domain
  if (
    combinedText.includes("mobile") ||
    combinedText.includes("ios") ||
    combinedText.includes("android") ||
    combinedText.includes("flutter") ||
    combinedText.includes("react native") ||
    combinedText.includes("swift") ||
    combinedText.includes("kotlin") ||
    combinedText.includes("app development")
  ) {
    domains.push("Mobile Development")
  }

  // Data Science Domain
  if (
    combinedText.includes("data") ||
    combinedText.includes("analytics") ||
    combinedText.includes("statistics") ||
    combinedText.includes("sql") ||
    combinedText.includes("python") ||
    combinedText.includes("r ") ||
    combinedText.includes("tableau") ||
    combinedText.includes("power bi") ||
    combinedText.includes("data warehouse") ||
    combinedText.includes("etl")
  ) {
    domains.push("Data Science")
  }

  // DevOps/Cloud Domain
  if (
    combinedText.includes("devops") ||
    combinedText.includes("cloud") ||
    combinedText.includes("aws") ||
    combinedText.includes("azure") ||
    combinedText.includes("gcp") ||
    combinedText.includes("docker") ||
    combinedText.includes("kubernetes") ||
    combinedText.includes("ci/cd") ||
    combinedText.includes("terraform") ||
    combinedText.includes("jenkins")
  ) {
    domains.push("DevOps")
  }

  // Design Domain
  if (
    combinedText.includes("design") ||
    combinedText.includes("ui") ||
    combinedText.includes("ux") ||
    combinedText.includes("figma") ||
    combinedText.includes("photoshop") ||
    combinedText.includes("sketch") ||
    combinedText.includes("user experience") ||
    combinedText.includes("user interface")
  ) {
    domains.push("Design")
  }

  // Management Domain
  if (
    combinedText.includes("management") ||
    combinedText.includes("project manager") ||
    combinedText.includes("product manager") ||
    combinedText.includes("team lead") ||
    combinedText.includes("scrum") ||
    combinedText.includes("agile") ||
    combinedText.includes("leadership") ||
    combinedText.includes("strategy")
  ) {
    domains.push("Management")
  }

  // Default to General if no specific domain found
  if (domains.length === 0) {
    domains.push("General")
  }

  return {
    domains,
    technologies,
    primaryDomain: domains[0],
    isMultiDomain: domains.length > 1,
  }
}

// Extract technologies from job description
function extractTechnologiesFromJobDescription(text: string): string[] {
  const technologies: string[] = []

  const techKeywords = [
    "react",
    "vue",
    "angular",
    "javascript",
    "typescript",
    "node.js",
    "python",
    "java",
    "php",
    "ruby",
    "go",
    "rust",
    "swift",
    "kotlin",
    "flutter",
    "react native",
    "mongodb",
    "postgresql",
    "mysql",
    "redis",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "git",
    "jenkins",
    "terraform",
    "figma",
    "photoshop",
    "sketch",
    "tensorflow",
    "pytorch",
    "scikit-learn",
    "pandas",
    "numpy",
    "jupyter",
    "tableau",
    "power bi",
    "sql server",
    "oracle",
    "elasticsearch",
    "kafka",
    "spring",
    "django",
    "flask",
    "express",
    "laravel",
    "rails",
    "gin",
    "graphql",
    "rest api",
    "microservices",
    "serverless",
    "lambda",
    "html",
    "css",
    "sass",
    "less",
    "webpack",
    "vite",
    "babel",
    "jest",
    "cypress",
    "selenium",
    "postman",
    "jira",
    "confluence",
  ]

  techKeywords.forEach((tech) => {
    if (text.includes(tech.toLowerCase())) {
      technologies.push(tech)
    }
  })

  return technologies.slice(0, 10) // Return top 10 most relevant technologies
}

async function searchSimilarR1CoverLetters(queryEmbedding: number[]) {
  try {
    console.log("🔍 Searching R1 for similar cover letters...")

    const thresholds = [0.3, 0.2, 0.1, 0.05]

    for (const threshold of thresholds) {
      const { data: rpcData, error: rpcError } = (await supabase.rpc("match_r1_documents", {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: 4,
      })) as { data: R1RPCRow[] | null; error: any }

      if (!rpcError && rpcData && rpcData.length > 0) {
        // Always hydrate by IDs to get the exact cover_letter column values.
        const hydrated = await hydrateR1RowsWithCoverLetters(rpcData)
        if (hydrated.length > 0) {
          console.log(
            ` Found ${hydrated.length} R1 cover letters with threshold ${threshold} (hydrated exact cover_letter)`,
          )
          return hydrated
        }
      }
    }

    // Manual fallback: compute cosine similarity on the client if RPC returns nothing
    const { data: allData, error } = await supabase.from("r1_job_examples").select("*").limit(20)

    if (error || !allData) {
      console.error("Error fetching R1 data:", error)
      return []
    }

    const results = (allData as R1Row[])
      .filter((item) => Array.isArray(item.combined_embedding) && item.combined_embedding)
      .map((item) => ({
        ...item,
        similarity: cosineSimilarity(queryEmbedding, item.combined_embedding as number[]),
      }))
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      .slice(0, 4)

    console.log(` Found ${results.length} R1 cover letters via manual search (exact cover_letter)`)
    return results
  } catch (error) {
    console.error("R1 search error:", error)
    return []
  }
}


async function hydrateR1RowsWithCoverLetters(rpcRows: R1RPCRow[]): Promise<R1Row[]> {
  if (!rpcRows || rpcRows.length === 0) return []
  const ids = rpcRows.map((r) => r.id)
  const simMap = new Map(rpcRows.map((r) => [r.id, r.similarity]))

  const { data, error } = await supabase
    .from("r1_job_examples")
    .select("id, job_title, job_description, cover_letter, metadata, created_at, combined_embedding")
    .in("id", ids)

  if (error || !data) {
    console.error("Hydration error fetching r1_job_examples by ids:", error)
    return []
  }

  // Merge similarity back and ensure sorting by similarity desc
  const merged = (data as R1Row[]).map((row) => ({
    ...row,
    similarity: simMap.get(row.id) ?? 0,
  }))

  merged.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))

  // Optional sanity: ensure cover_letter exists
  const withCoverLetter = merged.filter(
    (r) => typeof r.cover_letter === "string" && (r.cover_letter as string).trim().length > 0,
  )
  if (withCoverLetter.length < merged.length) {
    console.warn(`⚠️ ${merged.length - withCoverLetter.length} hydrated rows lacked cover_letter text`)
  }

  return withCoverLetter
}

// Enhanced R2 search with domain filtering
async function searchSimilarR2ProjectsWithDomainFilter(queryEmbedding: number[], jobAnalysis: any) {
  try {
    console.log("🎯 Searching R2 for domain-relevant projects...")
    console.log("Target domains:", jobAnalysis.domains)

    const thresholds = [0.3, 0.2, 0.1, 0.05]

    for (const threshold of thresholds) {
      const { data: rpcData, error: rpcError } = await supabase.rpc("match_r2_projects", {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: 10, // Get more initially for filtering
      })

      if (!rpcError && rpcData && rpcData.length > 0) {
        // Filter projects by domain relevance
        const domainFilteredProjects = filterProjectsByDomain(rpcData, jobAnalysis)

        if (domainFilteredProjects.length > 0) {
          console.log(
            ` Found ${domainFilteredProjects.length} domain-relevant R2 projects with threshold ${threshold}`,
          )
          return domainFilteredProjects.slice(0, 3) // Return top 3 most relevant
        }
      }
    }

    // Manual fallback with domain filtering
    const { data: allData, error } = await supabase.from("r2_past_projects").select("*").limit(50) // Get more for better filtering

    if (error || !allData) {
      console.error("Error fetching R2 data:", error)
      return []
    }

    const results = (allData as any[])
      .filter((item) => item.combined_embedding)
      .map((item) => ({
        ...item,
        similarity: cosineSimilarity(queryEmbedding, item.combined_embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)

    // Apply domain filtering
    const domainFilteredResults = filterProjectsByDomain(results, jobAnalysis)

    console.log(` Found ${domainFilteredResults.length} domain-relevant R2 projects via manual search`)
    return domainFilteredResults.slice(0, 3)
  } catch (error) {
    console.error("R2 search error:", error)
    return []
  }
}

// Filter projects by domain relevance
function filterProjectsByDomain(projects: any[], jobAnalysis: any): any[] {
  const targetDomains = jobAnalysis.domains
  const targetTechnologies = jobAnalysis.technologies

  // Score projects based on domain and technology match
  const scoredProjects = projects.map((project) => {
    let domainScore = 0
    let techScore = 0

    const projectType = project.metadata?.projectType || "General"
    const projectTechnologies = project.metadata?.technologies || []
    const projectDescription = (project.project_description || "").toLowerCase()

    // Domain matching
    targetDomains.forEach((domain: string) => {
      if (projectType.includes(domain) || projectDescription.includes(domain.toLowerCase())) {
      domainScore += 1
      }
    })

    // Technology matching
    targetTechnologies.forEach((tech: string) => {
      if (projectTechnologies.includes(tech) || projectDescription.includes(tech.toLowerCase())) {
        techScore += 0.5
      }
    })

    // Combined relevance score
    const relevanceScore = domainScore + techScore

    return {
      ...project,
      relevanceScore,
      domainMatch: domainScore > 0,
      techMatch: techScore > 0,
    }
  })

  // Sort by relevance score first, then by similarity
  scoredProjects.sort((a, b) => {
    if (a.relevanceScore !== b.relevanceScore) {
      return b.relevanceScore - a.relevanceScore
    }
    return (b.similarity || 0) - (a.similarity || 0)
  })

  // Prefer projects with domain or technology matches
  const relevantProjects = scoredProjects.filter((p) => p.relevanceScore > 0)

  if (relevantProjects.length >= 3) {
    console.log(`🎯 Using ${relevantProjects.length} highly relevant projects`)
    return relevantProjects
  } else {
    // If not enough relevant projects, include some high-similarity ones
    console.log(`⚠️ Only ${relevantProjects.length} domain-relevant projects found, including high-similarity projects`)
    return scoredProjects.slice(0, Math.max(3, relevantProjects.length))
  }
}

async function searchSimilarR3Skills(queryEmbedding: number[]) {
  try {
    console.log(" Searching R3 for relevant skills...")

    const thresholds = [0.2, 0.15, 0.1, 0.05]

    for (const threshold of thresholds) {
      const { data: rpcData, error: rpcError } = await supabase.rpc("match_r3_skills", {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: 8,
      })

      if (!rpcError && rpcData && rpcData.length > 0) {
        console.log(` Found ${rpcData.length} R3 skills with threshold ${threshold}`)
        return rpcData as any[]
      }
    }

    // Manual fallback
    const { data: allData, error } = await supabase.from("r3_skills").select("*").limit(50)

    if (error || !allData) {
      console.error("Error fetching R3 data:", error)
      return []
    }

    const results = (allData as any[])
      .filter((item) => item.combined_embedding)
      .map((item) => ({
        ...item,
        similarity: cosineSimilarity(queryEmbedding, item.combined_embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 8)

    console.log(` Found ${results.length} R3 skills via manual search`)
    return results
  } catch (error) {
    console.error("R3 search error:", error)
    return []
  }
}

async function getFallbackData() {
  try {
    console.log("🔄 Getting fallback data...")

    const [r1Fallback, r2Fallback, r3Fallback] = await Promise.all([
      supabase.from("r1_job_examples").select("*").order("created_at", { ascending: false }).limit(2),
      supabase.from("r2_past_projects").select("*").order("created_at", { ascending: false }).limit(2),
      supabase.from("r3_skills").select("*").order("created_at", { ascending: false }).limit(4),
    ])

    return {
      r1: (r1Fallback.data || []).map((item) => ({ ...item, similarity: 0.05 })),
      r2: (r2Fallback.data || []).map((item) => ({ ...item, similarity: 0.05 })),
      r3: (r3Fallback.data || []).map((item) => ({ ...item, similarity: 0.05 })),
    }
  } catch (error) {
    console.error("Fallback data error:", error)
    return { r1: [], r2: [], r3: [] }
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

function wordCount(text: string): number {
  return (text || "").trim().split(/\s+/).filter(Boolean).length
}

function paragraphCount(text: string): number {
  const blocks = (text || "")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
  return Math.max(1, blocks.length)
}

// Derive average targets from matched R1 letters
function deriveLengthTargets(r1: Array<{ cover_letter?: string | null }>) {
  const letters = (r1 || []).map((r) => (r.cover_letter || "").trim()).filter(Boolean)

  if (letters.length === 0) return null

  const words = letters.map(wordCount)
  const paras = letters.map(paragraphCount)

  const avgWords = Math.round(words.reduce((a, b) => a + b, 0) / words.length)
  const avgParas = Math.round(paras.reduce((a, b) => a + b, 0) / paras.length)

  // Allow a sane range around the average so we don't over-constrain the model
  const low = Math.max(50, Math.round(avgWords * 0.85))
  const high = Math.round(avgWords * 1.15)

  return {
    targetWords: avgWords,
    targetParagraphs: avgParas,
    wordsRange: [low, high] as [number, number],
  }
}

// Enhanced RAG prompt with domain awareness
function createPerfectRAGPrompt(jobTitle: string, jobDescription: string, context: any, clientName?: string) {
  const bestMatch = context.r1[0] // Highest similarity cover letter
  const hasStrongMatch = bestMatch && bestMatch.similarity > 0.2
  const jobAnalysis = context.jobAnalysis

  let styleAnalysis = ""
  let openingPattern = ""
  let closingPattern = ""
  let structurePattern = ""

  if (hasStrongMatch && context.r1.length > 0) {
    // Detailed analysis of the best matching cover letter
    const bestLetter: string = bestMatch.cover_letter || ""

    // Extract opening pattern
    const opening = extractOpeningPattern(bestLetter)
    openingPattern = `🎯 OPENING PATTERN TO MATCH:
"${opening.text}"
Style: ${opening.style}
Tone: ${opening.tone}
Structure: ${opening.structure}
`

    // Extract closing pattern
    const closing = extractClosingPattern(bestLetter)
    closingPattern = `🎯 CLOSING PATTERN TO MATCH:
"${closing.text}"
CTA Style: ${closing.ctaStyle}
Enthusiasm Level: ${closing.enthusiasm}
Request Type: ${closing.requestType}
`

    // Extract overall structure
    const structure = analyzeDetailedStructure(bestLetter)
    structurePattern = `🎯 STRUCTURE PATTERN TO MATCH:
- Paragraph Count: ${structure.paragraphs}
- Flow: ${structure.flow}
- Transition Style: ${structure.transitions}
- Professional Level: ${structure.professionalism}
`

    styleAnalysis = `📊 STYLE ANALYSIS FROM BEST MATCH (${(bestMatch.similarity * 100).toFixed(1)}% similar to "${bestMatch.job_title}"):
${openingPattern}${structurePattern}${closingPattern}🎨 WRITING CHARACTERISTICS TO REPLICATE:
- Sentence Length: ${analyzeSentenceLength(bestLetter)}
- Vocabulary Level: ${analyzeVocabulary(bestLetter)}
- Personal Pronouns Usage: ${analyzePersonalPronouns(bestLetter)}
- Technical Detail Level: ${analyzeTechnicalLevel(bestLetter)}
`
  }

  const lengthTargets = deriveLengthTargets(context.r1 || [])
  const lengthTargetsText = lengthTargets
    ? `🧭 LENGTH AND STRUCTURE TARGETS (derived from matched letters):
- Target paragraph count: ${lengthTargets.targetParagraphs} (±1 paragraph)
- Target total length: ~${lengthTargets.targetWords} words (acceptable range: ${lengthTargets.wordsRange[0]}–${lengthTargets.wordsRange[1]} words)
`
    : ""

  // Enhanced R2 Projects Context with domain awareness
  let projectsContext = ""
  if (context.r2.length > 0) {
    projectsContext = `🏆 DOMAIN-RELEVANT PROJECTS TO NATURALLY INTEGRATE:
📊 Job Analysis: Primary Domain = ${jobAnalysis.primaryDomain}, Technologies = ${jobAnalysis.technologies.join(", ")}

${context.r2
  .map((item: any, index: number) => {
    const outcomes = extractDetailedOutcomes(item.project_description || "")
    const projectTechnologies = item.metadata?.technologies || []
    const relevanceScore = item.relevanceScore || 0
    const domainMatch = item.domainMatch ? "✅" : "❌"
    const techMatch = item.techMatch ? "✅" : "❌"

    return `PROJECT ${index + 1} (${(item.similarity * 100).toFixed(1)}% similarity, ${relevanceScore.toFixed(1)} relevance):
${domainMatch} Domain Match | ${techMatch} Tech Match | Type: ${item.metadata?.projectType || "General"}
Title: ${item.project_title}
Key Narrative: ${generateProjectNarrative(item)}
Project Technologies: ${projectTechnologies.join(", ")}
Job Technologies Match: ${
      jobAnalysis.technologies
        .filter(
          (tech: string) =>
            projectTechnologies.includes(tech) ||
            (item.project_description || "").toLowerCase().includes(tech.toLowerCase()),
        )
        .join(", ") || "None"
    }
Measurable Results: ${outcomes.metrics}
Business Impact: ${outcomes.impact}
Perfect for mentioning when discussing: ${outcomes.jobRelevance}

INTEGRATION PHRASES:
"In my recent ${item.metadata?.projectType || "project"} work on ${item.project_title}..."
"While developing ${item.project_title}, I successfully..."
"My experience with ${item.project_title} directly aligns with your ${jobAnalysis.primaryDomain} requirements..."
`
  })
  .join("\n")}`
  }

  // R3 Skills Context
  let skillsContext = ""
  if (context.r3.length > 0) {
    skillsContext = `💪 SKILLS TO WEAVE NATURALLY:
${context.r3
  .map((item: any) => {
    return `• ${item.skill_name}: "${(item.skill_description || "").substring(0, 150)}..."   Integration tip: ${generateSkillIntegrationTip(item, jobDescription)}`
  })
  .join("\n")}`
  }

  const mainInstructions = hasStrongMatch
    ? `🎯 PERFECT STYLE MATCHING WITH DOMAIN FOCUS:
You MUST create a cover letter that matches the style of fetched cover letters from R1 while emphasizing ${jobAnalysis.primaryDomain} expertise. This means:

1. **EXACT OPENING REPLICATION**:
   - Use the SAME greeting style, tone, and opening sentence structure
   - Match the enthusiasm level and professional formality
   - Copy the way they introduce themselves and express interest

2. **DOMAIN-FOCUSED STRUCTURE FLOW**:
   - Follow the exact paragraph breakdown and flow from R1
   - Emphasize ${jobAnalysis.primaryDomain} projects and experience
   - Highlight relevant technologies: ${jobAnalysis.technologies.slice(0, 5).join(", ")}
   - Match the overall length and paragraph count derived from matched letters

3. **PERFECT CLOSING MATCH**:
   - Use the SAME call-to-action style and language
   - Match their level of formality vs. enthusiasm
   - Copy their way of requesting next steps

4. **DOMAIN-RELEVANT PROJECT INTEGRATION**:
   - Prioritize projects that match ${jobAnalysis.primaryDomain}
   - Use specific technologies mentioned in the job description
   - Show clear alignment between past projects and job requirements

CRITICAL: The final cover letter should read as if the same person wrote it, just adapted for this ${jobAnalysis.primaryDomain} opportunity.`
    : `🎯 PROFESSIONAL TEMPLATE WITH DOMAIN FOCUS:
Since no strong style matches were found, create a professional cover letter that:
1. Uses a confident, engaging professional tone
2. Follows standard cover letter structure
3. Emphasizes ${jobAnalysis.primaryDomain} expertise and relevant technologies
4. Incorporates available domain-relevant project examples naturally
5. Includes a strong call to action`

  return `${styleAnalysis}${lengthTargetsText}🎯 TARGET JOB DETAILS:
Position: ${jobTitle}
Primary Domain: ${jobAnalysis.primaryDomain}
Required Technologies: ${jobAnalysis.technologies.join(", ")}
Company Context: ${jobDescription}
Client Name: ${clientName || "Hiring Manager"}

${projectsContext}
${skillsContext}
${mainInstructions}

📋 FINAL OUTPUT REQUIREMENTS:
Start with: "${clientName ? `Hi ${clientName},` : "Hi,"}"
${
  hasStrongMatch
    ? `Follow the EXACT style patterns identified above while emphasizing ${jobAnalysis.primaryDomain} expertise. Your cover letter should feel authentically written by the same person, just customized for this specific ${jobAnalysis.primaryDomain} role.`
    : `Create a professional, engaging cover letter that showcases ${jobAnalysis.primaryDomain} expertise and incorporates the available domain-relevant project examples naturally.`
}
${
  lengthTargets
    ? `Match the paragraph count and overall length targets above; do not intentionally exceed or undercut that range unless necessary for clarity.`
    : `Keep length concise and professional.`
}
End with professional closing: "Best regards," followed by a line break and "[Your Name]"

🚀 MAKE IT PERFECT: This should be a perfectly targeted ${jobAnalysis.primaryDomain} cover letter that demonstrates clear alignment between your experience and the job requirements!`
}

// Helper analysis functions (keeping all the existing ones)
function extractOpeningPattern(coverLetter: string) {
  const firstParagraph = coverLetter.split("\n\n")[0] || coverLetter.substring(0, 300)
  const firstSentence = firstParagraph.split(".")[0] + "."
  return {
    text: firstSentence,
    style: analyzeOpeningStyle(firstParagraph),
    tone: analyzeOpeningTone(firstParagraph),
    structure: analyzeOpeningStructure(firstParagraph),
  }
}

function extractClosingPattern(coverLetter: string) {
  const paragraphs = coverLetter.split("\n\n")
  const lastParagraph = paragraphs[paragraphs.length - 1] || paragraphs[paragraphs.length - 2] || ""
  return {
    text: lastParagraph.substring(0, 200) + "...",
    ctaStyle: analyzeCTAStyle(lastParagraph),
    enthusiasm: analyzeEnthusiasm(lastParagraph),
    requestType: analyzeRequestType(lastParagraph),
  }
}

function analyzeDetailedStructure(coverLetter: string) {
  const paragraphs = Math.max(1, coverLetter.split("\n\n").length)
  const avgParagraphLength = coverLetter.length / paragraphs
  return {
    paragraphs: paragraphs,
    flow: avgParagraphLength > 200 ? "Detailed paragraphs" : "Concise paragraphs",
    transitions:
      coverLetter.includes("Additionally") || coverLetter.includes("Furthermore")
        ? "Formal transitions"
        : "Natural flow",
    professionalism: coverLetter.toLowerCase().includes("sincerely") ? "Very formal" : "Professional casual",
  }
}

function analyzeSentenceLength(text: string): string {
  const sentences = text.split(".").filter((s) => s.trim().length > 10)
  const avgLength = sentences.length ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length : 0
  return avgLength > 80 ? "Long, complex sentences" : "Moderate, clear sentences"
}

function analyzeVocabulary(text: string): string {
  const complexWords = ["optimization", "implementation", "sophisticated", "comprehensive", "methodology"]
  const hasComplexVocab = complexWords.some((word) => text.toLowerCase().includes(word))
  return hasComplexVocab ? "Technical/Advanced vocabulary" : "Clear, professional vocabulary"
}

function analyzePersonalPronouns(text: string): string {
  const iCount = (text.match(/\bI\b/g) || []).length
  const myCount = (text.match(/\bmy\b/gi) || []).length
  const total = iCount + myCount
  return total > 15 ? "High personal focus" : "Balanced personal/professional focus"
}

function analyzeTechnicalLevel(text: string): string {
  const techTerms = ["API", "database", "framework", "algorithm", "architecture", "development", "implementation"]
  const techCount = techTerms.filter((term) => text.toLowerCase().includes(term.toLowerCase())).length
  return techCount > 3 ? "High technical detail" : "Business-focused with technical mentions"
}

function analyzeOpeningStyle(paragraph: string): string {
  const lower = paragraph.toLowerCase()
  if (lower.includes("excited")) return "Enthusiastic"
  if (lower.includes("pleased")) return "Formal pleased"
  if (lower.includes("writing to express")) return "Formal expression"
  return "Direct professional"
}

function analyzeOpeningTone(paragraph: string): string {
  if (paragraph.includes("!")) return "Energetic"
  const lower = paragraph.toLowerCase()
  if (lower.includes("honored") || lower.includes("privilege")) return "Respectful"
  return "Confident professional"
}

function analyzeOpeningStructure(paragraph: string): string {
  const sentences = paragraph.split(".").filter((s) => s.trim().length > 10)
  if (sentences.length === 1) return "Single impactful sentence"
  if (sentences.length === 2) return "Two-sentence opener"
  return "Multi-sentence introduction"
}

function analyzeCTAStyle(paragraph: string): string {
  const lower = paragraph.toLowerCase()
  if (lower.includes("look forward")) return "Traditional follow-up"
  if (lower.includes("excited to discuss")) return "Enthusiastic discussion"
  if (lower.includes("welcome the opportunity")) return "Welcoming approach"
  return "Direct professional request"
}

function analyzeEnthusiasm(paragraph: string): string {
  const enthusiasticWords = ["excited", "thrilled", "eager", "passionate"]
  const hasEnthusiasm = enthusiasticWords.some((word) => paragraph.toLowerCase().includes(word))
  return hasEnthusiasm ? "High enthusiasm" : "Professional interest"
}

function analyzeRequestType(paragraph: string): string {
  const lower = paragraph.toLowerCase()
  if (lower.includes("interview")) return "Interview request"
  if (lower.includes("discuss")) return "Discussion request"
  if (lower.includes("call")) return "Call request"
  return "General follow-up"
}

function generateProjectNarrative(project: any): string {
  const description: string = (project.project_description || "").toLowerCase()
  if (description.includes("increased")) return "Performance improvement story"
  if (description.includes("developed")) return "Development achievement story"
  if (description.includes("managed")) return "Leadership and management story"
  return "Technical accomplishment story"
}

function extractDetailedOutcomes(description: string) {
  return {
    metrics: extractMetrics(description),
    impact: extractBusinessImpact(description),
    jobRelevance: extractJobRelevance(description),
  }
}

function extractMetrics(description: string): string {
  if (description.includes("%")) return "Percentage improvements mentioned"
  const lower = description.toLowerCase()
  if (lower.includes("reduced") || lower.includes("increased")) return "Quantitative improvements"
  return "Qualitative achievements"
}

function extractBusinessImpact(description: string): string {
  const lower = description.toLowerCase()
  if (lower.includes("revenue") || lower.includes("cost")) return "Financial impact"
  if (lower.includes("user") || lower.includes("customer")) return "User experience impact"
  return "Operational efficiency impact"
}

function extractJobRelevance(description: string): string {
  const lower = description.toLowerCase()
  if (lower.includes("backend")) return "Backend development roles"
  if (lower.includes("frontend")) return "Frontend development roles"
  if (lower.includes("full")) return "Full-stack development roles"
  return "General development roles"
}

function generateSkillIntegrationTip(skill: any, jobDescription: string): string {
  const skillName = (skill.skill_name || "").toLowerCase()
  const jobLower = (jobDescription || "").toLowerCase()
  if (jobLower.includes(skillName)) {
    return `Directly mentioned in job description - emphasize strongly`
  }
  if (skill.metadata?.skillCategory === "Technical") {
    return `Weave into project examples naturally`
  }
  return `Mention as supporting capability`
}
