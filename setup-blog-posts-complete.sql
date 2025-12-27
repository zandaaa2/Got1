-- Complete blog_posts setup script
-- Run this in Supabase SQL Editor to set up everything at once
-- This combines: create table, add scout_id, add pinned feature

-- Step 1: Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  image TEXT NOT NULL,
  author TEXT NOT NULL,
  author_email TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scout_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pinned BOOLEAN DEFAULT FALSE
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_scout_id ON blog_posts(scout_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_pinned ON blog_posts(pinned) WHERE pinned = TRUE;

-- Step 3: Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
DROP POLICY IF EXISTS "Anyone can view blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Author can manage blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Scouts can create blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Scouts can update their own blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Scouts can delete their own blog posts" ON blog_posts;

-- Anyone can view published blog posts
CREATE POLICY "Anyone can view blog posts" ON blog_posts
  FOR SELECT USING (true);

-- Scouts can insert their own blog posts
CREATE POLICY "Scouts can create blog posts" ON blog_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'scout'
    )
    AND scout_id = auth.uid()
  );

-- Scouts can update their own blog posts
CREATE POLICY "Scouts can update their own blog posts" ON blog_posts
  FOR UPDATE USING (
    scout_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'scout'
    )
  );

-- Scouts can delete their own blog posts
CREATE POLICY "Scouts can delete their own blog posts" ON blog_posts
  FOR DELETE USING (
    scout_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'scout'
    )
  );

-- Step 5: Add comments
COMMENT ON COLUMN blog_posts.pinned IS 'If TRUE, this blog post will appear at the top of the scout''s profile';
COMMENT ON COLUMN blog_posts.scout_id IS 'The user_id of the scout who authored this blog post';

-- Step 6: Insert initial blog posts (only if they don't exist)
INSERT INTO blog_posts (slug, title, excerpt, content, image, author, author_email, published_at, scout_id) 
SELECT 
  'recruiting-trends-2026',
  'Top Recruiting Trends for 2026',
  'Discover the latest trends shaping college football recruiting and how to position yourself for success in the evolving landscape.',
  '# Top Recruiting Trends for 2026

The college football recruiting landscape continues to evolve rapidly, and staying ahead of the curve is essential for high school athletes looking to advance their careers. Here are the key trends shaping recruiting in 2026:

## Early Evaluation and Film Submission

One of the most significant shifts in recent years is the emphasis on early evaluation. College programs are evaluating prospects earlier than ever, with many making initial assessments based on sophomore and even freshman year film. This means athletes need to start building their recruiting profile and submitting quality game film as early as possible.

Platforms like Got1 make it easier than ever to get professional evaluations from verified college scouts, giving you actionable feedback to improve your game and highlight reel before your junior and senior seasons.

## Position-Specific Analytics

Scouts are increasingly relying on data-driven evaluations. Beyond traditional stats, they''re looking at advanced metrics like:
- Route running efficiency for receivers
- Pass rush win rate for defensive linemen
- Coverage success rate for defensive backs
- Decision-making speed for quarterbacks

Understanding these metrics and how to showcase them in your film can set you apart from other prospects.

## Social Media Presence

Your social media presence matters more than ever. Coaches and scouts regularly review prospects'' social media accounts to assess character, work ethic, and off-field behavior. A professional, positive online presence can be a significant advantage.

## Transfer Portal Impact

The transfer portal has changed how programs approach recruiting. Many schools are balancing high school recruiting with portal transfers, which means you need to be more proactive in building relationships with programs and demonstrating your value early.

## NIL Considerations

Name, Image, and Likeness (NIL) opportunities are now a significant factor in recruiting decisions. While NIL shouldn''t be your primary motivation, understanding how it works and what opportunities might be available can help you make informed decisions about your college choice.

## The Bottom Line

The recruiting process is more competitive and complex than ever. Getting professional evaluations from verified scouts early in your high school career can help you understand where you stand, identify areas for improvement, and position yourself for success in the recruiting process.

Start building your recruiting profile today and get the professional feedback you need to advance your football career.',
  '/landingpage/herohorizontal.jpg',
  'Zander Huff',
  'zander@got1.app',
  '2024-12-15T10:00:00Z',
  (SELECT id FROM auth.users WHERE email = 'zander@got1.app' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'recruiting-trends-2026');

INSERT INTO blog_posts (slug, title, excerpt, content, image, author, author_email, published_at, scout_id) 
SELECT 
  'how-scouts-evaluate-qbs',
  'How Scouts Evaluate QBs',
  'Learn what college scouts are looking for when evaluating quarterback prospects and how to showcase your skills effectively.',
  '# How Scouts Evaluate QBs

Quarterback is one of the most scrutinized positions in football recruiting. College scouts evaluate QBs using a comprehensive set of criteria that goes far beyond just arm strength and completion percentage. Here''s what they''re really looking for:

## Arm Talent and Accuracy

**Arm Strength**: Scouts want to see you make all the throws required at the college level. This includes:
- Deep ball accuracy (40+ yards)
- Velocity on intermediate routes
- Ability to fit throws into tight windows

**Accuracy**: Completion percentage matters, but scouts also evaluate:
- Ball placement (leading receivers, throwing to the correct shoulder)
- Consistency across different route types
- Accuracy under pressure

## Decision Making

This is often the most critical factor. Scouts evaluate:
- Pre-snap recognition and adjustments
- Post-snap processing speed
- Risk management (knowing when to take chances vs. protect the ball)
- Ability to read coverages and progress through reads

## Mobility and Athleticism

Modern college football requires QBs who can:
- Extend plays with their legs
- Pick up first downs when needed
- Avoid sacks and negative plays
- Operate effectively in RPO (Run-Pass Option) systems

## Leadership and Intangibles

Scouts look for:
- Command of the huddle
- Poise under pressure
- Work ethic and film study habits
- Ability to elevate teammates

## Film Presentation Tips

When creating your highlight reel:
1. **Show progression**: Include clips from different game situations (red zone, two-minute drill, third downs)
2. **Include full plays**: Don''t just show completions—show your process
3. **Demonstrate variety**: Show different throws (deep, intermediate, short, on the run)
4. **Highlight football IQ**: Include clips showing pre-snap adjustments and post-snap reads

## What Separates Elite QBs

The QBs who get Power 5 offers typically demonstrate:
- Consistent accuracy at all three levels
- Quick processing and decision-making
- Ability to make "wow" throws that others can''t
- Leadership qualities that teammates respond to
- Continuous improvement year over year

## Getting Professional Feedback

The best way to understand how scouts view your game is to get professional evaluations from verified college scouts. They can provide specific, actionable feedback on your strengths and areas for improvement, helping you develop the skills that college programs are looking for.

Ready to get professional QB evaluation? Submit your film to verified college scouts on Got1 and receive detailed feedback on your game.',
  '/landingpage/herohorizontal.jpg',
  'Zander Huff',
  'zander@got1.app',
  '2024-12-10T10:00:00Z',
  (SELECT id FROM auth.users WHERE email = 'zander@got1.app' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'how-scouts-evaluate-qbs');

INSERT INTO blog_posts (slug, title, excerpt, content, image, author, author_email, published_at, scout_id) 
SELECT 
  'success-stories',
  'Success Stories from Got1 Athletes',
  'Read inspiring stories from athletes who used Got1 evaluations to advance their recruiting and achieve their college football dreams.',
  '# Success Stories from Got1 Athletes

Since launching, Got1 has helped hundreds of high school football players get professional evaluations and advance their recruiting journeys. Here are some inspiring success stories from athletes who used our platform:

## Marcus''s Journey to D1

Marcus, a wide receiver from Texas, was struggling to get noticed by college programs despite putting up impressive stats. After submitting his film to multiple scouts on Got1, he received detailed feedback highlighting his route-running technique and how to better showcase his speed.

"The evaluations I got were incredibly detailed," Marcus says. "They pointed out specific things I could improve in my film, like showing more releases against press coverage. After implementing their suggestions and resubmitting updated film, I started getting interest from several D1 programs."

Marcus eventually committed to a Power 5 program and credits the professional feedback he received on Got1 for helping him understand what college scouts were looking for.

## Jake''s Path to College Football

Jake, a quarterback from California, was undersized for his position and wasn''t getting much recruiting attention. Through Got1, he connected with a verified scout who provided specific feedback on how to maximize his strengths and address concerns about his size.

"The scout helped me understand that my quick release and accuracy were my biggest assets," Jake explains. "He gave me specific drills to improve my arm strength and showed me how to better present my film to highlight my decision-making and accuracy."

Jake received multiple offers and is now playing at a Division I program, proving that the right evaluation and feedback can open doors that seemed closed.

## The Power of Professional Feedback

These stories highlight a common theme: professional evaluations from verified scouts provide insights that athletes and their families might not see on their own. The detailed, actionable feedback helps players:

- Understand their strengths and how to showcase them
- Identify specific areas for improvement
- Learn what college scouts are actually looking for
- Build confidence in their recruiting journey

## Start Your Success Story

Every athlete''s journey is unique, but professional evaluations can be a game-changer. Whether you''re looking to get noticed by college programs, improve your game, or understand where you stand in the recruiting process, Got1 connects you with verified college scouts who can provide the feedback you need.

Ready to advance your recruiting journey? Submit your film today and get professional evaluations from verified college scouts.',
  '/landingpage/herohorizontal.jpg',
  'Zander Huff',
  'zander@got1.app',
  '2024-12-05T10:00:00Z',
  (SELECT id FROM auth.users WHERE email = 'zander@got1.app' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'success-stories');

INSERT INTO blog_posts (slug, title, excerpt, content, image, author, author_email, published_at, scout_id) 
SELECT 
  'recruiting-timeline',
  'Understanding the Recruiting Timeline',
  'A comprehensive guide to the college football recruiting timeline and when to take key actions throughout your high school career.',
  '# Understanding the Recruiting Timeline

Navigating the college football recruiting timeline can be overwhelming. Here''s a comprehensive guide to help you understand when to take key actions throughout your high school career:

## Freshman Year: Foundation Building

**Focus**: Academic performance and skill development

- Maintain strong grades (GPA matters for eligibility)
- Start building your highlight reel
- Attend camps and combines to get exposure
- Focus on skill development and learning the game

**Key Action**: Begin creating a recruiting profile and collecting game film.

## Sophomore Year: Early Evaluation

**Focus**: Getting noticed and understanding your level

- Continue strong academic performance
- Build relationships with high school coaches
- Submit early film for professional evaluations
- Attend college camps and showcases
- Start researching programs that might be a good fit

**Key Action**: Get professional evaluations from verified scouts to understand where you stand and what to improve.

## Junior Year: Peak Recruiting Period

**Focus**: Maximizing exposure and building relationships

**Fall (September-November)**:
- Continue submitting updated film
- Reach out to college coaches (after September 1st for most divisions)
- Attend games at colleges you''re interested in
- Maintain strong grades and test scores

**Spring (March-May)**:
- Attend college camps and combines
- Take official visits (if offered)
- Continue building relationships with coaches
- Update your highlight reel with junior year film

**Key Action**: This is when most offers come in. Be proactive in communication and continue improving your game.

## Senior Year: Decision Time

**Focus**: Making your college choice

**Fall (September-December)**:
- Take official visits
- Continue communication with interested programs
- Make your commitment decision
- Sign National Letter of Intent (NLI) during early signing period (December)

**Spring (January-April)**:
- Complete any remaining official visits
- Finalize your decision
- Sign during regular signing period if needed (February-April)

## Important Dates to Remember

- **September 1st (Junior Year)**: Division I coaches can begin contacting prospects
- **Early Signing Period**: Mid-December
- **Regular Signing Period**: February-April
- **Dead Periods**: Times when coaches cannot have in-person contact (varies by division)

## The Role of Professional Evaluations

Getting professional evaluations early (sophomore/junior year) can help you:
- Understand your recruiting level
- Identify areas for improvement before peak recruiting season
- Get feedback on your highlight reel
- Build confidence in your recruiting journey

## Common Mistakes to Avoid

1. **Waiting too long**: Start building your profile and getting evaluations early
2. **Ignoring academics**: Grades and test scores are non-negotiable
3. **Poor communication**: Respond promptly to coaches and be professional
4. **Overlooking fit**: Consider academic, athletic, and personal fit, not just division level

## The Bottom Line

The recruiting timeline moves quickly, and being prepared is essential. Start early, get professional feedback, and stay proactive throughout the process. Professional evaluations from verified scouts can provide the insights you need to navigate this journey successfully.

Ready to get started? Submit your film for professional evaluation today.',
  '/landingpage/herohorizontal.jpg',
  'Zander Huff',
  'zander@got1.app',
  '2025-12-20T10:00:00Z',
  (SELECT id FROM auth.users WHERE email = 'zander@got1.app' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'recruiting-timeline');

INSERT INTO blog_posts (slug, title, excerpt, content, image, author, author_email, published_at, scout_id) 
SELECT 
  'game-film-best-practices',
  'Game Film Best Practices',
  'Expert tips on creating compelling game film that captures scouts'' attention and effectively showcases your abilities on the field.',
  '# Game Film Best Practices

Your highlight reel is often the first impression college scouts have of you. Creating compelling, professional game film can make the difference between getting noticed and getting overlooked. Here are expert tips for creating film that captures scouts'' attention:

## Film Quality Basics

**Camera Angle**: 
- Use the "end zone" or "press box" angle when possible
- Avoid sideline angles that don''t show the full field
- Ensure the camera is stable and not shaky

**Video Quality**:
- Record in HD (1080p minimum)
- Ensure good lighting
- Keep the camera focused on the action

**Editing**:
- Keep clips concise (5-10 seconds per play)
- Show the full play from snap to whistle
- Include context (down and distance, score, time)

## What to Include

**For All Positions**:
- Your best plays (obviously)
- Plays against quality competition
- Plays in different game situations (red zone, two-minute drill, etc.)
- Full-speed plays (not just highlights)

**Position-Specific Tips**:

**Quarterbacks**:
- Show progression through reads
- Include different types of throws (deep, intermediate, short)
- Demonstrate accuracy and arm strength
- Show mobility and pocket presence

**Wide Receivers**:
- Show route running against different coverages
- Include catches in traffic
- Demonstrate blocking ability
- Show releases against press coverage

**Running Backs**:
- Show vision and patience
- Include runs between the tackles
- Demonstrate pass-catching ability
- Show pass protection

**Defensive Players**:
- Show technique and fundamentals
- Include plays against quality competition
- Demonstrate football IQ (recognition, adjustments)
- Show effort and pursuit

## What to Avoid

1. **Music**: Let your play speak for itself
2. **Excessive effects**: Keep it simple and professional
3. **Only showing touchdowns**: Include plays that show technique and fundamentals
4. **Poor quality footage**: If the quality is bad, don''t include it
5. **Too long**: Keep your highlight reel to 3-5 minutes

## Creating Your Reel

**Structure**:
1. Start with your best play
2. Group similar plays together
3. Show variety throughout
4. End with another strong play

**Organization**:
- Label plays with down and distance
- Include your name, position, graduation year, and contact info
- Keep it updated with your latest games

## Getting Professional Feedback

Before finalizing your highlight reel, consider getting professional feedback from verified college scouts. They can provide specific insights on:
- What plays to include or remove
- How to better showcase your strengths
- What scouts are actually looking for
- How your film compares to other prospects

## The Bottom Line

Your game film is your resume. Make it count. Invest time in creating quality footage that accurately represents your abilities and showcases what makes you special. Professional evaluations can help you understand how scouts view your film and what improvements might help you get noticed.

Ready to get professional feedback on your game film? Submit it to verified college scouts on Got1 today.',
  '/landingpage/herohorizontal.jpg',
  'Zander Huff',
  'zander@got1.app',
  '2025-12-15T10:00:00Z',
  (SELECT id FROM auth.users WHERE email = 'zander@got1.app' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'game-film-best-practices');

