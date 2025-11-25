# Slack Jira KBA Bot

An intelligent Slack bot that automatically generates Knowledge Base Articles (KBAs) from Jira tickets using ChatGPT. The bot analyzes tickets, asks clarifying questions, generates step-by-step guides with OS-specific screenshot mockups, and publishes to Confluence.

## Features

- **Intelligent Analysis**: Uses GPT-4 to analyze Jira tickets and extract key information
- **Interactive Questions**: Asks clarifying questions to ensure comprehensive KBAs
- **AI-Generated Screenshots**: Creates realistic macOS and Windows UI mockups using DALL-E
- **Review Workflow**: Allows teams to review and approve KBAs before publishing
- **Confluence Integration**: Automatically publishes approved KBAs to your Confluence space
- **Thread-based Conversations**: All interactions happen in Slack threads for clean organization

## How It Works

1. Drop a Jira ticket URL in Slack (or mention the bot with a ticket)
2. Bot analyzes the ticket and asks clarifying questions
3. You provide additional context
4. Bot generates KBA content and screenshot mockups
5. Review the preview in Slack
6. Approve to publish to Confluence

## Prerequisites

- Node.js 18+ and npm (for local development)
- Slack workspace with admin access
- Atlassian account with Jira and Confluence access
- OpenAI API key with GPT-4 and DALL-E access

## Quick Start - Deploy to Railway (Recommended)

The easiest way to get started is deploying to Railway:

1. **Get API Credentials** - Follow [SETUP_GUIDE.md](SETUP_GUIDE.md) to get all tokens
2. **Deploy to Railway** - Follow [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)
3. **Configure Environment Variables** in Railway dashboard
4. **Test in Slack!**

Railway handles hosting, auto-deployment, and keeps your bot running 24/7.

## Setup Instructions (Local Development)

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name it "KBA Bot" and select your workspace
4. Navigate to "OAuth & Permissions":
   - Add these Bot Token Scopes:
     - `chat:write`
     - `files:write`
     - `app_mentions:read`
     - `channels:history`
     - `groups:history`
     - `im:history`
     - `mpim:history`
5. Install the app to your workspace
6. Copy the "Bot User OAuth Token" (starts with `xoxb-`)
7. Navigate to "Socket Mode":
   - Enable Socket Mode
   - Generate an App-Level Token with `connections:write` scope
   - Copy the token (starts with `xapp-`)
8. Navigate to "Event Subscriptions":
   - Enable Events
   - Subscribe to bot events:
     - `app_mention`
     - `message.channels`
     - `message.groups`
     - `message.im`
     - `message.mpim`
9. Navigate to "Interactivity & Shortcuts":
   - Turn on Interactivity
   - No need to set a Request URL (Socket Mode handles this)

### 3. Get Atlassian API Tokens

#### Jira API Token
1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a name like "KBA Bot"
4. Copy the token

#### Confluence API Token
1. Same process as Jira (can use the same token)
2. Or create a separate token for Confluence

#### Find Confluence Parent Page ID
1. Go to your Confluence space: `https://theguarantors.atlassian.net/wiki/spaces/ORCAS/pages`
2. Navigate to the parent page where you want KBAs created
3. Click "..." → "Page Information"
4. The Page ID is in the URL: `.../pages/viewinfo.action?pageId=YOUR_PAGE_ID`

### 4. Get OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Make sure your account has access to:
   - GPT-4 Turbo
   - DALL-E 3

### 5. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

```env
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_SIGNING_SECRET=your-signing-secret

# Jira Configuration
JIRA_HOST=https://theguarantors.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token

# Confluence Configuration
CONFLUENCE_HOST=https://theguarantors.atlassian.net
CONFLUENCE_EMAIL=your-email@company.com
CONFLUENCE_API_TOKEN=your-confluence-api-token
CONFLUENCE_SPACE_KEY=ORCAS
CONFLUENCE_PARENT_PAGE_ID=your-parent-page-id

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_IMAGE_MODEL=dall-e-3
```

### 6. Build and Run

Development mode (with auto-reload):
```bash
npm run dev
```

Production build and run:
```bash
npm run build
npm start
```

## Usage

### Starting a KBA Generation

**Option 1: Paste Jira URL in any channel**
```
https://theguarantors.atlassian.net/browse/PROJ-123
```

**Option 2: Mention the bot**
```
@KBA Bot https://theguarantors.atlassian.net/browse/PROJ-123
```

**Option 3: Just the ticket key**
```
PROJ-123
```

### Example Workflow

1. **User**: Posts `https://theguarantors.atlassian.net/browse/TECH-456`

2. **Bot**:
   ```
   Found ticket: TECH-456 - VPN connection issues on macOS
   Status: Resolved
   Priority: High

   I need some additional information:
   1. What were the exact error messages users encountered?
   2. Did this affect all macOS versions or specific ones?
   3. What steps resolved the issue?
   ```

3. **User**: Answers the questions

4. **Bot**:
   ```
   Generating KBA content...
   Generating 3 screenshot mockups...

   [Shows preview of KBA with title, steps, and images]

   [Approve & Publish] [Request Changes] [Cancel]
   ```

5. **User**: Clicks "Approve & Publish"

6. **Bot**:
   ```
   KBA successfully published!
   View it here: https://theguarantors.atlassian.net/wiki/spaces/ORCAS/pages/12345
   ```

## Project Structure

```
.
├── src/
│   ├── index.ts                    # Main entry point
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   ├── services/
│   │   ├── jira.service.ts         # Jira API integration
│   │   ├── openai.service.ts       # OpenAI/ChatGPT integration
│   │   └── confluence.service.ts   # Confluence API integration
│   └── workflows/
│       └── kba-generator.ts        # Main workflow orchestration
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Configuration Options

### OpenAI Models

You can change the models in `.env`:

```env
OPENAI_MODEL=gpt-4-turbo-preview  # Or gpt-4, gpt-4-turbo, etc.
OPENAI_IMAGE_MODEL=dall-e-3       # Or dall-e-2 (cheaper but lower quality)
```

### Confluence Settings

- `CONFLUENCE_SPACE_KEY`: The space where KBAs will be created (e.g., "ORCAS")
- `CONFLUENCE_PARENT_PAGE_ID`: Optional parent page for organizing KBAs

## Troubleshooting

### Bot doesn't respond to messages

1. Check that the bot is invited to the channel
2. Verify Socket Mode is enabled
3. Check bot has required permissions
4. Look at logs for error messages

### "Failed to fetch Jira ticket"

1. Verify JIRA_API_TOKEN is correct
2. Check JIRA_EMAIL matches the token owner
3. Ensure the bot user has permission to view the ticket

### "Failed to create Confluence page"

1. Verify CONFLUENCE_API_TOKEN is correct
2. Check the parent page ID exists and is accessible
3. Ensure the bot user has permission to create pages in the space

### Images not generating

1. Check OpenAI API key has DALL-E access
2. Verify you have sufficient OpenAI credits
3. Check rate limits (images generate slowly, 1 per second)

### Rate Limiting

OpenAI has rate limits:
- GPT-4: Check your tier at [platform.openai.com/account/limits](https://platform.openai.com/account/limits)
- DALL-E 3: Usually 5 images/minute for tier 1

The bot includes delays between image generations to avoid rate limits.

## Cost Estimates

Approximate costs per KBA (as of 2024):

- **GPT-4 Turbo**: ~$0.10-0.20 per KBA (for analysis + content generation)
- **DALL-E 3**: ~$0.08 per image (1024x1024, standard quality)
- **Total**: ~$0.30-0.50 per KBA with 2-3 screenshots

Adjust `OPENAI_IMAGE_MODEL` to `dall-e-2` for cheaper images (~$0.02 each).

## Security Notes

- **Never commit `.env` file** to version control
- API tokens have full access to Jira/Confluence - keep them secure
- Consider using a dedicated service account for the bot
- Review generated KBAs before publishing (approval workflow is built-in)

## Future Enhancements

- [ ] Support for Jira custom fields
- [ ] Multi-language KBA generation
- [ ] Automated testing of KBA steps
- [ ] Integration with additional knowledge base platforms
- [ ] Analytics dashboard for KBA usage
- [ ] Slack slash commands for easier interaction

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Slack app logs: `npm run dev`
3. Check OpenAI API status: [status.openai.com](https://status.openai.com)
4. Check Atlassian status: [status.atlassian.com](https://status.atlassian.com)

## License

ISC
