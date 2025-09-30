import type { NextRequest } from "next/server"
import { streamOpenAIResponse } from "@/lib/llm-client2"

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, projectRequirements, otherText, listOfActors } = await request.json()

    if (!jobDescription || !projectRequirements) {
      return new Response(JSON.stringify({ error: "Job description and project requirements are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const userInputs = {
      jobDescription,
      projectRequirements,
      otherText: otherText || "",
      listOfActors: listOfActors || "",
    }

    // Helper function to get non-streaming text from OpenAI for section generation
    async function getStreamingText(prompt: string): Promise<string> {
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
                "You are an expert in creating professional Project Requirement Documents (PRDs). You MUST follow the provided examples EXACTLY - copy the exact headings(Only main headings, sub headings should be written as per the requirements of the project), structure, and formatting. Match the example structure precisely.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          stream: false,
          max_tokens: 10000,
          temperature: 0.8,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0].message.content
    }

    const prompts = [
      // 1st API Call - Overview Section
      `Generate an Overview section of the PRD by following and matching the writing style and presentation of the attached example EXACTLY. Copy the exact headings (Only main headings, sub headings should be written as per the requirements of the project) and structure from the example..

User Inputs:
- Job Description: ${userInputs.jobDescription}
- Project Requirements: ${userInputs.projectRequirements}
- Other Text: ${userInputs.otherText}
- List of Actors: ${userInputs.listOfActors}

Example for Overview Section:
     (Project Name)

1. Overview
1.1. Product Description
SemantiqHub is a cloud-based platform that turns raw metadata from relational databases into
clear, structured knowledge. In the MVP phase, it focuses on two internal domains i.e. Medical
and Airlines and shows how data from PostgreSQL tables can be profiled, automatically tagged
using AI, mapped to known ontology terms (with help from AI and manual review), and
converted into RDF triples. This structured data can then be queried using SPARQL to get smart
insights. A key feature is the chat interface, where users can ask questions in simple English,
and the system uses ontologies and reasoning to give clear, explainable answers. The MVP
uses SNOMED CT for medical data and IATA/OpenTravel ontologies for airline data to help
teams better understand and use their data for faster, smarter decisions.
1.2. Goals and Objectives
● Transform raw relational database metadata into structured semantic knowledge.
● Simplify data understanding and access through natural language interaction.
● Provide clear, explainable and insight-driven responses.
● Support internal teams in the medical and airline domains with smarter
decision-making.
● Develop an intelligent tagging system that maps database metadata to domain
ontologies.
● Generate structured knowledge using RDF.
● Integrate well-known ontologies like SNOMED CT (medical) and IATA/OpenTravel
(airlines).
● Build a knowledge graph to represent linked data and relationships.
● Enable a chat-based interface where users can ask questions in simple English.
● Translate natural language queries into SPARQL for semantic search.

Task: Generate an Overview section that EXACTLY matches the example's headings(Only main headings, sub headings should be written as per the requirements of the project), structure, and formatting style while incorporating the user inputs. don't mention Product Requirement Document's heading in the output.`,

      // 2nd API Call - Main Actors Section
      `Generate a Main Actors section of the PRD by taking actors from the provided list and writing their descriptions. Follow the theme, writing style, and presentation of the attached example EXACTLY. Copy the exact headings and structure.

User Inputs:
- Job Description: ${userInputs.jobDescription}
- Project Requirements: ${userInputs.projectRequirements}
- Other Text: ${userInputs.otherText}
- List of Actors: ${userInputs.listOfActors}

Example for Main Actors Section: 
2. Main Actors
2.1. Admin
● Role: 
The Admin is responsible for managing the overall system setup, user access,
ontology integration and ensuring smooth operation of the platform. Admins configure

domain settings, oversee data source connections and ensure secure and reliable
performance.
● Responsibilities:

○ Assign and manage user roles and permissions (e.g., analyst, reviewer, domain
expel access to domain-specific data (Medical / Airlines).
○ Enable or rrt).
○ Controestrict access to the "Talk to Data" chat interface.
○ Connect and configure PostgreSQL data sources.
○ Upload, manage and update domain-specific ontologies (e.g., SNOMED CT,
IATA, OpenTravel).
○ Review and approve AI-generated metadata tags and mappings.
○ Monitor system health, logs and performance.
○ Maintain the knowledge graph and RDF store.
○ Support data profiling and pipeline configuration.

● User Stories:

○ As an Admin, I want to add and manage users, so that I can control who has
access to different parts of the system.
○ As an Admin, I want to control access to the chat interface, so only
authorized users can query sensitive data through natural language.
○ As an Admin, I want to connect new PostgreSQL databases, so that the
system can extract metadata and profile new datasets.
○ As an Admin, I want to review and approve AI-generated metadata tags, so
that I can ensure data is accurately labeled before it's used.
○ As an Admin, I want to upload and manage domain ontologies (like
SNOMED CT, OpenTravel and IATA), so the platform can map data correctly for
each domain.
○ As an Admin, I want to configure and run the RDF generation pipeline, so
that relational data can be turned into a semantic knowledge graph.
○ As an Admin, I want to provide feedback on AI mappings, so the system can
learn and improve future suggestions.
○ As an Admin, I want to backup and restore knowledge graphs, so that critical
data is safe and recoverable.
○ As an Admin, I want to assign domain-specific access, so that medical and
airline data are only visible to relevant teams.

Task: Generate a Main Actors section that describes each actor from the list, make r=following the example's exact structure and headings, The number of roles and the number of user stories per actor should not be fixed or based only on the example, They should be generated dynamically allowing as many as can be created. They must be determined dynamically according to the actual user inputs.

`,

      // 3rd API Call - Detailed Use Cases and Features Section
      `Generate a Detailed Use Cases and Features section of the PRD by following the theme, writing style, and presentation of the attached example EXACTLY. Copy the exact headings(Only main headings, sub headings should be written as per the requirements of the project) and structure.

User Inputs:
- Job Description: ${userInputs.jobDescription}
- Project Requirements: ${userInputs.projectRequirements}
- Other Text: ${userInputs.otherText}
- List of Actors: ${userInputs.listOfActors}

Example for Detailed Use Cases and Features section:
3. Detailed Use Cases and Features
3.1. User Authentication and Account Management
3.1.1. Login/Logout
● Feature: Secure Login
○ Description: Users log in using unique credentials.
○ Requirements:
■ Username (or email) and password authentication.
■ Session management with auto-logout after a period of inactivity.

3.2. Use cases for Admin

3.2.1 Use Cases:
● Manage User Accounts
○ Create and manage user accounts (DBAs, Data Analysts).
○ Monitor user activity logs for audits or security.
● System Configuration
○ Configure data sources (e.g., PostgreSQL connections).
○ Set up ingestion rules and metadata extraction settings.
○ Manage scheduled tasks for profiling and tagging.
● Manage Tagging and Ontology
○ Review AI-generated metadata tags.
○ Approve, reject, or edit metadata tags.
○ Manage and update ontology mappings for both Medical and Airline domains.
○ Oversee manual mapping overrides for edge cases.
● Monitoring and Logs
○ View logs for data ingestion, tagging, and mapping processes.
○ Get alerts on system failures or incomplete processes.
○ Track user activities and changes to ontology/tagging pipelines.
● Knowledge Graph Oversight
○ Monitor RDF triple generation from mapped metadata.
○ Validate graph consistency and ontology alignment.
○ Refresh or rebuild parts of the RDF knowledge graph if required.
● Manage ‘Talk to Data’
○ Configure and fine-tune chatbot behavior and response templates.
○ View chat logs and feedback from data analysts.
○ Flag or escalate chatbot errors or misleading insights.
● Generate Report
○ Generate reports of tagging, ontology mapping and usage.
○ Export audit trails of all changes made by users.
○ Share tagging and mapping accuracy metrics with stakeholders.
● Testing and Deployment Support
○ Deploy new versions of tagging/mapping logic.
○ Run test jobs to verify data flows before release.
○ Validate newly added ontologies or domain configurations.

3.2.2 Features:
● Assign and manage user permissions.
● Connect and configure relational data sources (e.g., PostgreSQL).

● Set up and manage data ingestion pipelines.
● View and manage metadata profiling results.
● Review AI-generated metadata tags.
● Approve, reject or edit metadata tags.
● Oversee ontology mapping for medical and airline domains.
● Adjust or correct ontology mappings when needed.
● Monitor RDF triple generation from mapped metadata.
● Validate consistency of the semantic knowledge graph.
● Restart or refresh knowledge graph generation processes.
● Monitor logs for data ingestion, tagging and mapping activities.
● Receive alerts on failures or incomplete processes.
● Configure and manage "Talk to Data" chatbot behavior.
● View and review chatbot conversations and feedback.
● Flag and escalate incorrect chatbot responses.
● Generate system usage reports and audit logs.
● Export change logs and activity trails for review.
● Test new versions of tagging or mapping workflows.
● Deploy updates and manage platform settings.
3.3. Use cases for DBA
3.3.1 Use Cases:
● Manage Data Source
○ Connect a new PostgreSQL database to SemantiqHub.
○ Edit or update existing database connections.
○ Verify connectivity and data ingestion status.
● Data Ingestion
○ Trigger data ingestion from connected databases.
○ Monitor ingestion jobs and review status logs.
○ View ingested metadata such as table names, column types and relationships.
● Metadata Profiling and Review
○ View AI-generated metadata profiling results.
○ Validate profiling summaries (e.g., null counts, value distributions).
○ Re-run profiling on specific datasets if needed.
● Manage Tagging
○ Review tags automatically applied to metadata by AI.
○ Approve, reject, or suggest edits to tags.
○ Manually apply or correct tags if auto-tagging fails
● Manage Ontology Mapping
○ Review AI-suggested ontology terms mapped to database fields.

○ Approve or manually update ontology mappings (SNOMED CT for Medical,
IATA/OpenTravel for Airlines).
○ Flag incorrect or uncertain mappings for Admin intervention.
● Validate RDF Generation
○ View generated RDF triples from mapped data.
○ Validate logical correctness and format of RDF output.
○ Trigger regeneration of RDF triples after ontology/tagging updates.
● Check Knowledge Graph Consistency
○ Check consistency and completeness of the knowledge graph.
○ Report issues in graph structure or data linkage.
○ Suggest schema adjustments if new entities or relationships are required.

3.3.2 Features:
● Connect and configure PostgreSQL databases.
● Trigger and monitor data ingestion processes.
● View and verify metadata profiling results.
● Review and approve AI-generated metadata tags.
● Manually edit or assign metadata tags if needed.
● Oversee ontology term mappings for ingested data.
● Approve or correct AI-suggested ontology mappings.
● Validate RDF triples generated from ontology-mapped data.
● Re-run or refresh RDF generation when updates are made.
● Ensure consistency and completeness of the knowledge graph.
● Monitor logs for ingestion, profiling, tagging, and mapping workflows.
● Flag errors or anomalies in data pipelines.
● Collaborate with Admin for ontology or tagging issues.
● Prepare data layers for chatbot (Talk to Data) to work correctly.
● Ensure semantic quality and structure of data used for insights.
● Provide feedback on tagging and mapping accuracy.
3.4. Use cases for Data Analyst
3.4.1 Use Cases:
● Conversational Data Exploration (Talk to Data)
○ Ask questions in natural language through the chatbot (e.g., “Show me top 5
delayed flights last week”).
○ Receive answers in plain English, backed by semantic reasoning and SPARQL
queries.
○ Request clarifications or rephrase questions when the chatbot response is
incomplete or unclear.
○ Follow up on previous queries to ask deeper or related questions.

○ View source data or logic behind chatbot answers for transparency.
● Refine Iterative Queries
○ Modify questions based on chatbot feedback.
○ Explore alternate ways of asking the same question.
○ Use suggested prompts or sample queries for guidance.
● Extract Insights
○ Extract trends and patterns from medical or airline datasets.
○ Use semantic insights for reporting, decision-making, or analysis.
○ Save or export chatbot responses for external reporting.
● Provide Feedback
○ Provide feedback on chatbot accuracy and relevance.
○ Flag incorrect or misleading chatbot answers for review.
○ Collaborate with DBAs or Admins if insights seem off due to metadata or
mapping issues.

3.4.2 Features:
● Chat with the "Talk to Data" assistant using natural language.
● Ask questions about medical and airline data without needing technical query
knowledge.
● Receive human-readable answers based on semantic understanding.
● Explore trends, summaries, and insights from structured knowledge.
● View the reasoning or source behind each chatbot answer for transparency.
● Rephrase or refine questions to dig deeper into the data.
● Get auto-suggestions or prompt hints to improve query effectiveness.
● Export or copy chatbot responses for reporting or documentation.
● Provide feedback on the quality and accuracy of chatbot responses.
● Flag incorrect or confusing answers for review.
● Use the chatbot to generate quick insights.
● Access only authorized data based on pre-defined domain scope (Medical or Airlines).

Task: Generate a comprehensive Detailed Use Cases and Features section following the example's exact format and headings and make sure to write detailed Use Cases and Features for all provided List of Actors:`,

     
// 4th API Call - Open Questions and Assumptions Section
      `Generate an Open Questions and Assumptions section of the PRD by following the writing style and presentation of the attached example EXACTLY. Copy the exact headings and structure.

User Inputs:
- Job Description: ${userInputs.jobDescription}
- Project Requirements: ${userInputs.projectRequirements}
- Other Text: ${userInputs.otherText}
- List of Actors: ${userInputs.listOfActors}

Example for Open Questions and Assumptions Section:
4. Open Questions and Assumptions
1. What is the expected size and structure of the initial datasets (Medical & Airlines)?
2. Should the MVP support only PostgreSQL, or will it eventually include other RDBMS
systems?
3. Who validates the correctness of AI-based tagging—DBA, Admin, or both?
4. Are there fallback options when AI tagging fails or produces low-confidence results?
5. Will RDF output be stored persistently, or regenerated on demand?
6. Are there plans to extend the ontology support beyond SNOMED CT and
OpenTravel/IATA?

Task: Generate an Open Questions and Assumptions section that identifies key uncertainties and assumptions, following the example's exact structure.`,

  

// 5th API Call - Summary and Next Steps Section
      `Generate a Summary and Next Steps section of the PRD by following the writing style and presentation of the attached example EXACTLY. Copy the exact headings(Only main headings, sub headings should be written as per the requirements of the project) and structure.

User Inputs:
- Job Description: ${userInputs.jobDescription}
- Project Requirements: ${userInputs.projectRequirements}
- Other Text: ${userInputs.otherText}
- List of Actors: ${userInputs.listOfActors}

Example for Summary and Next Steps Section:
5. Summary and Next Steps
5.1. Summary
SemantiqHub is an AI platform aimed at transforming raw metadata from relational databases
into structured semantic knowledge. It will focus on two internal-use domains, Medical and
Airlines, and support the entire lifecycle from data profiling to intelligent semantic querying. The
platform features a "Talk to Data" interface, empowering data analysts to consume insights and
validate metadata pipelines.

5.2. Next Steps
Review and Feedback:
○ Stakeholders will review the MVP requirements and user roles (Admin, DBA,
Data Analyst) to ensure completeness.
○ Clarify open questions related to AI tagging confidence levels, chatbot interaction
flows and ontology mapping rules.
○ Discuss whether RDF outputs should be stored or generated dynamically, and
review the integration of LLMs for the chat interface.

Validation:
○ Validate end-to-end flow: ingestion → profiling → tagging → ontology mapping →
RDF generation → semantic querying.
○ Review accuracy of AI-generated tags and ontology matches, particularly in
high-stakes domains like medical data.
○ Ensure the chatbot is able to correctly interpret and respond to domain-specific
queries using ontological reasoning.
○ Validate access control, data lineage, and feedback loop mechanisms for chatbot
and pipeline outputs.

Proposal creation:
○ Based on feedback and validation, a refined project proposal with technical
details and milestones will be shared.

Task: Generate a Summary and Next Steps section that provides clear action items and timeline, following the example's exact headings(Only main headings, sub headings should be written as per the requirements of the project).`,
    ]

    const sectionResults = await Promise.all(prompts.map((prompt) => getStreamingText(prompt)))

    const [overview, mainActors, detailedUseCases, openQuestions, summaryNextSteps] = sectionResults

    // Final PRD Compilation with streaming response
    const finalCompilationPrompt = `Combine all the written sections into a full PRD document. Maintain the EXACT structure and formatting from the original examples. Keep the plain text formatting that matches the example structure.

Sections to combine:
1. Overview: ${overview}
2. Main Actors: ${mainActors}
3. Detailed Use Cases and Features: ${detailedUseCases}
4. Open Questions and Assumptions: ${openQuestions}
5. Summary and Next Steps: ${summaryNextSteps}

Task: Create a cohesive, well-formatted PRD document that flows naturally between sections with the same headings and structure as the examples. Remove any markdown symbols and maintain plain text formatting.
Output PRD Format:
Write the PRD using a structured, hierarchical numbering system for all sections and subsections.
 Use Arabic numerals with dots to represent hierarchy (e.g., 1., 1.1., 1.1.1.). Each heading must 
 be written in title case (capitalize key words). After each heading, leave one line break before 
 the descriptive paragraph or list. Bulleted lists should use ● for items and ○ for sub-points. Avoid 
 using Markdown # symbols or plain ALL CAPS headings — only use the numbering format for headings.
 DO NOT use ** or ## in the output.

`

    return await streamOpenAIResponse(finalCompilationPrompt, { promptType: "prd" })
  } catch (error) {
    console.error("PRD generation error:", error)
    return new Response(JSON.stringify({ error: "Failed to generate PRD" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
