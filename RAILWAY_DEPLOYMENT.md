# Deploy to Railway - Complete Guide

This guide will walk you through deploying your Slack Jira KBA Bot to Railway, a cloud platform that makes deployment simple.

## Why Railway?

- Easy deployment from GitHub
- Free tier available ($5 credit/month)
- Automatic builds on git push
- Built-in environment variable management
- No server management needed
- Keeps your bot running 24/7

## Prerequisites

1. GitHub account (you already have the repo)
2. Railway account (free to create)
3. All your API credentials ready (see SETUP_GUIDE.md)

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Click **"Login"** or **"Start a New Project"**
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

## Step 2: Deploy from GitHub

### 2.1 Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. If this is your first time:
   - Click **"Configure GitHub App"**
   - Grant Railway access to your repositories
   - You can choose "All repositories" or "Only select repositories"
   - Select `TG-orlando/slack-jira-kba-bot`
   - Click **"Install & Authorize"**

### 2.2 Select Repository

1. Find and click **"slack-jira-kba-bot"** from the list
2. Railway will automatically:
   - Detect it's a Node.js project
   - Read the `railway.json` configuration
   - Start building your app

### 2.3 Wait for Initial Build

The first build will take 2-3 minutes:
- Installing dependencies
- Building TypeScript
- But it will FAIL because environment variables aren't set yet

That's expected! We'll fix it in the next step.

## Step 3: Configure Environment Variables

### 3.1 Open Variables Tab

1. In your Railway project, click on your service
2. Click the **"Variables"** tab
3. Click **"+ New Variable"**

### 3.2 Add ALL Environment Variables

Add each of these variables one by one:

#### Slack Variables
```
SLACK_BOT_TOKEN = xoxb-your-bot-token
SLACK_APP_TOKEN = xapp-your-app-token
SLACK_SIGNING_SECRET = your-signing-secret
```

#### Jira Variables
```
JIRA_HOST = https://theguarantors.atlassian.net
JIRA_EMAIL = orlando.roberts@theguarantors.com
JIRA_API_TOKEN = your-jira-api-token
```

#### Confluence Variables
```
CONFLUENCE_HOST = https://theguarantors.atlassian.net
CONFLUENCE_EMAIL = orlando.roberts@theguarantors.com
CONFLUENCE_API_TOKEN = your-confluence-api-token
CONFLUENCE_SPACE_KEY = ORCAS
CONFLUENCE_PARENT_PAGE_ID = your-parent-page-id
```

#### OpenAI Variables
```
OPENAI_API_KEY = sk-your-openai-api-key
OPENAI_MODEL = gpt-4-turbo-preview
OPENAI_IMAGE_MODEL = dall-e-3
```

#### Optional Logging
```
SLACK_LOG_LEVEL = info
```

### 3.3 How to Add Variables

For each variable:
1. Click **"+ New Variable"**
2. Enter the **Variable Name** (e.g., `SLACK_BOT_TOKEN`)
3. Enter the **Variable Value** (e.g., `xoxb-123456...`)
4. Click **"Add"**

**IMPORTANT**: Make sure there are NO extra spaces or quotes around the values!

### 3.4 Alternative: Use Raw Editor

For faster entry:
1. Click **"RAW Editor"** toggle
2. Paste all variables at once:

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_SIGNING_SECRET=your-signing-secret
JIRA_HOST=https://theguarantors.atlassian.net
JIRA_EMAIL=orlando.roberts@theguarantors.com
JIRA_API_TOKEN=your-jira-api-token
CONFLUENCE_HOST=https://theguarantors.atlassian.net
CONFLUENCE_EMAIL=orlando.roberts@theguarantors.com
CONFLUENCE_API_TOKEN=your-confluence-api-token
CONFLUENCE_SPACE_KEY=ORCAS
CONFLUENCE_PARENT_PAGE_ID=your-parent-page-id
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_IMAGE_MODEL=dall-e-3
```

3. Replace all `your-*` values with your actual credentials
4. Railway will auto-save

## Step 4: Redeploy with Variables

After adding all variables:

1. Go to the **"Deployments"** tab
2. Click the **"⋮"** menu on the latest deployment
3. Click **"Redeploy"**

OR just wait - Railway will auto-redeploy after variables are added.

## Step 5: Verify Deployment

### 5.1 Check Logs

1. Click on your service
2. Click the **"Deployments"** tab
3. Click the latest deployment
4. Click **"View Logs"**

You should see:
```
⚡️ KBA Bot is running!
Environment:
  - Jira: https://theguarantors.atlassian.net
  - Confluence: https://theguarantors.atlassian.net
  - Space: ORCAS
  - OpenAI Model: gpt-4-turbo-preview
```

### 5.2 Check Status

- Green dot = Running ✅
- Red dot = Failed ❌
- Yellow dot = Building 🔨

If RED, check the logs for error messages.

## Step 6: Test Your Bot

1. Go to Slack
2. Make sure the bot is in a channel (`/invite @KBA Bot`)
3. Post a Jira ticket URL:
   ```
   https://theguarantors.atlassian.net/browse/TECH-123
   ```
4. The bot should respond!

## Troubleshooting

### Deployment Failed

**Check Build Logs:**
1. Click on the failed deployment
2. Look for errors in the build logs
3. Common issues:
   - Missing dependencies (should auto-install)
   - TypeScript compilation errors

**Solution:** Check the logs and fix any errors in the code.

### Bot Not Responding

**Verify Environment Variables:**
1. Go to **Variables** tab
2. Make sure ALL variables are set
3. Look for typos or extra spaces
4. Redeploy after fixing

**Check Logs:**
1. Look for error messages like:
   - "Missing required environment variable"
   - "Failed to connect to Slack"
   - "Invalid token"

**Common Issues:**

1. **Socket Mode not connected**
   - Verify `SLACK_APP_TOKEN` is correct
   - Check Socket Mode is enabled in Slack app settings

2. **Jira API errors**
   - Verify `JIRA_API_TOKEN` is correct
   - Check `JIRA_EMAIL` matches token owner

3. **OpenAI errors**
   - Verify `OPENAI_API_KEY` is correct
   - Check you have sufficient credits
   - Verify access to GPT-4 and DALL-E

### High Memory Usage

If Railway shows high memory:
1. Click **Settings** tab
2. Scroll to **Memory Limit**
3. Increase to 1GB or 2GB if needed (may require paid plan)

Socket Mode + image generation can use 512MB-1GB RAM.

### App Keeps Restarting

Check logs for crash errors:
1. Look for "Error:" messages
2. Common causes:
   - Invalid API tokens
   - Rate limiting from OpenAI
   - Network issues

Fix the underlying issue and redeploy.

## Step 7: Automatic Deployments

Railway automatically deploys when you push to GitHub!

```bash
# Make changes to your code
git add .
git commit -m "Update bot logic"
git push

# Railway automatically:
# 1. Detects the push
# 2. Builds the new version
# 3. Deploys if build succeeds
# 4. Keeps old version running until new one is ready
```

## Managing Your Railway App

### View Logs
1. Click your service
2. Click **"Deployments"**
3. Click a deployment
4. View real-time logs

### Restart Service
1. Click your service
2. Click **"⋮"** menu
3. Click **"Restart"**

### Roll Back to Previous Version
1. Go to **"Deployments"**
2. Find a successful deployment
3. Click **"⋮"** menu
4. Click **"Redeploy"**

### Delete Service
1. Click **"Settings"** tab
2. Scroll to **"Danger Zone"**
3. Click **"Delete Service"**

## Railway Pricing

### Hobby Plan (Free)
- $5 credit per month
- ~100 hours of runtime
- 512MB RAM
- 1GB disk
- Should be enough for testing

### Developer Plan ($5/month)
- $5 base + usage
- Unlimited hours
- More RAM/disk if needed
- Priority support

### Estimate Costs

For a bot that runs 24/7:
- **Runtime**: 730 hours/month
- **Resources**: ~512MB RAM, minimal CPU
- **Estimated**: $5-10/month

OpenAI costs are separate (~$0.30-0.50 per KBA).

## Best Practices

### 1. Monitor Logs Regularly
Check for errors or rate limiting issues.

### 2. Set Billing Alerts
In Railway dashboard:
- Click your profile
- Go to **"Billing"**
- Set up alerts at $10, $20, etc.

### 3. Monitor OpenAI Usage
- Go to https://platform.openai.com/usage
- Set monthly budget limits
- Get alerts when approaching limits

### 4. Use Restart Policy
Already configured in `railway.json`:
- Auto-restarts on failure
- Max 10 retries
- Prevents downtime from transient errors

### 5. Keep Secrets Secure
- Never commit `.env` files
- Use Railway's Variables feature
- Rotate tokens periodically

## Advanced Configuration

### Custom Domain (Optional)
1. Click **"Settings"** tab
2. Scroll to **"Domains"**
3. Click **"Generate Domain"** for free Railway domain
4. Or add your own custom domain

Note: Not needed for Slack bots (they use Socket Mode)!

### Increase Resources
If you need more power:
1. Click **"Settings"** tab
2. Adjust **"Memory"** or **"CPU"**
3. May increase costs

### Add Multiple Environments
For staging/production:
1. Create separate Railway projects
2. Use different environment variables
3. Deploy from different GitHub branches

## Monitoring & Alerts

### Set Up Notifications
1. Go to project settings
2. Enable **"Deploy Notifications"**
3. Get alerts on:
   - Deployment success/failure
   - App crashes
   - High resource usage

### Connect to Monitoring Tools (Advanced)
- Add logging service (e.g., LogTail)
- Add error tracking (e.g., Sentry)
- Add uptime monitoring (e.g., UptimeRobot)

## Need Help?

### Railway Support
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Help Center: https://help.railway.app

### Bot Issues
- Check SETUP_GUIDE.md
- Review logs in Railway
- GitHub Issues: https://github.com/TG-orlando/slack-jira-kba-bot/issues

---

**Your bot should now be running 24/7 on Railway!** 🚀

Test it in Slack and watch the magic happen!
