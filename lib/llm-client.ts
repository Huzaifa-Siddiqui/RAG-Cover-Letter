export async function streamOpenAIResponse(prompt: string, context: any): Promise<Response> {

  // console.log("Sending request to OpenAI API with prompt:", prompt)
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
          content: `You are an expert in crafting professional Upwork-style proposals.
           Your task is to generate a concise, professional, and tailored proposal that strictly follows the provided instructions, using the variables and guidelines given by the user. 
           Select the most relevant intro based on the project type, use the provided CTA exactly as given, and
            follow the 7-step structure: 
            (1) Start with the most relevant project (it should closely match the job category like Web, AI and Web+AI), 
            (2) Show how you’ll solve the client’s problem, 
            (3) Brief technical approach, 
            (4) Show 2–3 more relevant projects, 
            (5) Ask 3 technical questions, 
            (6) Brief intro tailored to the project, 
            (7) Use the exact CTA. 
            
            Ensure the tone is professional, client-focused, and concise. Do not mention these instructions or guidelines in the output. If clientName is unavailable, use “Hi there,”. 
            Ensure questions in Step 5 are specific to the job post and demonstrate technical expertise. Output the proposal in the exact order specified, 
            adhering to the provided format and guidelines.`,
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

  console.log("Streaming cover letter with global knowledge base context...")

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