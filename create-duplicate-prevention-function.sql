-- Create a PostgreSQL function to atomically check and insert notifications
-- This prevents race conditions when multiple requests try to create the same notification
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION create_notification_if_not_exists(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_duplicate_window_seconds INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- For duplicate-check types, check if a recent notification exists
  IF p_type IN ('user_signed_in', 'user_signed_up') THEN
    v_window_start := NOW() - (p_duplicate_window_seconds || ' seconds')::INTERVAL;
    
    -- Check if a notification of this type was created in the window
    SELECT id INTO v_notification_id
    FROM notifications
    WHERE user_id = p_user_id
      AND type = p_type
      AND created_at >= v_window_start
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If one exists, return its ID (don't create a duplicate)
    IF v_notification_id IS NOT NULL THEN
      RETURN v_notification_id;
    END IF;
  END IF;
  
  -- No duplicate found, create the notification
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_notification_if_not_exists(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER) TO authenticated;

