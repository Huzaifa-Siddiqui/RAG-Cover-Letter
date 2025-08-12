-- Complete recreation of all tables with the updated structure
-- Run this if you want to completely recreate the tables from scratch

-- Drop existing tables (if they exist)
DROP TABLE IF EXISTS r1_job_examples CASCADE;
DROP TABLE IF EXISTS r2_past_applications CASCADE; 
DROP TABLE IF EXISTS r3_skills CASCADE;

-- Drop existing functions (if they exist)
DROP FUNCTION IF EXISTS match_r1_documents CASCADE;
DROP FUNCTION IF EXISTS match_r2_documents CASCADE;
DROP FUNCTION IF EXISTS match_r3_documents CASCADE;

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create R1 table for job examples (with cover letters)
CREATE TABLE r1_job_examples (
  id bigserial primary key,
  title text not null,
  job_description text not null,
  cover_letter text not null,
  title_embedding vector(1024),
  job_description_embedding vector(1024),
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create R2 table for past projects (NO cover_letter field)
CREATE TABLE r2_past_applications (
  id bigserial primary key,
  title text not null,
  job_description text not null,
  title_embedding vector(1024),
  job_description_embedding vector(1024),
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create R3 table for skills
CREATE TABLE r3_skills (
  id bigserial primary key,
  skill text not null,
  skill_description text not null,
  skill_embedding vector(1024),
  skill_description_embedding vector(1024),
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
CREATE INDEX ON r1_job_examples USING ivfflat (job_description_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON r2_past_applications USING ivfflat (job_description_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON r3_skills USING ivfflat (skill_embedding vector_cosine_ops) WITH (lists = 100);

-- Create function to match R1 documents
CREATE OR REPLACE FUNCTION match_r1_documents (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  title text,
  job_description text,
  cover_letter text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    r1_job_examples.id,
    r1_job_examples.title,
    r1_job_examples.job_description,
    r1_job_examples.cover_letter,
    r1_job_examples.metadata,
    1 - (r1_job_examples.job_description_embedding <=> query_embedding) as similarity
  FROM r1_job_examples
  WHERE 1 - (r1_job_examples.job_description_embedding <=> query_embedding) > match_threshold
  ORDER BY r1_job_examples.job_description_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create function to match R2 documents (updated for projects only)
CREATE OR REPLACE FUNCTION match_r2_documents (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  title text,
  job_description text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    r2_past_applications.id,
    r2_past_applications.title,
    r2_past_applications.job_description,
    r2_past_applications.metadata,
    1 - (r2_past_applications.job_description_embedding <=> query_embedding) as similarity
  FROM r2_past_applications
  WHERE 1 - (r2_past_applications.job_description_embedding <=> query_embedding) > match_threshold
  ORDER BY r2_past_applications.job_description_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create function to match R3 documents
CREATE OR REPLACE FUNCTION match_r3_documents (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  skill text,
  skill_description text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    r3_skills.id,
    r3_skills.skill,
    r3_skills.skill_description,
    r3_skills.metadata,
    1 - (r3_skills.skill_embedding <=> query_embedding) as similarity
  FROM r3_skills
  WHERE 1 - (r3_skills.skill_embedding <=> query_embedding) > match_threshold
  ORDER BY r3_skills.skill_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Add helpful comments
COMMENT ON TABLE r1_job_examples IS 'Job descriptions with their corresponding cover letters for reference';
COMMENT ON TABLE r2_past_applications IS 'Successful past projects and jobs for experience reference';
COMMENT ON TABLE r3_skills IS 'Skills and their descriptions for matching with job requirements';

-- Display success message
SELECT 'All tables recreated successfully with updated structure!' as status;
