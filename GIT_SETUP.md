# Git Setup Guide for Got1

This guide will walk you through setting up Git and pushing your project to a remote repository.

## Step 1: Check Git Status

Your project already has a `.git` folder, which means Git is initialized. Check the current status:

```bash
cd /Users/zanderhuff/Desktop/scouteval2
git status
```

## Step 2: Create a .gitignore (Already Done)

Your `.gitignore` file is already set up and will exclude:
- `node_modules/` - Dependencies
- `.env.local` and `.env` - Environment variables (IMPORTANT: Never commit these!)
- `.next/` - Next.js build files
- `.DS_Store` - macOS system files

## Step 3: Stage All Files

Add all your files to Git:

```bash
git add .
```

This will stage all files except those in `.gitignore`.

## Step 4: Make Your First Commit

Create your initial commit:

```bash
git commit -m "Initial commit: Got1 platform - Football player evaluation marketplace"
```

## Step 5: Create a Remote Repository

You have two options:

### Option A: GitHub (Recommended)

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right → "New repository"
3. Name it: `got1` (or `got1-platform`)
4. Choose **Private** (recommended for now)
5. **DO NOT** initialize with README, .gitignore, or license (you already have these)
6. Click "Create repository"

### Option B: GitLab or Bitbucket

Similar process on [GitLab.com](https://gitlab.com) or [Bitbucket.org](https://bitbucket.org)

## Step 6: Connect Your Local Repository to Remote

After creating the remote repository, GitHub will show you commands. Use these:

```bash
# Replace YOUR_USERNAME and REPO_NAME with your actual values
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Or if you prefer SSH (requires SSH keys set up):
# git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git
```

## Step 7: Push to Remote

Push your code to GitHub:

```bash
git branch -M main
git push -u origin main
```

If prompted for credentials:
- Username: Your GitHub username
- Password: Use a **Personal Access Token** (not your GitHub password)
  - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  - Generate new token with `repo` scope
  - Use that token as your password

## Step 8: Verify

Go to your GitHub repository page and verify all files are there.

## Common Commands Going Forward

```bash
# Check status
git status

# Stage changes
git add .

# Commit changes
git commit -m "Description of what you changed"

# Push to remote
git push

# Pull latest changes (if working on multiple machines)
git pull

# Create a new branch
git checkout -b feature-name

# Switch branches
git checkout main
```

## Important Notes

⚠️ **NEVER commit `.env.local` or `.env` files** - These contain sensitive API keys and secrets!

✅ The `.gitignore` file already excludes these, but always double-check before committing.

## Next Steps

1. Set up GitHub Actions for CI/CD (optional)
2. Add collaborators (if needed)
3. Set up branch protection rules (for production)
4. Configure deployment (Vercel, Netlify, etc.)

## Troubleshooting

**"remote origin already exists"**
```bash
git remote remove origin
git remote add origin YOUR_NEW_URL
```

**"Updates were rejected"**
```bash
git pull origin main --rebase
git push origin main
```

**"Permission denied"**
- Make sure you're using the correct remote URL
- Check that your SSH keys are set up (if using SSH)
- Verify your Personal Access Token has the right permissions

