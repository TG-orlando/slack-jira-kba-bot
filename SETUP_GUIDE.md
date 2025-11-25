# Complete Setup Guide for Slack Jira KBA Bot

This guide will walk you through setting up all the required API tokens and credentials for the KBA bot.

## Repository
Your code is now live at: **https://github.com/TG-orlando/slack-jira-kba-bot**

## Step 1: Clone the Repository

```bash
git clone https://github.com/TG-orlando/slack-jira-kba-bot.git
cd slack-jira-kba-bot
npm install
```

## Step 2: Create Slack App

### 2.1 Create the App
1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Name: `KBA Bot`
4. Workspace: Select your workspace
5. Click **"Create App"**

### 2.2 Configure OAuth & Permissions
1. In the left sidebar, click **"OAuth & Permissions"**
2. Scroll to **"Bot Token Scopes"** and add:
   - `chat:write` - Send messages
   - `files:write` - Upload screenshot previews
   - `app_mentions:read` - Respond when mentioned
   - `channels:history` - Read channel messages
   - `groups:history` - Read private channel messages
   - `im:history` - Read direct messages
   - `mpim:history` - Read group messages

3. Scroll up and click **"Install to Workspace"**
4. Click **"Allow"**
5. **Copy the "Bot User OAuth Token"** - starts with `xoxb-`
   - Save this as `SLACK_BOT_TOKEN`

### 2.3 Enable Socket Mode
1. In the left sidebar, click **"Socket Mode"**
2. Toggle **"Enable Socket Mode"** to ON
3. You'll be prompted to create an app-level token:
   - Token Name: `socket-token`
   - Add scope: `connections:write`
   - Click **"Generate"**
4. **Copy the token** - starts with `xapp-`
   - Save this as `SLACK_APP_TOKEN`

### 2.4 Configure Event Subscriptions
1. In the left sidebar, click **"Event Subscriptions"**
2. Toggle **"Enable Events"** to ON
3. Under **"Subscribe to bot events"**, add:
   - `app_mention` - When someone mentions the bot
   - `message.channels` - Channel messages
   - `message.groups` - Private channel messages
   - `message.im` - Direct messages
   - `message.mpim` - Group messages
4. Click **"Save Changes"**

### 2.5 Enable Interactivity
1. In the left sidebar, click **"Interactivity & Shortcuts"**
2. Toggle **"Interactivity"** to ON
3. You don't need to set a Request URL (Socket Mode handles this)
4. Click **"Save Changes"**

### 2.6 Get Signing Secret
1. In the left sidebar, click **"Basic Information"**
2. Scroll to **"App Credentials"**
3. **Copy the "Signing Secret"**
   - Save this as `SLACK_SIGNING_SECRET`

## Step 3: Get Atlassian Credentials

### 3.1 Create Jira API Token
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **"Create API token"**
3. Label: `KBA Bot - Jira`
4. Click **"Create"**
5. **Copy the token** immediately (you won't see it again)
   - Save this as `JIRA_API_TOKEN`

### 3.2 Create Confluence API Token
You can use the same token as Jira, or create a new one:
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **"Create API token"**
3. Label: `KBA Bot - Confluence`
4. Click **"Create"**
5. **Copy the token**
   - Save this as `CONFLUENCE_API_TOKEN`

### 3.3 Find Your Confluence Parent Page ID
1. Go to https://theguarantors.atlassian.net/wiki/spaces/ORCAS/pages
2. Navigate to the page where you want KBAs to be created under
3. Click the **"..."** menu → **"Page Information"**
4. Look at the URL: `.../pages/viewinfo.action?pageId=YOUR_PAGE_ID`
5. **Copy the page ID** number
   - Save this as `CONFLUENCE_PARENT_PAGE_ID`

### 3.4 Your Atlassian Settings
- **JIRA_HOST**: `https://theguarantors.atlassian.net`
- **CONFLUENCE_HOST**: `https://theguarantors.atlassian.net`
- **CONFLUENCE_SPACE_KEY**: `ORCAS`
- **JIRA_EMAIL**: `orlando.roberts@theguarantors.com`
- **CONFLUENCE_EMAIL**: `orlando.roberts@theguarantors.com`

## Step 4: Get OpenAI API Key

### 4.1 Create API Key
1. Go to https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Name: `KBA Bot`
4. Click **"Create secret key"**
5. **Copy the key** - starts with `sk-`
   - Save this as `OPENAI_API_KEY`

### 4.2 Verify Access
Make sure your OpenAI account has access to:
- **GPT-4 Turbo** (or GPT-4)
- **DALL-E 3**

Check at https://platform.openai.com/account/limits

### 4.3 Add Credits
Make sure you have sufficient credits/billing set up:
- Go to https://platform.openai.com/account/billing
- Set up payment method if needed
- Estimated cost: $0.30-0.50 per KBA

## Step 5: Configure Environment Variables

### 5.1 Create .env File
In your project directory:
```bash
cp .env.example .env
```

### 5.2 Fill in ALL Values
Edit the `.env` file with all the credentials you collected:

```env
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-YOUR-BOT-TOKEN
SLACK_APP_TOKEN=xapp-YOUR-APP-TOKEN
SLACK_SIGNING_SECRET=YOUR-SIGNING-SECRET

# Jira Configuration
JIRA_HOST=https://theguarantors.atlassian.net
JIRA_EMAIL=orlando.roberts@theguarantors.com
JIRA_API_TOKEN=YOUR-JIRA-API-TOKEN

# Confluence Configuration
CONFLUENCE_HOST=https://theguarantors.atlassian.net
CONFLUENCE_EMAIL=orlando.roberts@theguarantors.com
CONFLUENCE_API_TOKEN=YOUR-CONFLUENCE-API-TOKEN
CONFLUENCE_SPACE_KEY=ORCAS
CONFLUENCE_PARENT_PAGE_ID=YOUR-PARENT-PAGE-ID

# OpenAI Configuration
OPENAI_API_KEY=sk-YOUR-OPENAI-API-KEY
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_IMAGE_MODEL=dall-e-3
```

## Step 6: Build and Run

### 6.1 Build TypeScript
```bash
npm run build
```

### 6.2 Run in Development Mode
```bash
npm run dev
```

You should see:
```
⚡️ KBA Bot is running!
Environment:
  - Jira: https://theguarantors.atlassian.net
  - Confluence: https://theguarantors.atlassian.net
  - Space: ORCAS
  - OpenAI Model: gpt-4-turbo-preview
```

### 6.3 Test the Bot
1. Go to Slack
2. Invite the bot to a channel: `/invite @KBA Bot`
3. Post a Jira ticket URL:
   ```
   https://theguarantors.atlassian.net/browse/TECH-123
   ```
4. The bot should respond and start the KBA generation process!

## Step 7: Production Deployment (Optional)

### Option 1: Run on a Server
1. Deploy to a server (AWS EC2, DigitalOcean, etc.)
2. Use PM2 to keep it running:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name kba-bot
   pm2 save
   pm2 startup
   ```

### Option 2: Run as Docker Container
1. Create a Dockerfile (not included yet)
2. Build and run with Docker
3. Deploy to Kubernetes, ECS, etc.

### Option 3: Serverless (Advanced)
- Requires significant refactoring
- Socket Mode doesn't work well with serverless
- Would need to switch to HTTP events

## Troubleshooting

### Bot doesn't respond
- Check that Socket Mode is enabled
- Verify SLACK_APP_TOKEN is correct
- Make sure bot is invited to the channel
- Check logs for errors

### "Failed to fetch Jira ticket"
- Verify JIRA_API_TOKEN is correct
- Check JIRA_EMAIL matches the token owner
- Ensure you have permission to view the ticket

### "Failed to create Confluence page"
- Verify CONFLUENCE_API_TOKEN is correct
- Check the parent page ID exists
- Ensure you have permission to create pages in ORCAS space

### Images not generating
- Check OpenAI API key has DALL-E access
- Verify sufficient OpenAI credits
- Check rate limits (5 images/minute for tier 1)

### Rate Limiting
The bot includes delays to avoid rate limits:
- 1 second between image generations
- But you may still hit limits on free tier

## Cost Estimates

Per KBA (approximate):
- **GPT-4 Turbo**: $0.10-0.20
- **DALL-E 3**: $0.08 per image
- **Total**: $0.30-0.50 per KBA with 2-3 images

## Security Checklist

- [ ] Never commit `.env` file to git (it's in .gitignore)
- [ ] Keep API tokens secure and private
- [ ] Use a dedicated service account for the bot
- [ ] Review KBAs before publishing (approval workflow is built-in)
- [ ] Rotate API tokens periodically
- [ ] Monitor OpenAI usage and set billing limits

## Next Steps

1. Test with a few Jira tickets
2. Gather feedback from Level 2/3 techs
3. Iterate on the KBA format
4. Consider adding custom prompts for different issue types
5. Set up monitoring and alerting

## Support

- GitHub Issues: https://github.com/TG-orlando/slack-jira-kba-bot/issues
- OpenAI Status: https://status.openai.com
- Atlassian Status: https://status.atlassian.com
- Slack API Docs: https://api.slack.com

---

**Your bot is ready!** Follow the steps above to get it running. Good luck! 🚀
