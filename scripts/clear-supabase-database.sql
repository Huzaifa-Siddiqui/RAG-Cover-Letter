-- Clear all data from RAG Cover Letter Generator tables
-- This script will delete all records but keep the table structure

-- Clear all data from R1 (Job Examples)
DELETE FROM r1_job_examples;
RESET IDENTITY r1_job_examples RESTART WITH 1;

-- Clear all data from R2 (Past Projects) 
DELETE FROM r2_past_applications;
RESET IDENTITY r2_past_applications RESTART WITH 1;

-- Clear all data from R3 (Skills)
DELETE FROM r3_skills;
RESET IDENTITY r3_skills RESTART WITH 1;

-- Optional: Show confirmation of cleared tables
SELECT 
  'r1_job_examples' as table_name, 
  COUNT(*) as remaining_records 
FROM r1_job_examples
UNION ALL
SELECT 
  'r2_past_applications' as table_name, 
  COUNT(*) as remaining_records 
FROM r2_past_applications  
UNION ALL
SELECT 
  'r3_skills' as table_name, 
  COUNT(*) as remaining_records 
FROM r3_skills;

-- Display success message
SELECT 'Database cleared successfully! All tables are now empty and ready for new data.' as status;
