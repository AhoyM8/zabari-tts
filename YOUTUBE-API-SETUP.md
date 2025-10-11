# YouTube API Key Setup Guide

## Why You Need It

The YouTube Data API v3 key is **only required if you want to use YouTube chat in API mode**.

- **Playwright mode**: No API key needed (uses browser scraping)
- **API mode**: API key required for YouTube (Twitch and Kick work without it)

## Getting Your Free API Key

### Step 1: Go to Google Cloud Console

Visit: https://console.cloud.google.com/

### Step 2: Create a New Project (or Select Existing)

1. Click the project dropdown at the top
2. Click "**NEW PROJECT**"
3. Enter project name: `Zabari TTS` (or any name)
4. Click "**CREATE**"
5. Wait for project creation (~10 seconds)
6. Select your new project from the dropdown

### Step 3: Enable YouTube Data API v3

1. In the search bar at the top, type: **YouTube Data API v3**
2. Click on "**YouTube Data API v3**" in the results
3. Click the blue "**ENABLE**" button
4. Wait for API to be enabled

### Step 4: Create API Credentials

1. Click "**CREATE CREDENTIALS**" button (top right)
2. Select:
   - **Which API are you using?** → YouTube Data API v3
   - **What data will you be accessing?** → Public data
3. Click "**NEXT**"
4. Your API key will be generated!

### Step 5: Copy Your API Key

1. You'll see a popup with your API key (looks like: `AIzaSyB...`)
2. Click the **COPY** button
3. Store it securely (you'll need it for the web UI)

### Step 6: (Optional) Restrict Your API Key

For better security:

1. Click on your API key name
2. Under "**API restrictions**":
   - Select "**Restrict key**"
   - Check only "**YouTube Data API v3**"
3. Under "**Application restrictions**":
   - Select "**HTTP referrers**"
   - Add your domains:
     - `http://localhost:3000/*` (local development)
     - `https://yourdomain.vercel.app/*` (production)
4. Click "**SAVE**"

## Using Your API Key

### In the Web Interface

1. Start your frontend: `cd frontend && npm run dev`
2. Open http://localhost:3000
3. Select "**Direct API Connection**" mode
4. Enable **YouTube** platform
5. You'll see a "**YouTube API Key**" input field appear
6. Paste your API key
7. Click "**Start Chat Logger**"

### As Environment Variable (Vercel Deployment)

**Option 1: Vercel Dashboard**
1. Go to your Vercel project settings
2. Navigate to "**Environment Variables**"
3. Add:
   - **Name**: `YOUTUBE_API_KEY`
   - **Value**: Your API key
   - **Environment**: All (Production, Preview, Development)
4. Click "**Save**"
5. Redeploy your app

**Option 2: Vercel CLI**
```bash
vercel env add YOUTUBE_API_KEY
# Paste your API key when prompted
```

**Option 3: .env.local (Local Development)**
Create `frontend/.env.local`:
```
YOUTUBE_API_KEY=AIzaSyB...your_key_here
```

## API Quota & Limits

### Free Tier
- **10,000 units per day** (resets at midnight Pacific Time)
- Each API call costs different units:
  - `videos.list` (getting live chat ID): **1 unit**
  - `liveChatMessages.list` (getting messages): **5 units**

### Estimated Usage

**Polling every 2 seconds:**
- 1,800 requests per hour = **9,000 units/hour**
- Can run for about **1 hour per day** on free tier

**Polling every 5 seconds:**
- 720 requests per hour = **3,600 units/hour**
- Can run for about **2.7 hours per day** on free tier

**Polling every 10 seconds:**
- 360 requests per hour = **1,800 units/hour**
- Can run for about **5.5 hours per day** on free tier

### If You Exceed Quota

You'll see this error:
```
YouTube API error: The request cannot be completed because you have exceeded your quota.
```

**Solutions:**
1. Wait until midnight PT for quota reset
2. Request quota increase (free, but requires explanation)
3. Use Playwright mode instead (no quota limits)

## Request Quota Increase (Free)

If you need more than 10,000 units/day:

1. Go to: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
2. Click "**APPLY FOR HIGHER QUOTA**"
3. Fill out the form:
   - **Reason**: "Chat monitoring for live stream TTS application"
   - **Expected daily usage**: Be realistic (e.g., 50,000 units)
   - **Use case**: Explain your project
4. Submit and wait for Google approval (usually 1-3 days)

## Cost

**YouTube Data API v3 is FREE up to 10,000 units/day.**

After that:
- **$0.10 per 10,000 units** (if you enable billing)
- Most users won't need to pay anything

## Monitoring Usage

Track your API usage:

1. Go to: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
2. View "**Queries per day**" metric
3. See real-time usage and remaining quota

## Troubleshooting

### "API key not valid"
- Make sure you copied the entire key
- Check that YouTube Data API v3 is enabled
- Verify API restrictions aren't blocking your domain

### "The request cannot be completed because you have exceeded your quota"
- Wait for quota reset (midnight Pacific Time)
- Request quota increase
- Use Playwright mode temporarily

### "No active live chat found for this video"
- Make sure the video is actually live streaming
- Verify the video ID is correct
- Some videos don't have chat enabled

### "Access Not Configured"
- YouTube Data API v3 is not enabled
- Go back to Step 3 and enable the API

## Alternative: Use Playwright Mode

If you don't want to deal with API keys and quotas:

1. Select "**Playwright (Browser Automation)**" mode
2. YouTube will work via browser scraping
3. No API key needed
4. No quota limits

**Trade-off**: Playwright mode requires browser binaries and can't deploy to Vercel.

## Security Best Practices

✅ **DO:**
- Restrict API key to YouTube Data API v3 only
- Add HTTP referrer restrictions
- Use environment variables in production
- Rotate keys if compromised

❌ **DON'T:**
- Commit API keys to git
- Share keys publicly
- Use the same key for multiple projects
- Leave keys unrestricted

## Need Help?

- **Google Cloud Console**: https://console.cloud.google.com/
- **YouTube Data API Docs**: https://developers.google.com/youtube/v3
- **Quota Calculator**: https://developers.google.com/youtube/v3/determine_quota_cost
- **Support**: https://support.google.com/googleapi/

## Summary

1. Visit https://console.cloud.google.com/
2. Create new project
3. Enable "YouTube Data API v3"
4. Create credentials → API key
5. Copy and paste into web UI
6. Start using YouTube in API mode!

**Free tier gives you ~1-5 hours of monitoring per day** depending on polling interval.
