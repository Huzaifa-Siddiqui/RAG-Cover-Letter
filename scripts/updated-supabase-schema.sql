-- Complete recreation with the new combined embeddings architecture
-- Drop existing tables and functions
DROP TABLE IF EXISTS r1_job_examples CASCADE;
DROP TABLE IF EXISTS r2_past_applications CASCADE; 
DROP TABLE IF EXISTS r3_skills CASCADE;
DROP FUNCTION IF EXISTS match_r1_documents CASCADE;
DROP FUNCTION IF EXISTS match_r2_documents CASCADE;
DROP FUNCTION IF EXISTS match_r3_documents CASCADE;

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- R1: Job Examples with combined title+description embeddings
CREATE TABLE r1_job_examples (
  id bigserial primary key,
  job_title text not null,
  job_description text not null,
  cover_letter text not null,
  combined_embedding vector(1024), -- Combined embedding of title + description
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- R2: Past Projects with combined title+description embeddings
CREATE TABLE r2_past_projects (
  id bigserial primary key,
  project_title text not null,
  project_description text not null,
  combined_embedding vector(1024), -- Combined embedding of title + description
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- R3: Skills with combined skill+description embeddings
CREATE TABLE r3_skills (
  id bigserial primary key,
  skill_name text not null,
  skill_description text not null,
  combined_embedding vector(1024), -- Combined embedding of skill + description
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
CREATE INDEX ON r1_job_examples USING ivfflat (combined_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON r2_past_projects USING ivfflat (combined_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON r3_skills USING ivfflat (combined_embedding vector_cosine_ops) WITH (lists = 100);

-- Function to match R1 documents (returns 4 similar cover letters)
CREATE OR REPLACE FUNCTION match_r1_documents (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  job_title text,
  job_description text,
  cover_letter text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    r1_job_examples.id,
    r1_job_examples.job_title,
    r1_job_examples.job_description,
    r1_job_examples.cover_letter,
    r1_job_examples.metadata,
    1 - (r1_job_examples.combined_embedding <=> query_embedding) as similarity
  FROM r1_job_examples
  WHERE 1 - (r1_job_examples.combined_embedding <=> query_embedding) > match_threshold
  ORDER BY r1_job_examples.combined_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to match R2 projects (returns 3 similar projects)
CREATE OR REPLACE FUNCTION match_r2_projects (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  project_title text,
  project_description text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    r2_past_projects.id,
    r2_past_projects.project_title,
    r2_past_projects.project_description,
    r2_past_projects.metadata,
    1 - (r2_past_projects.combined_embedding <=> query_embedding) as similarity
  FROM r2_past_projects
  WHERE 1 - (r2_past_projects.combined_embedding <=> query_embedding) > match_threshold
  ORDER BY r2_past_projects.combined_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to match R3 skills (returns similar skills)
CREATE OR REPLACE FUNCTION match_r3_skills (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  skill_name text,
  skill_description text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    r3_skills.id,
    r3_skills.skill_name,
    r3_skills.skill_description,
    r3_skills.metadata,
    1 - (r3_skills.combined_embedding <=> query_embedding) as similarity
  FROM r3_skills
  WHERE 1 - (r3_skills.combined_embedding <=> query_embedding) > match_threshold
  ORDER BY r3_skills.combined_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Add helpful comments
COMMENT ON TABLE r1_job_examples IS 'Job examples with combined title+description embeddings for cover letter reference';
COMMENT ON TABLE r2_past_projects IS 'Past projects with combined title+description embeddings for experience reference';
COMMENT ON TABLE r3_skills IS 'Skills with combined name+description embeddings for skill matching';

SELECT 'Database schema updated with combined embeddings architecture!' as status;
