# 🔐 API Keys Setup Guide

## ⚠️ CRITICAL: Your API keys were exposed in GitHub

**IMMEDIATE ACTIONS REQUIRED:**

### Step 1: Revoke ALL Exposed Keys (DO THIS NOW!)

#### 1. Gemini API Key
- Go to: https://aistudio.google.com/app/apikey
- Find and **DELETE** the exposed key
- Click "Delete" and confirm

#### 2. Supabase Keys  
- Go to: https://supabase.com/dashboard/project/wodzplgjinazwrjgsagc/settings/api
- **Option A:** Reset your API keys (if no important data)
- **Option B:** Create a completely new project (recommended if you have sensitive data)

#### 3. YouTube API Key (if you have one)
- Go to: https://console.cloud.google.com/apis/credentials
- Find your YouTube Data API key
- Click the **trash icon** to delete it

---

### Step 2: Clean Git History (Remove Keys from All Commits)

**Option A: Use git-filter-repo (Recommended)**

```powershell
# Install git-filter-repo first
# Download from: https://github.com/newren/git-filter-repo/

# Clone fresh copy (backup first!)
cd ..
git clone file:///path/to/your/repo repo-cleaned
cd repo-cleaned

# Remove all traces of the API keys
git filter-repo --replace-text <(echo "AIzaSyAkAsV1w40UIgMlAqk_hUhcCztj_9iHRgM==>REMOVED_API_KEY")
git filter-repo --replace-text <(echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZHpwbGdqaW5hendyamdzYWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2ODE1NDUsImV4cCI6MjA3NjI1NzU0NX0.8_SMuiHhF90ldYJEt6_xOAOspg5PgUALaSQiT-6av3g==>REMOVED_SUPABASE_KEY")

# Force push the cleaned history
git remote add origin YOUR_GITHUB_REPO_URL
git push origin --force --all
git push origin --force --tags
```

**Option B: BFG Repo-Cleaner (Easier)**

```powershell
# Download BFG from: https://rpo.github.io/bfg-repo-cleaner/

# Create a file with secrets to remove
echo "AIzaSyAkAsV1w40UIgMlAqk_hUhcCztj_9iHRgM" > secrets.txt
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." >> secrets.txt

# Run BFG
java -jar bfg.jar --replace-text secrets.txt your-repo

# Clean up and force push
cd your-repo
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin --force --all
```

**Option C: Simplest - Delete and Re-create Repository**
1. Download your code as ZIP (latest version)
2. Delete the GitHub repository
3. Create a new repository
4. Initialize fresh git history:
   ```powershell
   cd your-project
   Remove-Item -Recurse -Force .git
   git init
   git add .
   git commit -m "Initial commit with secured keys"
   git remote add origin YOUR_NEW_REPO_URL
   git push -u origin main
   ```

---

### Step 3: Generate New API Keys

#### Gemini API Key
1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Select your Google Cloud project (or create new)
4. Copy the new key

#### YouTube Data API v3
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "API Key"
3. Click "Edit API key" and restrict it:
   - **Application restrictions**: HTTP referrers (websites)
   - **API restrictions**: YouTube Data API v3 only
4. Copy the key

#### Supabase
1. Go to: https://supabase.com/dashboard
2. Create a new project (recommended) or use existing
3. Go to Settings → API
4. Copy:
   - Project URL
   - `anon` public key

---

### Step 4: Configure Your .env File

Copy `.env.example` to `.env` and fill in your NEW keys:

```bash
cp .env.example .env
```

Edit `.env` and add your new keys:

```env
# Flask App URL for Study Session integration
VITE_FLASK_URL=http://localhost:5000

# Gemini API Key - Get from: https://aistudio.google.com/app/apikey
VITE_GEMINI_API_KEY=your_NEW_gemini_api_key_here

# YouTube API Key - Get from: https://console.cloud.google.com/apis/credentials
VITE_YOUTUBE_API_KEY=your_NEW_youtube_api_key_here

# Supabase Configuration - Get from: https://supabase.com/dashboard/project/_/settings/api
VITE_SUPABASE_URL=your_NEW_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_NEW_supabase_anon_key_here
```

---

### Step 5: Verify .gitignore

Ensure `.env` is in `.gitignore` (already added):

```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

---

### Step 6: Test Your Setup

```powershell
# Restart dev server
npm.cmd run dev
```

Open http://localhost:5173 and test:
- ✅ Gemini AI features (Quiz generation, AI Tutor, etc.)
- ✅ YouTube integration (if used)
- ✅ Supabase authentication

---

## 🔒 Best Practices Going Forward

1. **NEVER** commit `.env` files
2. **ALWAYS** use environment variables for secrets
3. Use API key restrictions:
   - Gemini: Restrict by HTTP referrer
   - YouTube: Restrict by API and referrer
4. Rotate keys regularly (every 90 days)
5. Use separate keys for dev/prod
6. Enable billing alerts on Google Cloud
7. Monitor API usage dashboards

---

## ⚠️ Why Your Keys Didn't Work After Changing

When you updated your API keys, they still didn't work because:

1. **The OLD keys were still in your code** (hardcoded in 4 files)
2. **Git history still contained them** - GitHub/Google automatically detects this
3. **Google automatically disables exposed keys** when detected in public repos

This is now fixed! Follow the steps above to:
- Revoke old keys
- Clean git history  
- Generate new keys
- Use environment variables (already configured)

---

## Need Help?

If you see errors like:
- `API key not valid` - You haven't revoked and regenerated keys yet
- `Invalid API key` - Check your .env file has correct variable names (VITE_ prefix required)
- `Module not found` - Run `npm.cmd install`

---

**✅ Code changes already completed:**
- ✅ Created `.gitignore` 
- ✅ Created `.env.example`
- ✅ Updated `.env` with placeholders
- ✅ Fixed `ai-tutor.ts` to use environment variables
- ✅ Fixed `gemini.ts` to use environment variables
- ✅ Fixed `concept-map-generator.ts` to use environment variables
- ✅ Fixed `supabase.ts` to use environment variables
- ✅ Updated `vite-env.d.ts` with TypeScript types

**🔴 YOU still need to do:**
1. Revoke all exposed keys
2. Clean git history (or recreate repo)
3. Generate new keys
4. Add new keys to `.env` file
5. Test the application
