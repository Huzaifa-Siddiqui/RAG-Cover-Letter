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

    return { jobExamples, projects, skills, totalMatches }
  }

  /**
   * Job examples
   */
  async function searchSimilarJobExamples(queryEmbedding: number[], supabase: SupabaseClient) {
    try {
      console.log("🔍 Searching for similar job examples...")
      const { data: rpcData, error } = await supabase.rpc("match_job_examples", {
        query_embedding: queryEmbedding,
        match_threshold: 0.6,
        match_count: 20, // ⬅️ fetch more candidates
      }) as { data: JobExampleRPCRow[] | null; error: any }

      if (error) {
        console.error("Supabase RPC Error:", error)
        return []
      }

      if (rpcData?.length) {
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

  async function hydrateJobExamplesWithCoverLetters(
    rpcRows: JobExampleRPCRow[],
    supabase: SupabaseClient,
  ): Promise<JobExampleRow[]> {
    if (!rpcRows?.length) return []
    const ids = rpcRows.map((r) => r.id)
    const simMap = new Map(rpcRows.map((r) => [r.id, r.similarity]))

    const { data, error } = await supabase
      .from("job_examples")
      .select("id, job_title, job_description, cover_letter, metadata, created_at, combined_embedding")
      .in("id", ids)

    if (error || !data) {
      console.error("Hydration error:", error)
      return []
    }

    return (data as JobExampleRow[])
      .map((row) => ({ ...row, similarity: simMap.get(row.id) ?? 0 }))
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      .filter((r) => typeof r.cover_letter === "string" && r.cover_letter.trim().length > 0)
  }

  /**
   * Projects
   */
  async function searchSimilarProjects(queryEmbedding: number[], supabase: SupabaseClient) {
    try {
      console.log("🎯 Searching for similar projects...")
      const { data: rpcData, error } = await supabase.rpc("match_projects", {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 20, // ⬅️ fetch more candidates
      })

      if (error) {
        console.error("Supabase RPC Error:", error)
        return []
      }

      if (rpcData?.length) {
        console.log(`✅ Found ${rpcData.length} similar projects`)
        return rpcData
      }

      console.log("❌ No similar projects found")
      return []
    } catch (error) {
      console.error("Projects search error:", error)
      return []
    }
  }

  /**
   * Skills
   */
  async function searchSimilarSkills(queryEmbedding: number[], supabase: SupabaseClient) {
    try {
      console.log("🎪 Searching for relevant skills...")
      const { data: rpcData, error } = await supabase.rpc("match_skills", {
        query_embedding: queryEmbedding,
        match_threshold: 0.6,
        match_count: 20, // ⬅️ fetch more candidates
      })

      if (error) {
        console.error("Supabase RPC Error:", error)
        return []
      }

      if (rpcData?.length) {
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
