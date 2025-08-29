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
  supabase: SupabaseClient,
  category = "web",
): Promise<SearchResults> {
  const [r1CoverLetters, r2Projects, r3Skills] = await Promise.all([
    searchSimilarR1CoverLetters(queryEmbedding, supabase, category),
    searchSimilarR2Projects(queryEmbedding, supabase, category),
    searchSimilarR3Skills(queryEmbedding, supabase, category),
  ])

  const totalMatches = r1CoverLetters.length + r2Projects.length + r3Skills.length

  

  return {
    r1CoverLetters,
    r2Projects,
    r3Skills,
    totalMatches,
    fallbackData: { r1: [], r2: [], r3: [] }, // Empty fallback data since we removed fallback logic
  }
}

/**
 * R1: Cover Letters — ensure we return the exact cover_letter from category-specific table.
 */
async function searchSimilarR1CoverLetters(queryEmbedding: number[], supabase: SupabaseClient, category: string) {
  try {
    console.log(`Searching R1 for similar cover letters in ${category} category...`)

    const rpcName = `match_${category}_r1_job_examples`

    // Query Supabase using vector similarity search (cosine distance)
    const { data: rpcData, error } = await supabase.rpc(rpcName, {
      query_embedding: queryEmbedding,
      match_threshold: 0.6, // optional: only return strong matches
      match_count: 4,
    }) as { data: R1RPCRow[] | null; error: any }

    if (error) {
      console.error('Supabase RPC Error:', error);
      return []
    }

    if (rpcData && rpcData.length > 0) {
      // Always hydrate by IDs to get the exact cover_letter column values.
      const hydrated = await hydrateR1RowsWithCoverLetters(rpcData, supabase, category)
      if (hydrated.length > 0) {
        
        return hydrated
      }
    }

 
    return []
  } catch (error) {
    console.error("R1 search error:", error)
    return []
  }
}

/**
 * Hydrate R1 RPC rows with full records from category-specific table to ensure exact cover_letter is returned.
 */
async function hydrateR1RowsWithCoverLetters(
  rpcRows: R1RPCRow[],
  supabase: SupabaseClient,
  category: string,
): Promise<R1Row[]> {
  if (!rpcRows || rpcRows.length === 0) return []

  console.log(` Hydrating ${rpcRows.length} RPC rows to get full cover letter content...`)

  const tableName = `${category}_r1_job_examples`
  const ids = rpcRows.map((r) => r.id)
  const simMap = new Map(rpcRows.map((r) => [r.id, r.similarity]))

  const { data, error } = await supabase
    .from(tableName)
    .select("id, job_title, job_description, cover_letter, metadata, created_at, combined_embedding")
    .in("id", ids)

  if (error || !data) {
    console.error("Hydration error fetching r1_job_examples by ids:", error)
    return []
  }

  console.log(`✅ Successfully hydrated ${data.length} records from database`)

  // Merge similarity back and ensure sorting by similarity desc
  const merged = (data as R1Row[]).map((row) => ({
    ...row,
    similarity: simMap.get(row.id) ?? 0,
  }))

  merged.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))

  return merged.filter((r) => typeof r.cover_letter === "string" && r.cover_letter.trim().length > 0)
}

// Simplified R2 search (no domain filtering)
async function searchSimilarR2Projects(
  queryEmbedding: number[],
  supabase: SupabaseClient,
  category: string,
) {
  try {
    console.log(`🎯 Searching R2 for projects in ${category} category...`)

    const rpcName = `match_${category}_r2_projects`

    // Query Supabase using vector similarity search (cosine distance)
    const { data: rpcData, error } = await supabase.rpc(rpcName, {
      query_embedding: queryEmbedding,
      match_threshold: 0.8, 
      match_count: 5,
    })

    if (error) {
      console.error('Supabase RPC Error:', error);
      return []
    }

    if (rpcData && rpcData.length > 0) {
    
      return rpcData.slice(0, 3) // return top 3
    }


    return [] 
  } catch (error) {
    console.error("R2 search error:", error)
    return []
  }
}

async function searchSimilarR3Skills(queryEmbedding: number[], supabase: SupabaseClient, category: string) {
  try {
    console.log(` Searching R3 for relevant skills in ${category} category...`)

    const rpcName = `match_${category}_r3_skills`

    // Query Supabase using vector similarity search (cosine distance)
    const { data: rpcData, error } = await supabase.rpc(rpcName, {
      query_embedding: queryEmbedding,
      match_threshold: 0.7, 
      match_count: 8,
    })

    if (error) {
      console.error('Supabase RPC Error:', error);
      return []
    }

    if (rpcData && rpcData.length > 0) {
      console.log(`✅ Found ${rpcData.length} R3 skills with threshold 0.6`)
      return rpcData as any[]
    }


    return []
  } catch (error) {
    console.error("R3 search error:", error)
    return []
  }
}


