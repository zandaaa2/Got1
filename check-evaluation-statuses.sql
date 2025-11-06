-- Check what status values currently exist in evaluations table
-- Run this first to see what needs to be migrated

SELECT status, COUNT(*) as count
FROM evaluations
GROUP BY status
ORDER BY count DESC;

