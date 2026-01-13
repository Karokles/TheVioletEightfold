# Setting Up GitHub Repository

## Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon → **"New repository"**
3. Fill in:
   - **Repository name**: `the-violet-eightfold` (or your preferred name)
   - **Description**: "AI-powered personal governance app - Inner Council"
   - **Visibility**: Private (recommended) or Public
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

## Step 2: Initialize Git Locally

Open terminal in your project directory and run:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Refactored Violet Eightfold app with backend and multi-user support"

# Add your GitHub repo as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Or if using SSH:
# git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Get Your Repository URL

After pushing, your repository URL will be:
```
https://github.com/YOUR_USERNAME/REPO_NAME
```

**Example:**
- If your username is `johndoe` and repo is `the-violet-eightfold`:
- URL: `https://github.com/johndoe/the-violet-eightfold`

## Step 4: Use in Deployment

When deploying to Railway/Vercel/Render:

1. **Connect GitHub account** to the platform
2. **Select your repository** from the list
3. The platform will automatically detect it

**Repository URL format for deployment platforms:**
```
https://github.com/YOUR_USERNAME/REPO_NAME
```

---

## Quick Commands Reference

```bash
# Check if git is initialized
git status

# Initialize (if not done)
git init

# Add files
git add .

# Commit
git commit -m "Your commit message"

# Add remote (first time only)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git push -u origin main

# Check remote URL
git remote -v
```

---

## Important: Before Pushing

Make sure your `.env` files are in `.gitignore` (they should be already):

```bash
# Verify .env is ignored
cat .gitignore | grep .env
```

You should see `.env` listed. This prevents your API keys from being committed!

---

## Troubleshooting

**"Repository not found":**
- Check repository name and username are correct
- Verify you have access (if private repo, you need to be logged in)

**"Permission denied":**
- Use GitHub Personal Access Token instead of password
- Or set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

**"Nothing to commit":**
- Make sure you've made changes
- Check `.gitignore` isn't excluding everything











