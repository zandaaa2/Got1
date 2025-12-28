-- Performance Optimization: Add Database Indexes
-- This script adds indexes to frequently queried columns to improve query performance

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_until ON profiles(suspended_until) WHERE suspended_until IS NOT NULL;

-- Evaluations table indexes
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON evaluations(status);
CREATE INDEX IF NOT EXISTS idx_evaluations_scout_id ON evaluations(scout_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_player_id ON evaluations(player_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_purchased_by ON evaluations(purchased_by) WHERE purchased_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at);
CREATE INDEX IF NOT EXISTS idx_evaluations_completed_at ON evaluations(completed_at) WHERE completed_at IS NOT NULL;

-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at ON posts(deleted_at) WHERE deleted_at IS NULL;

-- Blog posts table indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_scout_id ON blog_posts(scout_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at);

-- Follows table indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_composite ON follows(follower_id, following_id);

-- Parent children table indexes
CREATE INDEX IF NOT EXISTS idx_parent_children_parent_id ON parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_player_id ON parent_children(player_id);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Comments table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_blog_post_id ON comments(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_comments_evaluation_id ON comments(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Likes table indexes (unified likes table)
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_likeable_type ON likes(likeable_type);
CREATE INDEX IF NOT EXISTS idx_likes_composite ON likes(likeable_type, likeable_id);

-- Scout applications table indexes
CREATE INDEX IF NOT EXISTS idx_scout_applications_user_id ON scout_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_scout_applications_status ON scout_applications(status);

-- Analyze tables to update statistics
ANALYZE profiles;
ANALYZE evaluations;
ANALYZE posts;
ANALYZE blog_posts;
ANALYZE follows;
ANALYZE parent_children;
ANALYZE notifications;

