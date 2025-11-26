import { App } from '@slack/bolt';
import dotenv from 'dotenv';
import { JiraService } from './services/jira.service';
import { OpenAIService } from './services/openai.service';
import { ConfluenceService } from './services/confluence.service';
import { KBAGeneratorWorkflow } from './workflows/kba-generator';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'SLACK_BOT_TOKEN',
  'SLACK_APP_TOKEN',
  'JIRA_HOST',
  'JIRA_EMAIL',
  'JIRA_API_TOKEN',
  'CONFLUENCE_HOST',
  'CONFLUENCE_EMAIL',
  'CONFLUENCE_API_TOKEN',
  'CONFLUENCE_SPACE_KEY',
  'OPENAI_API_KEY'
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`Error: Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

// Initialize Slack app with Socket Mode
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: process.env.SLACK_LOG_LEVEL as any || 'info'
});

// Initialize services
const jiraService = new JiraService();
const openaiService = new OpenAIService();
const confluenceService = new ConfluenceService();

// Initialize workflow
const kbaWorkflow = new KBAGeneratorWorkflow(
  app,
  jiraService,
  openaiService,
  confluenceService
);

// Listen for messages containing Jira URLs
app.message(async ({ message, say }) => {
  // Only process regular messages with text
  if (message.subtype || !('text' in message) || !message.text) {
    return;
  }

  const text: string = message.text;
  const channel = message.channel;
  const threadTs = message.thread_ts || message.ts;
  const userId = message.user;

  // Check if message contains a Jira URL or ticket key
  const jiraHost = process.env.JIRA_HOST || '';
  const hasJiraUrl = text.includes(jiraHost) && text.includes('/browse/');
  const ticketKey = jiraService.extractTicketKey(text);

  if (hasJiraUrl || ticketKey) {
    // Check if this is a new request or an answer to a question
    const contextKey = `${channel}-${threadTs}`;
    const context = kbaWorkflow.getContext(contextKey);

    if (!context) {
      // New KBA generation request
      await say({
        text: `:wave: Hi <@${userId}>! I'll help you create a KBA from this Jira ticket.`,
        thread_ts: threadTs
      });

      await kbaWorkflow.startWorkflow(channel, threadTs, userId, text);
    } else if (context.stage === 'asking_questions') {
      // This is an answer to a question
      await kbaWorkflow.handleAnswer(channel, threadTs, userId, text);
    }
  } else {
    // Check if this is an answer in an active conversation
    const contextKey = `${channel}-${threadTs}`;
    const context = kbaWorkflow.getContext(contextKey);

    if (context && context.stage === 'asking_questions') {
      await kbaWorkflow.handleAnswer(channel, threadTs, userId, text);
    }
  }
});

// Handle button interactions
app.action('approve_kba', async ({ ack, body, client }) => {
  await ack();

  if (body.type !== 'block_actions') {
    return;
  }

  const action = body.actions[0];
  if (action.type !== 'button' || !action.value) {
    return;
  }

  const contextKey: string = action.value;
  const userId = body.user.id;

  // Update the message to show approval in progress
  await client.chat.update({
    channel: body.channel!.id!,
    ts: body.message!.ts,
    text: ':hourglass: Publishing KBA to Confluence...',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':hourglass: Publishing KBA to Confluence...'
        }
      }
    ]
  });

  await kbaWorkflow.approveAndPublish(contextKey, userId);
});

app.action('request_changes', async ({ ack, body, client }) => {
  await ack();

  if (body.type !== 'block_actions') {
    return;
  }

  const action = body.actions[0];
  if (action.type !== 'button' || !action.value) {
    return;
  }

  const contextKey: string = action.value;

  // Update the message
  await client.chat.update({
    channel: body.channel!.id!,
    ts: body.message!.ts,
    text: 'Waiting for change requests...',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':pencil: Waiting for your feedback...'
        }
      }
    ]
  });

  await kbaWorkflow.requestChanges(contextKey);
});

app.action('cancel_kba', async ({ ack, body, client }) => {
  await ack();

  if (body.type !== 'block_actions') {
    return;
  }

  const action = body.actions[0];
  if (action.type !== 'button' || !action.value) {
    return;
  }

  const contextKey: string = action.value;

  // Update the message
  await client.chat.update({
    channel: body.channel!.id!,
    ts: body.message!.ts,
    text: 'KBA generation cancelled',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':x: KBA generation cancelled'
        }
      }
    ]
  });

  await kbaWorkflow.cancelKBA(contextKey);
});

// Handle app mentions
app.event('app_mention', async ({ event, say }) => {
  if (!event.text) {
    return;
  }

  const text: string = event.text;
  const channel = event.channel;
  const threadTs = event.thread_ts || event.ts;
  const userId = event.user;

  // Check if message contains a Jira URL or ticket key
  const ticketKey = jiraService.extractTicketKey(text);

  if (ticketKey) {
    await say({
      text: `:wave: Hi <@${userId}>! I'll help you create a KBA from this Jira ticket.`,
      thread_ts: threadTs
    });

    await kbaWorkflow.startWorkflow(channel, threadTs, userId, text);
  } else {
    await say({
      text: `:wave: Hi <@${userId}>! To create a KBA, please mention me with a Jira ticket URL or key.\n\nExample: \`@KBA Bot https://theguarantors.atlassian.net/browse/PROJ-123\``,
      thread_ts: threadTs
    });
  }
});

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ KBA Bot is running!');
    console.log('Environment:');
    console.log(`  - Jira: ${process.env.JIRA_HOST}`);
    console.log(`  - Confluence: ${process.env.CONFLUENCE_HOST}`);
    console.log(`  - Space: ${process.env.CONFLUENCE_SPACE_KEY}`);
    console.log(`  - OpenAI Model: ${process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'}`);
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
})();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await app.stop();
  process.exit(0);
});
