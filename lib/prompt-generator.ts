export function createPerfectRAGPrompt(
  jobTitle: string,
  jobDescription: string,
  context: any,
  category: string,
  clientName?: string,
): string {
  
  // R1 Context - Similar cover letters content only
  let coverLettersReference = ""
  if (context.r1 && context.r1.length > 0) {
    coverLettersReference = `SIMILAR COVER LETTERS FOR REFERENCE:
${context.r1
  .slice(0, 2) // Top 2 most similar cover letters
  .map((letter: any, index: number) => 
    `${index + 1}. Job: "${letter.job_title}" (${(letter.similarity * 100).toFixed(1)}% similarity)
   Content: ${letter.cover_letter}`
  )
  .join("\n\n")}
`
  }

  // R2 Projects Context - Most relevant projects to highlight
  let projectsContext = ""
  if (context.r2 && context.r2.length > 0) {
    projectsContext = `RELEVANT PROJECTS TO REFERENCE:
${context.r2
  .slice(0, 4) // Top 4 most relevant projects
  .map((project: any, index: number) => 
    `${index + 1}. ${project.project_title}
   Description: ${project.project_description}
   Technologies: ${project.metadata?.technologies?.join(", ") || "Not specified"}
   Similarity: ${(project.similarity * 100).toFixed(1)}%`
  )
  .join("\n\n")}
`
  }

  // R3 Skills Context - Relevant skills to weave in
  let skillsContext = ""
  if (context.r3 && context.r3.length > 0) {
    skillsContext = `RELEVANT SKILLS TO MENTION:
${context.r3
  .slice(0, 6) // Top 6 relevant skills
  .map((skill: any) => `• ${skill.skill_name}: ${skill.skill_description}`)
  .join("\n")}
`
  }

  return `COVER LETTER GENERATION PROMPT

JOB DETAILS:
Position: ${jobTitle}
Category: ${category}
Client: ${clientName }
Job Description: ${jobDescription}

${projectsContext}
${skillsContext}
${coverLettersReference}

STEP 1 - JOB DESCRIPTION ANALYSIS:
Analyze the job description for these patterns:
- Agency/Team indicators: "agency", "team", "company", "organization", "firm", "studio", "group", "collective", "partners", "your team", "your company"
- Freelancer indicators: "freelancer", "individual", "solo", "independent contractor", "consultant", "looking for someone", "individual developer"
- First, carefully check the job description to see if the client asks for any specific details to be included in your proposal, and make sure to include them.
- if they are saying we dont want an agency or team then use I pronouns.

CRITICAL INSTRUCTIONS:
1. FIRST ANALYZE THE JOB DESCRIPTION for special patterns and requirements
2. Follow the EXACT 7-step structure provided in the prompt
3. Use ONLY the ${category} projects, skills, and style references provided
4. Start with a relevant project, then follow the mandatory structure
5. Ask exactly 3 technical questions about their job requirements
6. Be professional, specific, and demonstrate ${category} expertise
7. Never Copy anything verbatim from the context - always rephrase

PRONOUN ANALYSIS - VERY IMPORTANT:
- FIRST analyze the job description to determine if they want an agency/team or freelancer
- If job description mentions: "agency", "team", "company", "organization", "firm", "studio", "group", "collective", "partners" → use "WE" pronouns
- If job description mentions: "freelancer", "individual", "solo", "independent contractor", "consultant", or appears to be seeking one person → use "I" pronouns
- If unclear or no specific mention → DEFAULT to "I" pronouns (freelancer)
- Be consistent throughout the entire cover letter with your chosen pronoun

PRONOUN DECISION RULES:
- If agency/team indicators found → Use "WE" pronouns throughout
- If freelancer indicators found OR unclear → Use "I" pronouns throughout (DEFAULT)
- Maintain consistency with chosen pronoun throughout entire letter
- Special writing patterns: Any specific format, tone, or structure requirements mentioned

MANDATORY STRUCTURE - FOLLOW THIS EXACT ORDER:

1. START WITH RELEVANT PROJECT
   Begin with "Hi ${clientName}"
   Highlight your most relevant project from R2 that matches their needs make sure its relating with job description).
   Rephrase the project description to show direct alignment with their job 
   mention the title and project links from fetched project description.
   Make it compelling and specific

2. REPHRASE CLIENT'S REQUIREMENT
   Show you understand their needs by rephrasing their job description
   Identify and mention their specific pain points
   Example: "I/We understand you're looking for [rephrase requirement] to address [pain point]"

3. TECHNICAL APPROACH
   Explain step by step how you'll solve their problem
   Use specific technologies and methodologies from your skillset
   Be concrete and detailed about your approach

4. SHOW MORE RELEVANT PROJECTS
   Add 2-3 more examples from R2 projects to build credibility
   Focus on measurable outcomes and results
   Show variety in your experience - rephrase project descriptions, don't copy paste
   
5. ASK TECHNICAL/RELEVANT QUESTIONS
      Ask 3 specific questions about their project requirements
      Show you've studied their job posting carefully
      Demonstrate strategic thinking about their challenges
      It should be look like you have researched about their project and you are very interested in working with them.

6. INTRODUCTION
   Introduce yourself/your expertise in 2-3 lines
   Copy the experience and exact style from R1 (Fetched cover letters)
   Keep it professional and relevant to ${category}
   
   
7. STRONG CTA (CALL-TO-ACTION)
  similar reparture from similar cover letter's CTA from R1 but rephrased, if meeting link found in fetched cover letter then put that link also.

OUTPUT REQUIREMENTS:
- Professional tone matching the ${category} field
- Use projects and skills from the provided context only
- Keep it concise but comprehensive
- Maintain consistent pronoun usage throughout (I vs We)
- End with "Regards, [Your Name]" or "Regards, [Team Name]" based on pronoun choice
- Follow any specific patterns mentioned in the job description

Generate the complete cover letter following this exact 7-step structure with proper pronoun analysis.`
}