# Deployment Guide: City of Tiny Promises

This guide walks you through deploying the game to Netlify via GitHub.

## Prerequisites

1. **GitHub Account**: https://github.com/signup
2. **Netlify Account**: https://app.netlify.com/signup
3. **Git Installed**: https://git-scm.com/downloads

## Step 1: Initialize Local Git Repository

Open terminal/command prompt in your project directory:

```bash
git init
git add .
git commit -m "Initial commit: City of Tiny Promises game"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Enter repository name: `city-of-tiny-promises`
3. Add description: "An idle/management clicker game about civic responsibility"
4. Choose **Public** (for free Netlify deployment)
5. Click "Create repository"

## Step 3: Push to GitHub

Follow the instructions GitHub shows. Typically:

```bash
git remote add origin https://github.com/YOUR_USERNAME/city-of-tiny-promises.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 4: Connect to Netlify

### Option A: Manual Connection (Recommended for First Time)

1. Go to https://app.netlify.com
2. Click "New site from Git"
3. Click "GitHub"
4. Authorize Netlify to access your GitHub account
5. Select `city-of-tiny-promises` repository
6. Configure build settings:
   - **Build command**: Leave empty or `echo 'No build required'`
   - **Publish directory**: `.` (dot - root directory)
7. Click "Deploy site"

Netlify will automatically:
- Assign a temporary domain (e.g., `random-name-12345.netlify.app`)
- Deploy your site
- Show deployment status

### Option B: Automatic Deployment with GitHub Actions

If you want GitHub Actions to handle deployments:

1. In Netlify, go to **Site settings** → **Build & deploy** → **Continuous deployment**
2. Note your **Site ID** and **API token**
3. In GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**
4. Add two new secrets:
   - `NETLIFY_SITE_ID`: (from Netlify)
   - `NETLIFY_AUTH_TOKEN`: (from Netlify)
5. The `.github/workflows/deploy.yml` file will automatically deploy on push

## Step 5: Configure Custom Domain (Optional)

1. In Netlify, go to **Site settings** → **Domain management**
2. Click "Add custom domain"
3. Enter your domain name
4. Follow DNS configuration instructions

## Step 6: Verify Deployment

1. Visit your Netlify URL
2. Test both difficulty levels (NYC and San Francisco)
3. Verify sound works (click sound button)
4. Check that game runs smoothly

## Automatic Deployments

Once connected:
- **Every push to `main` branch** → Automatic production deployment
- **Pull requests** → Preview deployments (optional)
- **Rollback** → Click "Publish deploy" on any previous version

## Troubleshooting

### "Site not loading" or "404 errors"

**Solution**: Ensure `netlify.toml` has correct redirect rule:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

This ensures all routes serve `index.html` (single-page app).

### "Audio not working"

**Solution**: Web Audio API requires user interaction. Ensure:
- User clicks sound button or plays game first
- Browser allows audio (check permissions)
- Not in incognito/private mode with strict policies

### "Game looks broken on mobile"

**Solution**: Check responsive design:
- Open DevTools (F12)
- Toggle device toolbar
- Test on various screen sizes
- Verify CSS media queries work

### "Deployment fails"

**Solution**:
1. Check Netlify deploy logs (Site → Deploys → click failed deploy)
2. Ensure no build errors
3. Verify all files are committed to Git
4. Try manual redeploy: Site → Deploys → "Trigger deploy"

## File Checklist

Before deploying, ensure these files exist:

- ✅ `index.html` - Main game file
- ✅ `styles.css` - All styling
- ✅ `game.js` - Game logic and audio
- ✅ `package.json` - Project metadata
- ✅ `netlify.toml` - Netlify configuration
- ✅ `.gitignore` - Git ignore rules
- ✅ `README.md` - Project documentation
- ✅ `.github/workflows/deploy.yml` - GitHub Actions (optional)

## Performance Tips

1. **Minify CSS/JS** (optional for production):
   - Use tools like UglifyJS or cssnano
   - Update `netlify.toml` build command if needed

2. **Cache Busting**:
   - Netlify automatically handles this
   - No action needed

3. **CDN**:
   - Netlify provides free CDN
   - All assets served globally

## Environment Variables

No environment variables needed. The game is fully client-side.

If you add backend features later:
1. In Netlify: Site settings → Build & deploy → Environment
2. Add variables there
3. Access via `process.env.VARIABLE_NAME` (requires build step)

## Monitoring

After deployment:

1. **Netlify Analytics** (optional, paid):
   - Site settings → Analytics
   - Track visitor stats

2. **Error Tracking**:
   - Check browser console for errors
   - Use Netlify Functions for backend logging (advanced)

## Updating Your Game

To update the deployed game:

1. Make changes locally
2. Test locally: `npm start`
3. Commit and push:
   ```bash
   git add .
   git commit -m "Update: [description of changes]"
   git push origin main
   ```
4. Netlify automatically deploys within seconds

## Rollback

If something breaks:

1. Go to Netlify → Deploys
2. Find the last working version
3. Click "Publish deploy"
4. Site reverts instantly

## Next Steps

- Share your game URL with friends
- Add to portfolio
- Consider adding features:
  - Leaderboard (requires backend)
  - Save system (localStorage)
  - More difficulty levels
  - Analytics

## Support

- **Netlify Docs**: https://docs.netlify.com
- **GitHub Docs**: https://docs.github.com
- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

**Congratulations!** Your game is now live on the internet! 🎉
