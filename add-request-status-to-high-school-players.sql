-- Add request_status field to track roster join requests
ALTER TABLE high_school_players
ADD COLUMN IF NOT EXISTS request_status TEXT DEFAULT NULL CHECK (request_status IN ('pending', 'accepted', 'denied'));

-- Add requested_at timestamp
ALTER TABLE high_school_players
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;

-- Add index for querying pending requests
CREATE INDEX IF NOT EXISTS idx_high_school_players_request_status 
ON high_school_players(user_id, request_status) 
WHERE request_status = 'pending';


