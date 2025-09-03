// Knowledge Base Search Utilities (Global Tables)
import type { SupabaseClient } from "@supabase/supabase-js"

export interface SearchResults {
  jobExamples: any[]
  projects: any[]
  skills: any[]
  totalMatches: number
}

type JobExampleRPCRow = {
  id: number
  similarity: number
  cover_letter?: string | null
  job_title?: string | null
  job_description?: string | null
  metadata?: any
}

type JobExampleRow = {
  id: number
  job_title: string | null
  job_description: string | null
  cover_letter: string | null
  category: string | null
  metadata: any
  created_at: string | null
  combined_embedding: number[] | null
  similarity?: number
}

export async function searchKnowledgeBase(
  queryEmbedding: number[],
  supabase: SupabaseClient,
): Promise<SearchResults> {
  const [jobExamples, projects, skills] = await Promise.all([
    searchSimilarJobExamples(queryEmbedding, supabase),
    searchSimilarProjects(queryEmbedding, supabase),
    searchSimilarSkills(queryEmbedding, supabase),
  ])

  const totalMatches = jobExamples.length + projects.length + skills.length

  return {
    jobExamples,
    projects,
    skills,
    totalMatches,
  }
}

/**
 * Search for similar job examples and cover letters
 */
async function searchSimilarJobExamples(queryEmbedding: number[], supabase: SupabaseClient) {
  try {
    console.log("🔍 Searching for similar job examples...")

    // Query Supabase using vector similarity search (cosine distance)
    const { data: rpcData, error } = await supabase.rpc('match_job_examples', {
      query_embedding: queryEmbedding,
      match_threshold: 0.6, // optional: only return strong matches
      match_count: 4,
    }) as { data: JobExampleRPCRow[] | null; error: any }

    if (error) {
      console.error('Supabase RPC Error:', error);
      return []
    }

    if (rpcData && rpcData.length > 0) {
      // Always hydrate by IDs to get the exact cover_letter column values.
      const hydrated = await hydrateJobExamplesWithCoverLetters(rpcData, supabase)
      if (hydrated.length > 0) {
        console.log(`✅ Found ${hydrated.length} similar job examples`)
        return hydrated
      }
    }

    console.log("❌ No similar job examples found")
    return []
  } catch (error) {
    console.error("Job examples search error:", error)
    return []
  }
}

/**
 * Hydrate job example RPC rows with full records from table to ensure exact cover_letter is returned.
 */
async function hydrateJobExamplesWithCoverLetters(
  rpcRows: JobExampleRPCRow[],
  supabase: SupabaseClient,
): Promise<JobExampleRow[]> {
  if (!rpcRows || rpcRows.length === 0) return []

  console.log(`🔄 Hydrating ${rpcRows.length} RPC rows to get full cover letter content...`)

  const ids = rpcRows.map((r) => r.id)
  const simMap = new Map(rpcRows.map((r) => [r.id, r.similarity]))

  const { data, error } = await supabase
    .from('job_examples')
    .select("id, job_title, job_description, cover_letter, metadata, created_at, combined_embedding")
    .in("id", ids)

  if (error || !data) {
    console.error("Hydration error fetching job_examples by ids:", error)
    return []
  }

  console.log(`✅ Successfully hydrated ${data.length} records from database`)

  // Merge similarity back and ensure sorting by similarity desc
  const merged = (data as JobExampleRow[]).map((row) => ({
    ...row,
    similarity: simMap.get(row.id) ?? 0,
  }))

  merged.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))

  return merged.filter((r) => typeof r.cover_letter === "string" && r.cover_letter.trim().length > 0)
}

/**
 * Search for similar projects
 */
async function searchSimilarProjects(queryEmbedding: number[], supabase: SupabaseClient) {
  try {
    console.log("🎯 Searching for similar projects...")

    // Query Supabase using vector similarity search (cosine distance)
    const { data: rpcData, error } = await supabase.rpc('match_projects', {
      query_embedding: queryEmbedding,
      match_threshold: 0.6, 
      match_count: 10,
    })

    if (error) {
      console.error('Supabase RPC Error:', error);
      return []
    }

    if (rpcData && rpcData.length > 0) {
      console.log(`✅ Found ${rpcData.length} similar projects`)
      return rpcData.slice(0, 3) // return top 3
    }
        console.log(searchSimilarProjects)
    console.log("❌ No similar projects found")
    return [] 
  } catch (error) {
    console.error("Projects search error:", error)
    return []
  }
}

/**
 * Search for similar skills
 */
async function searchSimilarSkills(queryEmbedding: number[], supabase: SupabaseClient) {
  try {
    console.log("🎪 Searching for relevant skills...")

    // Query Supabase using vector similarity search (cosine distance)
    const { data: rpcData, error } = await supabase.rpc('match_skills', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7, 
      match_count: 8,
    })

    if (error) {
      console.error('Supabase RPC Error:', error);
      return []
    }

    if (rpcData && rpcData.length > 0) {
      console.log(`✅ Found ${rpcData.length} relevant skills`)
      return rpcData as any[]
    }

    console.log("❌ No relevant skills found")
    return []
  } catch (error) {
    console.error("Skills search error:", error)
    return []
  }
}