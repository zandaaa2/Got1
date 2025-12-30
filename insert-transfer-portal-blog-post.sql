-- Insert blog post about January Transfer Portal Window and High School Recruiting
-- Run this in Supabase SQL Editor

-- First, update the existing blog post if it was already inserted without scout_id
UPDATE blog_posts
SET scout_id = (
  SELECT id FROM auth.users WHERE email = 'zander@got1.app' LIMIT 1
)
WHERE slug = 'transfer-portal-january-window-high-school-recruiting'
  AND (scout_id IS NULL OR scout_id != (SELECT id FROM auth.users WHERE email = 'zander@got1.app' LIMIT 1));

-- Insert the blog post (will be skipped if it already exists due to ON CONFLICT)
INSERT INTO blog_posts (slug, title, excerpt, content, image, author, author_email, published_at, scout_id) VALUES
('transfer-portal-january-window-high-school-recruiting', 
'How the January Transfer Portal Window Affects High School Recruiting', 
'The college football transfer portal opens January 2-16, creating a critical period that significantly impacts high school recruiting. Learn what this means for your recruiting journey and what you should do in the meantime.', 
'# How the January Transfer Portal Window Affects High School Recruiting

The college football transfer portal opens January 2-16, creating a critical period that significantly impacts high school recruiting. Understanding how this window affects your recruiting journey—and what to do about it—can make all the difference.

## What Happens During the Transfer Portal Window

From January 2-16, college football players can enter the transfer portal, giving them the opportunity to explore new programs. This creates a domino effect across college football:

- **Programs fill roster spots with transfers**: Many colleges prioritize experienced transfers over high school recruits, especially at positions of immediate need
- **Scholarship numbers shift**: Available scholarships may decrease as programs commit to transfers
- **Recruiting priorities change**: Coaches may pause or slow high school recruiting while evaluating transfer options
- **Timeline compression**: Decisions that might have taken months can happen in weeks

## Why This Matters for High School Players

The transfer portal has fundamentally changed how college programs build their rosters. Here''s what high school players need to understand:

### 1. Increased Competition for Spots

With more experienced players available through the portal, high school recruits face stiffer competition. Programs often prefer transfers who:
- Have proven college-level performance
- Can contribute immediately
- Understand the demands of college football
- Have fewer years of eligibility remaining (creating future roster flexibility)

### 2. Shifting Scholarship Availability

During and after the portal window, available scholarships can change rapidly. A program that had 10 spots available in December might have only 5 after the portal closes, as they commit resources to transfers.

### 3. Delayed Decision-Making

Many coaches wait to see what transfers become available before making final decisions on high school recruits. This can mean:
- Offers come later than expected
- Communication may slow down during this period
- Programs may be less responsive while evaluating transfer options

## What High School Players Should Do Now

While you can''t control the transfer portal, you can control how you prepare and position yourself. Here''s your action plan:

### 1. Get Professional Evaluations Immediately

**This is the most important step.** Before the portal window opens, get professional evaluations from verified college scouts. Understanding your current level and areas for improvement gives you:

- **Clarity on where you stand**: Know your strengths and what needs work
- **Actionable feedback**: Specific guidance on how to improve your film and game
- **Realistic expectations**: Understand which division levels are realistic for your skill set
- **Competitive advantage**: Start improving now, before peak recruiting season

Platforms like Got1 connect you with verified college scouts who can provide detailed, honest evaluations of your game. Getting this feedback in December and early January positions you to make improvements before spring recruiting heats up.

### 2. Update Your Highlight Reel

Use this time to create or update your highlight reel with your best plays from the season. Focus on:
- **Quality over quantity**: Include your best 15-20 plays
- **Position-specific skills**: Show what scouts look for at your position
- **Full plays**: Let scouts see your process, not just results
- **Recent footage**: Use your most recent games to show current ability

### 3. Build and Maintain Relationships

Don''t let communication drop during the portal window. Continue:
- **Reaching out to coaches**: Send updated film and stats
- **Attending camps and combines**: Get in-person exposure
- **Following up on previous conversations**: Stay on coaches'' radars
- **Being patient but persistent**: Understand they''re busy, but don''t disappear

### 4. Focus on Academics

Your academic performance never stops mattering. Use this time to:
- **Maintain or improve GPA**: Academic eligibility is non-negotiable
- **Prepare for standardized tests**: Strong test scores open more doors
- **Research academic programs**: Show genuine interest in schools beyond football

### 5. Continue Skill Development

The transfer portal window doesn''t mean you stop improving. Use this period to:
- **Address weaknesses identified in evaluations**: Work on specific areas scouts mentioned
- **Train with purpose**: Focus on position-specific skills
- **Stay in shape**: Maintain or improve your physical condition
- **Study film**: Learn from your games and from college players at your position

### 6. Stay Flexible and Patient

Understand that recruiting timelines have changed. Be prepared for:
- **Later offers**: Many programs wait until after the portal closes
- **Changing scholarship numbers**: Be ready to adjust expectations
- **Increased competition**: More players are competing for fewer spots

## The Strategic Advantage

High school players who take action during this period gain a significant advantage. While many recruits wait passively, you can:

- **Get ahead of the competition**: Start improving now
- **Build stronger relationships**: Maintain communication when others don''t
- **Demonstrate commitment**: Show coaches you''re serious about your development
- **Position yourself better**: Use professional feedback to improve your game and film

## The Bottom Line

The transfer portal window is a reality of modern college football recruiting. You can''t control it, but you can control how you respond. The players who succeed are those who:

1. **Get professional evaluations early** to understand their level and areas for improvement
2. **Take action on feedback** to improve their game and film
3. **Maintain relationships** with coaches and programs
4. **Stay patient but persistent** throughout the process
5. **Continue developing** their skills and academics

The transfer portal creates challenges, but it also creates opportunities. Programs that miss on transfers often turn back to high school recruiting with renewed focus. Being prepared, having strong film, and maintaining relationships positions you to capitalize when those opportunities arise.

## Take Action Now

Don''t wait for the portal window to close. Start improving your recruiting position today by getting professional evaluations from verified college scouts. Understanding where you stand and what you need to improve gives you a roadmap for success, regardless of what happens in the transfer portal.

Ready to get professional feedback on your game? Submit your film to verified college scouts on Got1 and receive detailed evaluations that can help you navigate the recruiting process successfully.', 
'/landingpage/herohorizontal.jpg', 
'Zander Huff', 
'zander@got1.app', 
NOW(),
(SELECT id FROM auth.users WHERE email = 'zander@got1.app' LIMIT 1))
ON CONFLICT (slug) DO UPDATE SET
  scout_id = (SELECT id FROM auth.users WHERE email = 'zander@got1.app' LIMIT 1);

