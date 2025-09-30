export async function streamSuggestedActors({
  jobDescription,
  projectRequirements,
  otherText,
}: {
  jobDescription: string
  projectRequirements: string
  otherText?: string
}): Promise<Response> {
  const prompt = `Analyze the project details and identify the key ACTORS (agents, roles, or entities) that will interact with and perform actions in this system.

PROJECT DETAILS:

Job Description:
${jobDescription}

Project Requirements:
${projectRequirements}

${otherText ? `Additional Context:\n${otherText}` : ""}

INSTRUCTIONS:
1. Read the project details carefully
2. Identify all distinct actors/agents/roles that will interact with the system
3. Actors can be: humans (Admin, User, Manager), AI agents (Content Generator Agent, Marketing Agent), or any entity performing actions
4. Output actor names that are interacting with the system
5. Use descriptive names that clearly indicate what each actor does
6. DONT add the actors that are involve in the development of the system (e.g., Developer, Tester, Ui/UX Designer, Frontend Developer, Backend Developer, Project Manager, etc.)


IMPORTANT:
- ONLY include actors that directly interact with and perform actions in the application described in the job description/project requirements
- Include AI agents if the project involves automation/AI (e.g., "Marketing Agent", "SEO Agent")
- Include human roles that manage or use the system (e.g., "Admin", "Content Manager")
- Include system components if they act as independent entities
- Use 2-5 words per actor name
- Use Title Case
- Be specific about what each actor does (e.g., "Social Media Marketing Agent" not just "Agent")
- Only include actors that directly interact with or perform actions in the application that is user discussing in the job description/project requirements


**CRITICAL:
FOLLOW these EXAMPLES OF ACTORS so you can understand what type of actors to include and what to avoid
-User
-Administrator
-Moderator
-Guest User
-Buyer
-Seller
-Support Agent
-Automation Bot

EXAMPLES FOR DIFFERENT PROJECT TYPES:

For AI Agent/Automation Projects:
Content Generation Agent
Social Media Marketing Agent
SEO Optimization Agent
Admin
Developer

For E-commerce Projects:
Customer
Admin
Payment Processor
Inventory Manager
Support Agent

For Learning Management Systems:
Student
Instructor
Admin
Assessment Agent
Content Creator

OUTPUT FORMAT:
One actor per line
2-5 words each
Title Case
No numbering or bullets

CRITICAL:
NOT TO INCLUDE:
- Do NOT include terms like "System", "Software" 
- Do NOT include development roles like "Developer", "Tester", "Project Manager"
- Do NOT include duplicate or very similar actors
- Do NOT include actors that do not directly interact with the system (e.g., "Dashboard Viewer, "Analytics Viewer","Notification system/Receiver")
- Do NOT include features or functionalities (e.g., "Payment Gateway", "Search Functionality", "User Authentication", User Search", "Content Management System", Stream Chat)




ACTORS:`

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
          content:
            "Identify all actors (participants/agents/roles) in the system. Actors can be human users, AI agents, automated systems, or any entity that performs actions. For AI/automation projects, include the AI agents themselves as actors. Output descriptive names (2-5 words, Title Case), one per line.",
        },
        { role: "user", content: prompt },
      ],
      stream: true,
      max_tokens: 150,
      temperature: 0.2,
      top_p: 0.4,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] OpenAI API error (actors):", response.status, errorText)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

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
            controller.close()
            break
          }
          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split("\n")
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim()

              if (data === "[DONE]") {
                controller.close()
                return
              }

              if (data) {
                try {
                  const parsed = JSON.parse(data)
                  const delta = parsed.choices?.[0]?.delta?.content
                  if (delta) {
                    // Stream raw text content directly
                    controller.enqueue(encoder.encode(delta))
                  }
                } catch {
                  // ignore JSON parse errors for partial frames
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("[v0] Stream error (actors):", error)
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}