// Job Description Analysis Utilities

export interface JobAnalysis {
    domains: string[]
    technologies: string[]
    primaryDomain: string
    isMultiDomain: boolean
  }
  
  export function analyzeJobDescription(jobTitle: string, jobDescription: string): JobAnalysis {
    const combinedText = `${jobTitle} ${jobDescription}`.toLowerCase()
  
    // Extract technologies from job description
    const technologies = extractTechnologiesFromJobDescription(combinedText)
  
    // Determine primary domains
    const domains = []
  
    // AI/ML Domain
    if (
      combinedText.includes("ai") ||
      combinedText.includes("artificial intelligence") ||
      combinedText.includes("machine learning") ||
      combinedText.includes("ml") ||
      combinedText.includes("deep learning") ||
      combinedText.includes("neural network") ||
      combinedText.includes("data science") ||
      combinedText.includes("nlp") ||
      combinedText.includes("computer vision") ||
      combinedText.includes("tensorflow") ||
      combinedText.includes("pytorch") ||
      combinedText.includes("scikit-learn")
    ) {
      domains.push("AI/ML")
    }
  
    // Web Development Domain
    if (
      combinedText.includes("web") ||
      combinedText.includes("frontend") ||
      combinedText.includes("backend") ||
      combinedText.includes("full stack") ||
      combinedText.includes("react") ||
      combinedText.includes("vue") ||
      combinedText.includes("angular") ||
      combinedText.includes("javascript") ||
      combinedText.includes("html") ||
      combinedText.includes("css") ||
      combinedText.includes("node.js") ||
      combinedText.includes("express")
    ) {
      domains.push("Web Development")
    }
  
    // Mobile Development Domain
    if (
      combinedText.includes("mobile") ||
      combinedText.includes("ios") ||
      combinedText.includes("android") ||
      combinedText.includes("flutter") ||
      combinedText.includes("react native") ||
      combinedText.includes("swift") ||
      combinedText.includes("kotlin") ||
      combinedText.includes("app development")
    ) {
      domains.push("Mobile Development")
    }
  
    // Data Science Domain
    if (
      combinedText.includes("data") ||
      combinedText.includes("analytics") ||
      combinedText.includes("statistics") ||
      combinedText.includes("sql") ||
      combinedText.includes("python") ||
      combinedText.includes("r ") ||
      combinedText.includes("tableau") ||
      combinedText.includes("power bi") ||
      combinedText.includes("data warehouse") ||
      combinedText.includes("etl")
    ) {
      domains.push("Data Science")
    }
  
    // DevOps/Cloud Domain
    if (
      combinedText.includes("devops") ||
      combinedText.includes("cloud") ||
      combinedText.includes("aws") ||
      combinedText.includes("azure") ||
      combinedText.includes("gcp") ||
      combinedText.includes("docker") ||
      combinedText.includes("kubernetes") ||
      combinedText.includes("ci/cd") ||
      combinedText.includes("terraform") ||
      combinedText.includes("jenkins")
    ) {
      domains.push("DevOps")
    }
  
    // Design Domain
    if (
      combinedText.includes("design") ||
      combinedText.includes("ui") ||
      combinedText.includes("ux") ||
      combinedText.includes("figma") ||
      combinedText.includes("photoshop") ||
      combinedText.includes("sketch") ||
      combinedText.includes("user experience") ||
      combinedText.includes("user interface")
    ) {
      domains.push("Design")
    }
  
    // Management Domain
    if (
      combinedText.includes("management") ||
      combinedText.includes("project manager") ||
      combinedText.includes("product manager") ||
      combinedText.includes("team lead") ||
      combinedText.includes("scrum") ||
      combinedText.includes("agile") ||
      combinedText.includes("leadership") ||
      combinedText.includes("strategy")
    ) {
      domains.push("Management")
    }
  
    // Default to General if no specific domain found
    if (domains.length === 0) {
      domains.push("General")
    }
  
    return {
      domains,
      technologies,
      primaryDomain: domains[0],
      isMultiDomain: domains.length > 1,
    }
  }
  
  // Extract technologies from job description
  function extractTechnologiesFromJobDescription(text: string): string[] {
    const technologies: string[] = []
  
    const techKeywords = [
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
  
    techKeywords.forEach((tech) => {
      if (text.includes(tech.toLowerCase())) {
        technologies.push(tech)
      }
    })
  
    return technologies.slice(0, 10) // Return top 10 most relevant technologies
  }
  