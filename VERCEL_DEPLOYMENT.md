# VERCEL DEPLOYMENT SETUP

## Step 1: Go to Vercel
Visit: https://vercel.com

## Step 2: Sign In with GitHub
- Click "Sign up"
- Choose "Continue with GitHub"
- Authorize Vercel to access your GitHub account

## Step 3: Import Your Project
- Click "New Project"
- Search for "Kids_Game" repo
- Click "Import"

## Step 4: Configure Build Settings
Vercel should auto-detect these, but verify:

**Framework Preset:** Vite
**Build Command:** npm run build
**Output Directory:** dist
**Root Directory:** / (leave default)

## Step 5: Environment Variables
Leave empty (not needed for this game)

## Step 6: Deploy
Click "Deploy"

**Wait 1-2 minutes...**

## You'll Get a Live URL
Something like: `https://kids-game-abcd1234.vercel.app/`

---

## How It Works After Deployment

**Automatic Updates:**
- Every time you push to GitHub: `git push origin main`
- Vercel automatically rebuilds and deploys
- Your live URL updates instantly
- No manual steps needed

**Share with Your Kid:**
- Send them the Vercel URL
- They can play from any device
- Any computer, tablet, phone
- Works on any internet connection

---

## Need a Custom Domain?

After deployment, you can add a custom domain:
- In Vercel dashboard: Settings → Domains
- Add your domain (costs $10-15/year)
- Optional - the free URL works great too

---

## Commands to Remember

```bash
# When you make changes:
git add -A
git commit -m "Your message"
git push origin main

# Vercel automatically deploys!
# Check status at: https://vercel.com/dashboard
```

---

## That's It!

Your game will be live and playable worldwide.

Every time you build a new scenario:
1. Write the code/data
2. `git push origin main`
3. Wait ~1 minute
4. Vercel deploys automatically
5. Your kid sees the new scenario instantly

