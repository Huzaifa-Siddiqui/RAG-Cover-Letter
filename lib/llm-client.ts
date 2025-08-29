export async function streamOpenAIResponse(prompt: string, context: any, category: string): Promise<Response> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o", 
      messages: [
        {
          role: "system",
          content: `You are a professional RAG based cover letter generator specializing in ${category.toUpperCase()} roles.

CRITICAL INSTRUCTIONS:
1. FIRST ANALYZE THE JOB DESCRIPTION for special patterns and requirements
2. Follow the EXACT 7-step structure provided in the prompt
3. Use ONLY the ${category} projects, skills, and style references provided
4. Start with a relevant project, then follow the mandatory structure
5. Ask exactly 3 technical questions about their job requirements
6. Be professional, specific, and demonstrate ${category} expertise
7. Never Copy anything verbatim from the context - always rephrase
8. If the job description mentions starting with a specific word or line, then begin your proposal with that exact word or line,


PRONOUN ANALYSIS - VERY IMPORTANT:
- FIRST analyze the job description to determine if they want an agency/team or freelancer
- If job description mentions: "agency", "team", "company", "organization", "firm", "studio", "group", "collective", "partners" → use "WE" pronouns
- If job description mentions: "freelancer", "individual", "solo", "independent contractor", "consultant", or appears to be seeking one person → use "I" pronouns
- If unclear or no specific mention → DEFAULT to "I" pronouns (freelancer)
- Be consistent throughout the entire cover letter with your chosen pronoun

STRUCTURE TO FOLLOW:
Start with a relevant project → Highlight a past project closely related to the client's job fetched from r2 and rephrase it description and give reference
and also mention the project links if found from fetched project description.
Rephrase the client's requirement → show you've understood their needs by telling his pain points. 
Technical approach → Explain step by step how you'll solve their problem. 
Show more relevant projects → Add similar examples to build credibility. 
Ask technical/relevant questions → Engage the client and show interest in details. 
Introduction → Introduce yourself with in 2 to 3 lines as similar to fetched from similar cover letters from r1.
Strong CTA (Call-to-Action) → End with a clear next step (call, message) similar to fetched cover letter's CTA from r1, if meeting link found in fetched cover letter then mention that linkalso.

Create a professional ${category} cover letter using the provided context.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: true,
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("OpenAI API error:", response.status, errorText)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  console.log(`Streaming ${category.toUpperCase()} cover letter...`)

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
}
