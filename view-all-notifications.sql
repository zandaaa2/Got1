-- View all notifications for a specific user by email
-- Replace 'zander@got1.app' with your email if different

-- First, find the user_id for the email
SELECT 
  id as user_id,
  email,
  created_at as user_created_at
FROM auth.users
WHERE email = 'zander@got1.app';

-- Then, view all notifications for that user
-- (Replace the UUID below with the user_id from the query above)
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.link,
  n.read,
  n.created_at,
  n.metadata,
  u.email as user_email
FROM notifications n
JOIN auth.users u ON n.user_id = u.id
WHERE u.email = 'zander@got1.app'
ORDER BY n.created_at DESC;

-- Or, if you want to see unread count:
SELECT 
  COUNT(*) FILTER (WHERE read = false) as unread_count,
  COUNT(*) as total_count
FROM notifications n
JOIN auth.users u ON n.user_id = u.id
WHERE u.email = 'zander@got1.app';

