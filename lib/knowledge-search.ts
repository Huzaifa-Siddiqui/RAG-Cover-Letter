// Knowledge Base Search Utilities
import type { SupabaseClient } from "@supabase/supabase-js"
import type { JobAnalysis } from "./job-analysis"

export interface SearchResults {
  r1CoverLetters: any[]
  r2Projects: any[]
  r3Skills: any[]
  totalMatches: number
  fallbackData: {
    r1: any[]
    r2: any[]
    r3: any[]
  }
}

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

export async function searchKnowledgeBase(
  queryEmbedding: number[],
  jobAnalysis: JobAnalysis,
  supabase: SupabaseClient,
): Promise<SearchResults> {
  const [r1CoverLetters, r2Projects, r3Skills] = await Promise.all([
    searchSimilarR1CoverLetters(queryEmbedding, supabase),
    searchSimilarR2ProjectsWithDomainFilter(queryEmbedding, jobAnalysis, supabase),
    searchSimilarR3Skills(queryEmbedding, supabase),
  ])

  const totalMatches = r1CoverLetters.length + r2Projects.length + r3Skills.length

  let fallbackData = { r1: [] as any[], r2: [] as any[], r3: [] as any[] }
  if (totalMatches === 0) {
    console.log("🔄 No matches found, getting fallback data...")
    fallbackData = await getFallbackData(supabase)
  }

  // Log detailed results
  logSearchResults(r1CoverLetters, r2Projects, r3Skills)

  return {
    r1CoverLetters,
    r2Projects,
    r3Skills,
    totalMatches,
    fallbackData,
  }
}

/**
 * R1: Cover Letters — ensure we return the exact cover_letter from r1_job_examples.
 */
async function searchSimilarR1CoverLetters(queryEmbedding: number[], supabase: SupabaseClient) {
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
        const hydrated = await hydrateR1RowsWithCoverLetters(rpcData, supabase)
        if (hydrated.length > 0) {
          console.log(
            `✅ Found ${hydrated.length} R1 cover letters with threshold ${threshold} (hydrated exact cover_letter)`,
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

    console.log(`✅ Found ${results.length} R1 cover letters via manual search (exact cover_letter)`)
    return results
  } catch (error) {
    console.error("R1 search error:", error)
    return []
  }
}

/**
 * Hydrate R1 RPC rows with full records from r1_job_examples to ensure exact cover_letter is returned.
 */
async function hydrateR1RowsWithCoverLetters(rpcRows: R1RPCRow[], supabase: SupabaseClient): Promise<R1Row[]> {
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
async function searchSimilarR2ProjectsWithDomainFilter(
  queryEmbedding: number[],
  jobAnalysis: JobAnalysis,
  supabase: SupabaseClient,
) {
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
            `✅ Found ${domainFilteredProjects.length} domain-relevant R2 projects with threshold ${threshold}`,
          )
          return domainFilteredProjects.slice(0, 3) // Return top 3 most relevant
        }
      }
    }

    // Manual fallback with domain filtering
    const { data: allData, error } = await supabase.from("r2_past_projects").select("*").limit(50)

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

    console.log(`✅ Found ${domainFilteredResults.length} domain-relevant R2 projects via manual search`)
    return domainFilteredResults.slice(0, 3)
  } catch (error) {
    console.error("R2 search error:", error)
    return []
  }
}

// Filter projects by domain relevance
function filterProjectsByDomain(projects: any[], jobAnalysis: JobAnalysis): any[] {
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
    targetDomains.forEach((domain) => {
      if (projectType.includes(domain) || projectDescription.includes(domain.toLowerCase())) {
        domainScore += 1
      }
    })

    // Technology matching
    targetTechnologies.forEach((tech) => {
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

async function searchSimilarR3Skills(queryEmbedding: number[], supabase: SupabaseClient) {
  try {
    console.log("🔍 Searching R3 for relevant skills...")

    const thresholds = [0.2, 0.15, 0.1, 0.05]

    for (const threshold of thresholds) {
      const { data: rpcData, error: rpcError } = await supabase.rpc("match_r3_skills", {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: 8,
      })

      if (!rpcError && rpcData && rpcData.length > 0) {
        console.log(`✅ Found ${rpcData.length} R3 skills with threshold ${threshold}`)
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

    console.log(`✅ Found ${results.length} R3 skills via manual search`)
    return results
  } catch (error) {
    console.error("R3 search error:", error)
    return []
  }
}

async function getFallbackData(supabase: SupabaseClient) {
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

function logSearchResults(r1CoverLetters: any[], r2Projects: any[], r3Skills: any[]) {
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
}
