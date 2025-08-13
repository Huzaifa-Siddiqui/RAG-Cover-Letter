// LLM Client and Streaming Utilities

export async function streamOpenRouterResponse(prompt: string, context: any): Promise<Response> {
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
      throw new Error(`OpenRouter API error: ${response.status}`)
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
  }
  