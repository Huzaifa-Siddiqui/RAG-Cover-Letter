export interface JobAnalysis {
  title: string
  company: string
  requiredSkills: string[]
  preferredSkills: string[]
  experienceLevel: string
  jobType: string
  location: string
  salary?: string
  benefits: string[]
  responsibilities: string[]
  qualifications: string[]
  industry: string
  companySize?: string
  workEnvironment: string
  keyRequirements: string[]
  niceToHave: string[]
  techStack: string[]
  domain: string
}

export async function analyzeJobDescription(jobDescription: string): Promise<JobAnalysis> {
  // Simple job analysis implementation
  // In a real implementation, this would use AI/NLP to parse the job description

  const lines = jobDescription.split("\n").filter((line) => line.trim())

  // Extract basic information with simple pattern matching
  const titleMatch = lines.find(
    (line) =>
      line.toLowerCase().includes("title:") ||
      line.toLowerCase().includes("position:") ||
      line.toLowerCase().includes("role:"),
  )

  const companyMatch = lines.find(
    (line) => line.toLowerCase().includes("company:") || line.toLowerCase().includes("organization:"),
  )

  // Extract skills mentioned in the description
  const skillKeywords = [
    "javascript",
    "typescript",
    "react",
    "vue",
    "angular",
    "node.js",
    "python",
    "java",
    "c#",
    "php",
    "ruby",
    "go",
    "rust",
    "swift",
    "kotlin",
    "flutter",
    "html",
    "css",
    "sass",
    "tailwind",
    "bootstrap",
    "sql",
    "mongodb",
    "postgresql",
    "mysql",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "git",
    "agile",
    "scrum",
    "ci/cd",
    "testing",
    "jest",
    "cypress",
    "selenium",
  ]

  const foundSkills = skillKeywords.filter((skill) => jobDescription.toLowerCase().includes(skill.toLowerCase()))

  // Determine experience level
  let experienceLevel = "Mid-level"
  const desc = jobDescription.toLowerCase()
  if (desc.includes("senior") || desc.includes("lead") || desc.includes("principal")) {
    experienceLevel = "Senior"
  } else if (desc.includes("junior") || desc.includes("entry") || desc.includes("graduate")) {
    experienceLevel = "Junior"
  }

  // Determine job type
  let jobType = "Full-time"
  if (desc.includes("part-time")) jobType = "Part-time"
  if (desc.includes("contract") || desc.includes("freelance")) jobType = "Contract"
  if (desc.includes("intern")) jobType = "Internship"

  // Determine domain based on keywords
  let domain = "General"
  if (desc.includes("mobile") || desc.includes("ios") || desc.includes("android")) {
    domain = "Mobile"
  } else if (desc.includes("web") || desc.includes("frontend") || desc.includes("backend")) {
    domain = "Web"
  } else if (desc.includes("ai") || desc.includes("machine learning") || desc.includes("data science")) {
    domain = "AI"
  }

  return {
    title: titleMatch ? titleMatch.split(":")[1]?.trim() || "Software Developer" : "Software Developer",
    company: companyMatch ? companyMatch.split(":")[1]?.trim() || "Company" : "Company",
    requiredSkills: foundSkills.slice(0, 5),
    preferredSkills: foundSkills.slice(5, 8),
    experienceLevel,
    jobType,
    location: "Remote", // Default, could be extracted with more sophisticated parsing
    benefits: [],
    responsibilities: [],
    qualifications: foundSkills,
    industry: "Technology",
    workEnvironment: "Collaborative",
    keyRequirements: foundSkills.slice(0, 3),
    niceToHave: foundSkills.slice(3, 6),
    techStack: foundSkills,
    domain,
  }
}
