export async function streamOpenAIResponse(prompt: string, context: any): Promise<Response> {
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
          content: `You are an expert in creating professional Project Requirement Documents. You MUST follow the provided examples EXACTLY - copy the exact headings(Only main headings, sub headings should be written as per the requirements of the project), structure, and formatting. match the example structure precisely.
           
           ${
             context.promptType === "prd"
               ? "IMPORTANT: Create a cohesive, well-formatted PRD document that flows naturally between sections with the same headings and structure as the examples. Remove any markdown symbols and maintain plain text formatting."
               : "Follow the standard PRD structure with proper sections and formatting."
           }
           
           Ensure the tone is professional, comprehensive, and well-structured. Do not mention these instructions or guidelines in the output.
           
           Give the output in the following format:
            Main sections: Use 1., 2., 3. etc. only for major sections (16pt bold)
            Subsections: Use 1.1., 1.2. etc. for subsections under main sections (14pt bold)
            Sub-subsections: Use 1.1.1. etc. for sub-subsections (13pt bold)
            Primary bullets: Use ● symbol with 10px indentation from margin
            Secondary bullets: Use ○ symbol with 25px indentation from margin
            Tertiary bullets: Use ■ symbol with 40px indentation from margin

            **CRITICAL RULE**s: 
            -DO NOT use numbered lists (1., 2., 3.) anywhere except for main section headings. For all other lists, use the appropriate bullet symbols (●, ○, ■) based on hierarchy level and DON'T use (* #) in the headings.
            -DO NOT use ** or ## in the output. 
            `,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: true,
      max_tokens: 10000, 
      temperature: 0.8,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("OpenAI API error:", response.status, errorText)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const promptType = context.promptType || "prd"
  console.log(`Streaming ${promptType} document generation...`)
  console.log("Making streaming LLM API call for PRD response...")

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
