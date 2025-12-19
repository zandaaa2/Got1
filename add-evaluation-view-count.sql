-- Add view_count column to evaluations table for tracking evaluation views
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create index for efficient queries on view counts
CREATE INDEX IF NOT EXISTS idx_evaluations_view_count ON evaluations(view_count);

-- Add comment for documentation
COMMENT ON COLUMN evaluations.view_count IS 'Total number of times this evaluation has been viewed';

-- Create function to atomically increment evaluation view_count
CREATE OR REPLACE FUNCTION increment_evaluation_view_count(evaluation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE evaluations
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = evaluation_id;
END;
$$ LANGUAGE plpgsql;
