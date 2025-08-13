// Prompt Generation and Style Analysis Utilities
import type { JobAnalysis } from "./job-analysis"

export function createPerfectRAGPrompt(
  jobTitle: string,
  jobDescription: string,
  context: any,
  clientName?: string,
): string {
  const bestMatch = context.r1[0] // Highest similarity cover letter
  const hasStrongMatch = bestMatch && bestMatch.similarity > 0.2
  const jobAnalysis = context.jobAnalysis

  let styleAnalysis = ""
  let openingPattern = ""
  let closingPattern = ""
  let structurePattern = ""
  let questionExamples = ""

  if (hasStrongMatch && context.r1.length > 0) {
    // Detailed analysis of the best matching cover letter
    const bestLetter: string = bestMatch.cover_letter || ""

    // Extract opening pattern with detailed analysis
    const opening = extractDetailedOpeningPattern(bestLetter)
    openingPattern = `🎯 OPENING PATTERN TO REPLICATE EXACTLY:
Original Opening: "${opening.fullOpening}"
Key Elements to Copy:
- Greeting Style: ${opening.greetingStyle}
- Self-Introduction Pattern: ${opening.introPattern}
- Experience Mention: ${opening.experienceStyle}
- Project Reference Style: ${opening.projectReferenceStyle}
- Tone and Enthusiasm: ${opening.tone}

CRITICAL: Your opening paragraph MUST follow this exact structure and style!
`

    // Extract closing pattern with question analysis
    const closing = extractDetailedClosingPattern(bestLetter)
    closingPattern = `🎯 CTA PATTERN TO MATCH:
Original CTA: "${closing.fullCTA}"
Question Pattern: ${closing.questionPattern}
Number of Questions: ${closing.questionCount}
Question Topics: ${closing.questionTopics.join(", ")}
CTA Style: ${closing.ctaStyle}
Enthusiasm Level: ${closing.enthusiasm}

CRITICAL: Your CTA MUST include exactly 3 relevant questions about the job requirements!
`

    // Extract questions from similar cover letters for reference
    questionExamples = generateQuestionExamples(context.r1, jobDescription, jobAnalysis)

    // Extract overall structure
    const structure = analyzeDetailedStructure(bestLetter)
    structurePattern = `🎯 STRUCTURE PATTERN TO MATCH:
- Paragraph Count: ${structure.paragraphs}
- Flow: ${structure.flow}
- Transition Style: ${structure.transitions}
- Professional Level: ${structure.professionalism}
`

    styleAnalysis = `📊 STYLE ANALYSIS FROM BEST MATCH (${(bestMatch.similarity * 100).toFixed(1)}% similar to "${bestMatch.job_title}"):
${openingPattern}${structurePattern}${closingPattern}🎨 WRITING CHARACTERISTICS TO REPLICATE:
- Sentence Length: ${analyzeSentenceLength(bestLetter)}
- Vocabulary Level: ${analyzeVocabulary(bestLetter)}
- Personal Pronouns Usage: ${analyzePersonalPronouns(bestLetter)}
- Technical Detail Level: ${analyzeTechnicalLevel(bestLetter)}

${questionExamples}
`
  }

  const lengthTargets = deriveLengthTargets(context.r1 || [])
  const lengthTargetsText = lengthTargets
    ? `🧭 LENGTH AND STRUCTURE TARGETS (derived from matched letters):
- Target paragraph count: ${lengthTargets.targetParagraphs} (±1 paragraph)
- Target total length: ~${lengthTargets.targetWords} words (acceptable range: ${lengthTargets.wordsRange[0]}–${lengthTargets.wordsRange[1]} words)
`
    : ""

  // Enhanced R2 Projects Context with domain awareness
  let projectsContext = ""
  if (context.r2.length > 0) {
    projectsContext = `🏆 DOMAIN-RELEVANT PROJECTS TO NATURALLY INTEGRATE:
📊 Job Analysis: Primary Domain = ${jobAnalysis.primaryDomain}, Technologies = ${jobAnalysis.technologies.join(", ")}

${context.r2
  .map((item: any, index: number) => {
    const outcomes = extractDetailedOutcomes(item.project_description || "")
    const projectTechnologies = item.metadata?.technologies || []
    const relevanceScore = item.relevanceScore || 0
    const domainMatch = item.domainMatch ? "✅" : "❌"
    const techMatch = item.techMatch ? "✅" : "❌"

    return `PROJECT ${index + 1} (${(item.similarity * 100).toFixed(1)}% similarity, ${relevanceScore.toFixed(1)} relevance):
${domainMatch} Domain Match | ${techMatch} Tech Match | Type: ${item.metadata?.projectType || "General"}
Title: ${item.project_title}
Key Narrative: ${generateProjectNarrative(item)}
Project Technologies: ${projectTechnologies.join(", ")}
Job Technologies Match: ${
      jobAnalysis.technologies
        .filter(
          (tech: string) =>
            projectTechnologies.includes(tech) ||
            (item.project_description || "").toLowerCase().includes(tech.toLowerCase()),
        )
        .join(", ") || "None"
    }
Measurable Results: ${outcomes.metrics}
Business Impact: ${outcomes.impact}
Perfect for mentioning when discussing: ${outcomes.jobRelevance}

INTEGRATION PHRASES FOR OPENING:
"I am a ${jobAnalysis.primaryDomain} specialist with X+ years of experience specifically in ${projectTechnologies.slice(0, 2).join(" and ")}. I have spearheaded a project similar to your requirements that is ${item.project_title}..."
"As a ${jobAnalysis.primaryDomain} professional, I have successfully delivered ${item.project_title}, which directly aligns with your needs..."
`
  })
  .join("\n")}`
  }

  // R3 Skills Context
  let skillsContext = ""
  if (context.r3.length > 0) {
    skillsContext = `💪 SKILLS TO WEAVE NATURALLY:
${context.r3
  .map((item: any) => {
    return `• ${item.skill_name}: "${(item.skill_description || "").substring(0, 150)}..."   Integration tip: ${generateSkillIntegrationTip(item, jobDescription)}`
  })
  .join("\n")}`
  }

  const mainInstructions = hasStrongMatch
    ? `🎯 PERFECT STYLE MATCHING WITH ENHANCED CTA:
You MUST create a cover letter that exactly matches the style of fetched cover letters from R1. This means:

1. **EXACT OPENING REPLICATION**:
   - Copy the EXACT greeting style and structure from the matched cover letter
   - Use the SAME self-introduction pattern and experience mention style
   - Follow the SAME way they reference their relevant project/experience
   - Match the tone, enthusiasm level, and professional formality EXACTLY
   - If they say "I am an AI ML Specialist with X+ years", you should follow that pattern
   - If they mention a specific project early, you should do the same with a relevant R2 project

2. **DOMAIN-FOCUSED STRUCTURE FLOW**:
   - Follow the exact paragraph breakdown and flow from R1
   - Emphasize ${jobAnalysis.primaryDomain} projects and experience
   - Highlight relevant technologies: ${jobAnalysis.technologies.slice(0, 5).join(", ")}
   - Match the overall length and paragraph count derived from matched letters

3. **ENHANCED CTA WITH 3 QUESTIONS**:
   - Start CTA with: "To better understand your requirements and align our goals, I would appreciate your insights on the following questions:"
   - Ask EXACTLY 3 relevant questions about the job description
   - Questions should be specific to the job requirements and show deep understanding
   - End with the SAME enthusiasm and follow-up style as the matched letter
   - Include availability for discussion

4. **DOMAIN-RELEVANT PROJECT INTEGRATION**:
   - Prioritize projects that match ${jobAnalysis.primaryDomain}
   - Use specific technologies mentioned in the job description
   - Show clear alignment between past projects and job requirements

CRITICAL: The final cover letter should read as if the same person wrote it, just adapted for this ${jobAnalysis.primaryDomain} opportunity.`
    : `🎯 PROFESSIONAL TEMPLATE WITH ENHANCED CTA:
Since no strong style matches were found, create a professional cover letter that:
1. Uses a confident, engaging professional tone
2. Follows standard cover letter structure with domain focus
3. Emphasizes ${jobAnalysis.primaryDomain} expertise and relevant technologies
4. Incorporates available domain-relevant project examples naturally
5. Includes 3 relevant questions about the job requirements in the CTA
6. Includes a strong call to action with availability for discussion`

  return `${styleAnalysis}${lengthTargetsText}🎯 TARGET JOB DETAILS:
Position: ${jobTitle}
Primary Domain: ${jobAnalysis.primaryDomain}
Required Technologies: ${jobAnalysis.technologies.join(", ")}
Company Context: ${jobDescription}
Client Name: ${clientName || "Hiring Manager"}

${projectsContext}
${skillsContext}
${mainInstructions}

📋 FINAL OUTPUT REQUIREMENTS:
Start with: "${clientName ? `Hi ${clientName},` : "Hi,"}"

OPENING PARAGRAPH STRUCTURE:
${
  hasStrongMatch
    ? `Follow the EXACT opening pattern identified above. Your opening should mirror the style, structure, and flow of the matched cover letter while incorporating your relevant ${jobAnalysis.primaryDomain} experience and projects.`
    : `Start with: "I am a ${jobAnalysis.primaryDomain} specialist with X+ years of experience specifically in [relevant technologies]. I have spearheaded a project similar to your requirements that is [relevant R2 project name]..."`
}

MIDDLE PARAGRAPHS:
- Detailed project description with technical specifics
- Clear alignment with job requirements
- Measurable outcomes and business impact

CTA PARAGRAPH STRUCTURE (MANDATORY):
1. "To better understand your requirements and align our goals, I would appreciate your insights on the following questions:"

2. **RESEARCH-DEMONSTRATING QUESTION GENERATION**:
   
   **OBJECTIVE**: Create questions that PROVE you've thoroughly researched and analyzed their job description
   
   **QUESTION STRATEGY**: Each question should:
   - Reference SPECIFIC details from their job description to show you read it carefully
   - Ask for deeper insights or clarification on technical/business aspects they mentioned
   - Demonstrate you understand the challenges and complexities of their requirements
   - Show you're thinking strategically about their needs, not just applying generically
   
   **STEP 1: IDENTIFY RESEARCH OPPORTUNITIES**
   From the job description, find:
   - Specific technologies, frameworks, or tools mentioned
   - Business metrics, scale, or performance requirements
   - Team structure, processes, or methodologies referenced
   - Industry-specific challenges or compliance needs
   - Ambiguous areas that could benefit from clarification
   
   **STEP 2: LEARN FROM FETCHED COVER LETTERS**
   ${questionExamples}
   
   **STEP 3: CREATE 3 RESEARCH-DEMONSTRATING QUESTIONS** that:
   - Start with "I noticed you mentioned [specific detail from job]..." or "Given your focus on [specific requirement]..."
   - Ask for deeper insights: "Could you elaborate on..." "What are your priorities regarding..." "How do you envision..."
   - Show strategic thinking: "What challenges do you anticipate..." "How does this align with..." "What would success look like..."
   - Prove you understand their domain and technical context
   
   **QUESTION FORMULAS THAT SHOW RESEARCH:**
   - "I noticed you mentioned [SPECIFIC TECH/REQUIREMENT] - could you elaborate on [DEEPER ASPECT] and how it aligns with [BUSINESS GOAL]?"
   - "Given your focus on [SPECIFIC METRIC/SCALE], what are the key challenges you anticipate with [RELATED TECHNICAL ASPECT], and how do you envision [SOLUTION APPROACH]?"
   - "I see you're emphasizing [SPECIFIC PROCESS/METHODOLOGY] - what are your priorities regarding [IMPLEMENTATION DETAIL] and what would success look like in the first [TIMEFRAME]?"

   **EXAMPLES OF RESEARCH-DEMONSTRATING QUESTIONS:**
   
   Instead of: "What technologies do you use?"
   ✅ Better: "I noticed you mentioned handling 2M+ daily transactions with microservices - could you elaborate on your current scaling challenges and how you envision the new React frontend optimizing user experience during peak trading hours?"
   
   Instead of: "What are your requirements?"
   ✅ Better: "Given your focus on real-time analytics and machine learning model deployment, what are the key performance benchmarks you're targeting, and how do you anticipate integrating the ML pipeline with your existing AWS infrastructure?"
   
   Instead of: "How big is your team?"
   ✅ Better: "I see you're emphasizing Agile methodology and cross-functional collaboration - what are your priorities regarding code review processes and DevOps integration, and what would success look like in terms of deployment frequency and system reliability?"

3. "I am excited about the opportunity to contribute my skills and expertise to your project."
4. "I look forward to the possibility of discussing how my skills align with your project's needs."
5. "I am available for a discussion at your earliest convenience."

**CRITICAL SUCCESS CRITERIA:**
- Each question must reference something SPECIFIC from their job description
- Questions should make the hiring manager think "This person really studied our requirements"
- Show you understand not just what they want, but WHY they want it
- Demonstrate strategic thinking about their business/technical challenges
- Prove you're not sending a generic application

DO NOT use generic template questions - every question must be tailored to this specific job posting.

${
  lengthTargets
    ? `Match the paragraph count and overall length targets above; do not intentionally exceed or undercut that range unless necessary for clarity.`
    : `Keep length concise and professional.`
}

End with professional closing: "Sincerely," followed by a line break and "[Your Name]"

🚀 MAKE IT PERFECT: This should be a perfectly targeted ${jobAnalysis.primaryDomain} cover letter that demonstrates clear alignment between your experience and the job requirements, with an engaging CTA that shows genuine interest through relevant questions!`
}

// Helper functions for style analysis
function wordCount(text: string): number {
  return (text || "").trim().split(/\s+/).filter(Boolean).length
}

function paragraphCount(text: string): number {
  const blocks = (text || "")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
  return Math.max(1, blocks.length)
}

// Derive average targets from matched R1 letters
function deriveLengthTargets(r1: Array<{ cover_letter?: string | null }>) {
  const letters = (r1 || []).map((r) => (r.cover_letter || "").trim()).filter(Boolean)

  if (letters.length === 0) return null

  const words = letters.map(wordCount)
  const paras = letters.map(paragraphCount)

  const avgWords = Math.round(words.reduce((a, b) => a + b, 0) / words.length)
  const avgParas = Math.round(paras.reduce((a, b) => a + b, 0) / paras.length)

  // Allow a sane range around the average so we don't over-constrain the model
  const low = Math.max(50, Math.round(avgWords * 0.85))
  const high = Math.round(avgWords * 1.15)

  return {
    targetWords: avgWords,
    targetParagraphs: avgParas,
    wordsRange: [low, high] as [number, number],
  }
}

// Extract detailed opening pattern for exact replication
function extractDetailedOpeningPattern(coverLetter: string) {
  const firstParagraph = coverLetter.split("\n\n")[0] || coverLetter.substring(0, 400)
  const sentences = firstParagraph.split(".").filter((s) => s.trim().length > 10)

  return {
    fullOpening: firstParagraph,
    greetingStyle: firstParagraph.startsWith("Hi,")
      ? "Casual Hi,"
      : firstParagraph.startsWith("Dear")
        ? "Formal Dear"
        : "Direct start",
    introPattern: analyzeIntroPattern(firstParagraph),
    experienceStyle: analyzeExperienceStyle(firstParagraph),
    projectReferenceStyle: analyzeProjectReferenceStyle(firstParagraph),
    tone: analyzeOpeningTone(firstParagraph),
    sentenceCount: sentences.length,
    avgSentenceLength: sentences.length ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length : 0,
  }
}

// Extract detailed closing pattern with question analysis
function extractDetailedClosingPattern(coverLetter: string) {
  const paragraphs = coverLetter.split("\n\n")
  const lastParagraphs = paragraphs.slice(-2) // Get last 2 paragraphs for CTA analysis
  const ctaText = lastParagraphs.join("\n\n")

  const questions = extractQuestionsFromText(ctaText)

  return {
    fullCTA: ctaText,
    questionPattern: questions.length > 0 ? "Includes questions" : "No questions",
    questionCount: questions.length,
    questionTopics: analyzeQuestionTopics(questions),
    ctaStyle: analyzeCTAStyle(ctaText),
    enthusiasm: analyzeEnthusiasm(ctaText),
  }
}

// Generate question examples based on similar cover letters
function generateQuestionExamples(r1CoverLetters: any[], jobDescription: string, jobAnalysis: JobAnalysis): string {
  const allQuestions: string[] = []

  r1CoverLetters.forEach((letter) => {
    const questions = extractQuestionsFromText(letter.cover_letter || "")
    allQuestions.push(...questions)
  })

  if (allQuestions.length === 0) {
    return `📝 QUESTION EXAMPLES FROM SIMILAR LETTERS: None found - create relevant questions about the job requirements.`
  }

  return `📝 QUESTION EXAMPLES FROM SIMILAR LETTERS:
${allQuestions
  .slice(0, 6)
  .map((q, i) => `${i + 1}. ${q}`)
  .join("\n")}

Use these as inspiration but create 3 NEW questions specific to this ${jobAnalysis.primaryDomain} role.`
}

// Helper functions for detailed analysis
function analyzeIntroPattern(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes("i am a") || lower.includes("i am an")) return "Direct professional identity"
  if (lower.includes("as a") || lower.includes("as an")) return "Role-based introduction"
  if (lower.includes("with") && lower.includes("years")) return "Experience-first introduction"
  return "General professional introduction"
}

function analyzeExperienceStyle(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes("years of experience") || lower.includes("years of industry experience"))
    return "Specific years mentioned"
  if (lower.includes("experience in") || lower.includes("experience with")) return "Domain-specific experience"
  if (lower.includes("specialist") || lower.includes("expert")) return "Expertise-focused"
  return "General experience mention"
}

function analyzeProjectReferenceStyle(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes("spearheaded") || lower.includes("led")) return "Leadership-focused project mention"
  if (lower.includes("developed") || lower.includes("built")) return "Development-focused project mention"
  if (lower.includes("similar to your requirements")) return "Requirement-aligned project mention"
  if (lower.includes("project") || lower.includes("solution")) return "General project mention"
  return "No specific project reference"
}

function extractQuestionsFromText(text: string): string[] {
  const questions: string[] = []
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10)

  sentences.forEach((sentence) => {
    const trimmed = sentence.trim()
    if (
      trimmed.includes("?") ||
      trimmed.toLowerCase().includes("what") ||
      trimmed.toLowerCase().includes("how") ||
      trimmed.toLowerCase().includes("which") ||
      trimmed.toLowerCase().includes("when") ||
      trimmed.toLowerCase().includes("where") ||
      trimmed.toLowerCase().includes("are there")
    ) {
      questions.push(trimmed + (trimmed.endsWith("?") ? "" : "?"))
    }
  })

  return questions.filter((q) => q.length > 20 && q.length < 200) // Filter reasonable question lengths
}

function analyzeQuestionTopics(questions: string[]): string[] {
  const topics: string[] = []

  questions.forEach((question) => {
    const lower = question.toLowerCase()
    if (lower.includes("scale") || lower.includes("volume") || lower.includes("demand")) topics.push("Scalability")
    if (lower.includes("feature") || lower.includes("functionality") || lower.includes("requirement"))
      topics.push("Features")
    if (lower.includes("design") || lower.includes("interface") || lower.includes("experience"))
      topics.push("Design/UX")
    if (lower.includes("data") || lower.includes("insight") || lower.includes("metric")) topics.push("Data/Analytics")
    if (lower.includes("integration") || lower.includes("system") || lower.includes("platform"))
      topics.push("Integration")
    if (lower.includes("performance") || lower.includes("optimization") || lower.includes("efficiency"))
      topics.push("Performance")
  })

  return [...new Set(topics)] // Remove duplicates
}

function analyzeDetailedStructure(text: string): {
  paragraphs: number
  flow: string
  transitions: string
  professionalism: string
} {
  const paragraphs = text.split("\n\n").filter((p) => p.trim().length > 0).length
  return {
    paragraphs: paragraphs,
    flow: "Logical and coherent",
    transitions: "Smooth and natural",
    professionalism: "High",
  }
}

function analyzeSentenceLength(text: string): string {
  const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0)
  const lengths = sentences.map((s) => s.trim().split(/\s+/).length)
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
  return avgLength > 20 ? "Long" : avgLength > 15 ? "Medium" : "Short"
}

function analyzeVocabulary(text: string): string {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0)
  const uniqueWords = [...new Set(words)]
  return uniqueWords.length > 500 ? "Advanced" : uniqueWords.length > 300 ? "Intermediate" : "Basic"
}

function analyzePersonalPronouns(text: string): string {
  const lower = text.toLowerCase()
  const count =
    (lower.match(/\bi\b/g) || []).length + (lower.match(/\bme\b/g) || []).length + (lower.match(/\bmy\b/g) || []).length
  return count > 5 ? "Frequent" : count > 2 ? "Moderate" : "Minimal"
}

function analyzeTechnicalLevel(text: string): string {
  const technicalKeywords = [
    "react",
    "vue",
    "angular",
    "javascript",
    "typescript",
    "node.js",
    "python",
    "java",
    "php",
    "ruby",
    "go",
    "rust",
    "swift",
    "kotlin",
    "flutter",
    "react native",
    "mongodb",
    "postgresql",
    "mysql",
    "redis",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "git",
    "jenkins",
    "terraform",
    "figma",
    "photoshop",
    "sketch",
    "tensorflow",
    "pytorch",
    "scikit-learn",
    "pandas",
    "numpy",
    "jupyter",
    "tableau",
    "power bi",
    "sql server",
    "oracle",
    "elasticsearch",
    "kafka",
    "spring",
    "django",
    "flask",
    "express",
    "laravel",
    "rails",
    "gin",
    "graphql",
    "rest api",
    "microservices",
    "serverless",
    "lambda",
    "html",
    "css",
    "sass",
    "less",
    "webpack",
    "vite",
    "babel",
    "jest",
    "cypress",
    "selenium",
    "postman",
    "jira",
    "confluence",
  ]
  let count = 0
  technicalKeywords.forEach((keyword) => {
    if (text.toLowerCase().includes(keyword)) count++
  })
  return count > 10 ? "High" : count > 5 ? "Medium" : "Low"
}

function extractDetailedOutcomes(projectDescription: string): {
  metrics: string
  impact: string
  jobRelevance: string
} {
  return {
    metrics: "Improved performance by X%",
    impact: "Increased user engagement",
    jobRelevance: "Directly aligns with job requirements",
  }
}

function generateProjectNarrative(item: any): string {
  return `Successfully delivered project ${item.project_title} with significant impact.`
}

function generateSkillIntegrationTip(item: any, jobDescription: string): string {
  return `Highlight how ${item.skill_name} can address specific challenges in the job description.`
}

function analyzeOpeningTone(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes("excited") || lower.includes("enthusiastic")) return "Enthusiastic"
  if (lower.includes("sincerely") || lower.includes("regards")) return "Formal"
  return "Professional"
}

function analyzeCTAStyle(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes("look forward")) return "Enthusiastic"
  if (lower.includes("available")) return "Professional"
  return "Standard"
}

function analyzeEnthusiasm(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes("excited") || lower.includes("eager")) return "High"
  if (lower.includes("look forward")) return "Medium"
  return "Low"
}
