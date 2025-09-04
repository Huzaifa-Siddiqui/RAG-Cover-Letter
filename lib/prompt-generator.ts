export function createPerfectRAGPrompt(
  jobTitle: string,
  jobDescription: string,
  context: any,
  category: string,
  clientName?: string,
): string {


  console.log("context", context)
 const projects = context.projects.map((e: any) => 
    `- ${e.project_title}: ${e.project_description} (Similarity: ${e.similarity})`
  ).join('\n');

  // Format skills as a string
  const skills = context.skills.map((e: any) => 
    `- ${e.skill_name}: ${e.skill_description} (Similarity: ${e.similarity})`
  ).join('\n');


  return `You are an expert in crafting professional Upwork-style proposals. I need you to generate a proposal that strictly follows the instructions below, using the provided variables and guidelines. Ensure the output is concise, professional, and tailored to the client’s job post, selecting the most relevant intro based on the project type and using the provided CTA exactly as given.

*** Job Details ***
***The client’s job description and details.
  ---job title: ${jobTitle}
  ---job description: ${jobDescription}
  ---client name: ${clientName || "there"}
  
*** My Relevant Projects ***
***A list of my projects, each with name, URL/demo, purpose/problem, solution/approach, key technologies, and industry.
${projects}

*** My Relevant Skills ***
***My skills: Full Stack Web Developer (10+ years), AWS Certified, AI/ML Engineer (7+ years), Mobile App Developer (5+ years), Head of AI at TensorLabs, 100% client satisfaction rate, 7 startup successes.
${skills}
 

**Intros: Choose one of these intros based on the project type in Job Description: (But do not rephrase the intro keep it as it is, just select the most relevant one)**

Intro1 Full Stack Web Developer (10+ years experience): I’m a Full Stack Web Developer with 10 years of experience, as well as an AWS certified professional. Over the years, I’ve successfully developed and scaled multiple web applications, integrating modern technologies to deliver seamless user experiences. Your job post caught my attention as it aligns with my expertise and the type of solutions I specialize in.
Intro2 Full Stack Web + AI Developer (10+ years experience): I’m a full-stack web developer with over 10 years of professional experience, also specializing in advanced AI solutions. My background combines web development expertise with AI-driven solutions, enabling me to build applications that are not only functional but also intelligent and future-ready. I can help you in achieving your project goals as it closely matches the work I specialize in.
intro3 Agency-Oriented Intro: At TensorLabs, we specialize in building intelligent AI systems, scalable software, and data-driven products that help businesses innovate and grow. Our team specializes in delivering end-to-end development solutions, from robust web applications to cutting-edge AI integrations. With an exceptional 100% client satisfaction rate and multiple startup successes, we're your trusted partner for sustained innovation..
Intro4 Mobile App Developer (5+ years experience): I’m a Mobile App Developer with 5+ years of professional experience building scalable, user-friendly, and high-performing mobile applications. I specialize in building cross-platform applications that run smoothly and meet modern business needs.
Intro5 AI / ML Engineer (7+ years experience): I am an AI Engineer with 7+ years of experience, also I am AWS certified Machine Learning Specialist. I've helped several AI-based startups go live. I am working as the Head of AI at Tensor Labs. With an exceptional 100% client satisfaction rate and 7 startup successes, we're your trusted partner for sustained innovation..



***CTA: Use this exact CTA:
I am eager to discuss how my skills and experience align with your project's goals. In order to give you my ideas or how I can contribute to your project I will need to have a call with you to understand your use-case in more detail. 
Regards, 
[Your Name]


*** Instructions: Follow these exact 7 steps to write the proposal ***

1. Start the cover letter by highlighting one most relevant project that matches the client’s job description and industry. 
Select the project based on the field: if the job is web-related, choose from web projects; if it is AI-related, 
choose from AI projects; and if it involves both web and AI, choose from web + AI projects in the list of projects provided.
In the introduction, mention the project category and use the exact project title as listed, 
then rephrase the project description in your own words. Conclude with a one-sentence explanation of how this project is 
directly relevant to the client’s requirements and industry.
Projects should be relevant to the jobDescription provided.

Example to start(Dont copy opening line exact just take example from it): "One of my/our most relevant projects is HealthAI Platform (https://healthai.tensorlabs.io/), a healthcare-focused AI system that analyzes patient data in real-time, aligning with your need for AI-driven healthcare solutions."

2. Show How You’ll Solve the Client’s Problem (Solution-Oriented, 2–3 Lines):
- Write 2–3 lines describing how you will address the client’s needs based on job details.
- Focus on solutions, not repeating the job post.

3. Brief Technical Approach:
- Summarize the specific technical stack, tools, and methods you will use to deliver the solution.
- Keep it concise but concrete, focusing on relevance to the client’s project.

4. Show 2–3 More Relevant Projects (One-Liner Each):
- Add this Static heading before the other projects: "Other Projects:"
- See all the fetched projects Pick 2–3 additional projects from list of projects similar to *** Job Details ***
- Write one-liner descriptions including project name, link, and relevance.
- Make sure these projects doesnot include the project that mentioned in intro already it shouldn't be same.
- Only include relevant projects in the portfolio section. If fewer than three relevant projects are available, 
  include only those relevant ones. Do not add irrelevant projects just to reach three projects

5. Ask 3 Technical, Non-Generic Questions:
- Add this Static heading before the technical approach: "Technical approach:"
- Add this Static heading before the questions: "To better understand your needs, I/We have few questions:"
- Ask three specific, technical questions about the client’s project, showing careful analysis and understanding of job detials.
- Avoid generic questions (e.g., "What’s your budget?").

6. Brief Intro According to job type from Intros provided above:
  -Don't add any heading before this section
  If client in Job Details Seeks:
  AI Developer roles → Use the provided AI developer intro (exact copy)
  Web + AI Developer roles → Use the provided Web + AI developer intro (exact copy)
  Web Developer roles → Use the provided Web developer intro (exact copy)
  Mobile Developer roles → Use the provided Mobile developer intro (exact copy)
  Agency roles → Use the provided Agency intro (exact copy)
  Do not modify the selected intro content - use it exactly as provided."


7. Strong Call-to-Action (CTA):
- Use the exact CTA provided above.
- Analyze Job Details to determine if the client is seeking an agency, team, or multiple people versus an individual. 
  Then modify the CTA pronouns accordingly: Use 'We' for agencies/teams/multiple people, use 'I' for individual roles. Keep all other CTA content unchanged.

***Output Format:
Write the proposal in this exact order:

[Step 1: Most relevant project with link/demo]
[Step 2: Solution in 2–3 lines]
[Step 3: Technical approach]
[Step 4: 2–3 more relevant projects, one-liner each]
[Step 5: 3 specific technical questions]
[Step 6: Selected intro(Copy Exactly without changing it), tailored to project]
[Step 7: Exact CTA]


***Guidelines:
- Always use this in the greeting: "Hi ${clientName || "there"}.
- Ensure the intro selected from intros provided matches the project type (e.g., AI/ML for AI projects, Mobile App Developer for mobile projects, etc.).
- Use the exact CTA provided without modification.
Keep the tone professional, concise, and client-focused.
- Do not mention these instructions or guidelines in the output.
- If clientName is unavailable, use a generic greeting like "Hi there,".
- Ensure questions in Step 5 are specific to the job post and demonstrate technical expertise.
- Read the job description and determine: Is the client looking to hire ONE person or MULTIPLE people?

  If hiring ONE person → Use 'I'
  If hiring MULTIPLE people or an agency → Use 'We'

  Ignore who the client is (company, agency, individual). Only focus on how many people they want to hire."
  Even Simpler Version:
  "Check: Does the client want to hire 1 person or more than 1 person?

  1 person = Use 'I'
  More than 1 person = Use 'We'"
- Dont mention Step headings like Step 1, Step 2 etc in the output.
  

*******
Now, generate a professional Upwork-style proposal based on the provided variables and instructions detailed above.`
}