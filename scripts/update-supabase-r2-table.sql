-- Update R2 table structure to remove cover_letter field and update functions
-- This script modifies the existing R2 table to match the new project-focused approach

-- First, let's check if we need to remove the cover_letter column
-- (This is safe to run multiple times)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'r2_past_applications' 
               AND column_name = 'cover_letter') THEN
        ALTER TABLE r2_past_applications DROP COLUMN cover_letter;
        ALTER TABLE r2_past_applications DROP COLUMN cover_letter_embedding;
        RAISE NOTICE 'Removed cover_letter and cover_letter_embedding columns from r2_past_applications';
    END IF;
END $$;

-- Update the match_r2_documents function to work without cover_letter
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

-- Add some helpful comments
COMMENT ON TABLE r2_past_applications IS 'Stores successful past projects and jobs for experience reference in cover letters';
COMMENT ON COLUMN r2_past_applications.title IS 'Project or job title';
COMMENT ON COLUMN r2_past_applications.job_description IS 'Description of the project/job completed successfully';
COMMENT ON COLUMN r2_past_applications.metadata IS 'Additional project metadata like technologies, project type, etc.';
