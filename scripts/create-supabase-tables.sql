-- Enable the pgvector extension to work with embedding vectors
create extension vector;

-- Create R1 table for job examples
create table r1_job_examples (
  id bigserial primary key,
  title text not null,
  job_description text not null,
  cover_letter text not null,
  title_embedding vector(1024),
  job_description_embedding vector(1024),
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create R2 table for past applications
create table r2_past_applications (
  id bigserial primary key,
  title text not null,
  job_description text not null,
  cover_letter text not null,
  title_embedding vector(1024),
  job_description_embedding vector(1024),
  cover_letter_embedding vector(1024),
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create R3 table for skills
create table r3_skills (
  id bigserial primary key,
  skill text not null,
  skill_description text not null,
  skill_embedding vector(1024),
  skill_description_embedding vector(1024),
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index on r1_job_examples using ivfflat (job_description_embedding vector_cosine_ops) with (lists = 100);
create index on r2_past_applications using ivfflat (job_description_embedding vector_cosine_ops) with (lists = 100);
create index on r3_skills using ivfflat (skill_embedding vector_cosine_ops) with (lists = 100);

-- Create function to match R1 documents
create or replace function match_r1_documents (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  title text,
  job_description text,
  cover_letter text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    r1_job_examples.id,
    r1_job_examples.title,
    r1_job_examples.job_description,
    r1_job_examples.cover_letter,
    r1_job_examples.metadata,
    1 - (r1_job_examples.job_description_embedding <=> query_embedding) as similarity
  from r1_job_examples
  where 1 - (r1_job_examples.job_description_embedding <=> query_embedding) > match_threshold
  order by r1_job_examples.job_description_embedding <=> query_embedding
  limit match_count;
$$;

-- Create function to match R2 documents
create or replace function match_r2_documents (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  title text,
  job_description text,
  cover_letter text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    r2_past_applications.id,
    r2_past_applications.title,
    r2_past_applications.job_description,
    r2_past_applications.cover_letter,
    r2_past_applications.metadata,
    1 - (r2_past_applications.job_description_embedding <=> query_embedding) as similarity
  from r2_past_applications
  where 1 - (r2_past_applications.job_description_embedding <=> query_embedding) > match_threshold
  order by r2_past_applications.job_description_embedding <=> query_embedding
  limit match_count;
$$;

-- Create function to match R3 documents
create or replace function match_r3_documents (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  skill text,
  skill_description text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    r3_skills.id,
    r3_skills.skill,
    r3_skills.skill_description,
    r3_skills.metadata,
    1 - (r3_skills.skill_embedding <=> query_embedding) as similarity
  from r3_skills
  where 1 - (r3_skills.skill_embedding <=> query_embedding) > match_threshold
  order by r3_skills.skill_embedding <=> query_embedding
  limit match_count;
$$;
