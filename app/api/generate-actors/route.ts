import { streamSuggestedActors } from "@/lib/llm-client3"
import type { NextRequest } from "next/server"


export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { jobDescription, projectRequirements, otherText } = await req.json()

  if (!jobDescription || !projectRequirements) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  return streamSuggestedActors({
    jobDescription,
    projectRequirements,
    otherText,
  })
}
