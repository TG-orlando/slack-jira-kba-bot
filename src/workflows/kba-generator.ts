import { App } from '@slack/bolt';
import { JiraService } from '../services/jira.service';
import { OpenAIService } from '../services/openai.service';
import { ConfluenceService } from '../services/confluence.service';
import { ConversationContext, KBADraft } from '../types';

export class KBAGeneratorWorkflow {
  private contexts: Map<string, ConversationContext> = new Map();
  private jiraService: JiraService;
  private openaiService: OpenAIService;
  private confluenceService: ConfluenceService;

  constructor(
    private app: App,
    jiraService: JiraService,
    openaiService: OpenAIService,
    confluenceService: ConfluenceService
  ) {
    this.jiraService = jiraService;
    this.openaiService = openaiService;
    this.confluenceService = confluenceService;
  }

  /**
   * Start the KBA generation workflow
   */
  async startWorkflow(
    channel: string,
    threadTs: string,
    userId: string,
    jiraUrl: string
  ): Promise<void> {
    const contextKey = `${channel}-${threadTs}`;

    try {
      // Extract and fetch Jira ticket
      await this.sendMessage(channel, threadTs, ':mag: Analyzing Jira ticket...');

      const ticketKey = this.jiraService.extractTicketKey(jiraUrl);
      if (!ticketKey) {
        await this.sendMessage(channel, threadTs, ':x: Could not extract Jira ticket key from the URL. Please provide a valid Jira ticket URL.');
        return;
      }

      const ticket = await this.jiraService.getTicket(ticketKey);

      // Create context
      const context: ConversationContext = {
        threadTs,
        channel,
        userId,
        jiraTicket: ticket,
        stage: 'analyzing',
        questionsAsked: [],
        userAnswers: {}
      };
      this.contexts.set(contextKey, context);

      // Show ticket summary
      await this.sendMessage(
        channel,
        threadTs,
        `:white_check_mark: Found ticket: *${ticket.key} - ${ticket.summary}*\n\n` +
        `Status: ${ticket.status}\n` +
        `Priority: ${ticket.priority}\n\n` +
        `:brain: Analyzing ticket to determine what additional information is needed...`
      );

      // Generate clarifying questions
      const questions = await this.openaiService.generateClarifyingQuestions(ticket);
      context.questionsAsked = questions;
      context.stage = 'asking_questions';
      this.contexts.set(contextKey, context);

      if (questions.length === 0) {
        // No questions needed, proceed directly to generation
        await this.generateKBA(contextKey);
        return;
      }

      // Ask questions
      const questionText = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
      await this.sendMessage(
        channel,
        threadTs,
        `:question: I need some additional information to create a comprehensive KBA:\n\n${questionText}\n\n` +
        `Please answer these questions (you can answer them in one message or separately).`
      );

    } catch (error: any) {
      console.error('Error starting workflow:', error);
      await this.sendMessage(
        channel,
        threadTs,
        `:x: Error: ${error.message}`
      );
      this.contexts.delete(contextKey);
    }
  }

  /**
   * Handle user answers to questions
   */
  async handleAnswer(
    channel: string,
    threadTs: string,
    userId: string,
    answer: string
  ): Promise<void> {
    const contextKey = `${channel}-${threadTs}`;
    const context = this.contexts.get(contextKey);

    if (!context || context.stage !== 'asking_questions') {
      return;
    }

    // Store the answer (simple approach: concatenate all answers)
    const answerKey = `answer_${Object.keys(context.userAnswers).length + 1}`;
    context.userAnswers[answerKey] = answer;
    this.contexts.set(contextKey, context);

    // Check if we have enough answers
    if (Object.keys(context.userAnswers).length >= context.questionsAsked.length) {
      await this.sendMessage(
        channel,
        threadTs,
        `:white_check_mark: Thank you! I have all the information I need.\n\n:robot_face: Generating KBA content...`
      );
      await this.generateKBA(contextKey);
    } else {
      const remaining = context.questionsAsked.length - Object.keys(context.userAnswers).length;
      await this.sendMessage(
        channel,
        threadTs,
        `:white_check_mark: Got it! ${remaining} more question(s) remaining.`
      );
    }
  }

  /**
   * Generate the KBA content and images
   */
  private async generateKBA(contextKey: string): Promise<void> {
    const context = this.contexts.get(contextKey);
    if (!context || !context.jiraTicket) {
      return;
    }

    try {
      context.stage = 'generating';
      this.contexts.set(contextKey, context);

      const { channel, threadTs, jiraTicket, userAnswers } = context;

      // Generate content
      await this.sendMessage(channel, threadTs, ':pencil: Generating KBA content...');
      const content = await this.openaiService.generateKBAContent(jiraTicket, userAnswers);

      // Generate images
      const stepsWithImages = content.steps.filter(s => s.imagePrompt);
      if (stepsWithImages.length > 0) {
        await this.sendMessage(
          channel,
          threadTs,
          `:art: Generating ${stepsWithImages.length} screenshot mockup(s)... This may take a minute.`
        );
        const images = await this.openaiService.generateImages(content);

        context.kbaDraft = {
          jiraTicket,
          content,
          images
        };
      } else {
        context.kbaDraft = {
          jiraTicket,
          content,
          images: []
        };
      }

      context.stage = 'review';
      this.contexts.set(contextKey, context);

      // Show preview
      await this.showPreview(contextKey);

    } catch (error: any) {
      console.error('Error generating KBA:', error);
      await this.sendMessage(
        context.channel,
        context.threadTs,
        `:x: Error generating KBA: ${error.message}`
      );
      this.contexts.delete(contextKey);
    }
  }

  /**
   * Show KBA preview in Slack
   */
  private async showPreview(contextKey: string): Promise<void> {
    const context = this.contexts.get(contextKey);
    if (!context || !context.kbaDraft) {
      return;
    }

    const { channel, threadTs, kbaDraft } = context;
    const { content, images } = kbaDraft;

    // Create preview message
    let previewText = `:page_facing_up: *KBA Preview*\n\n`;
    previewText += `*Title:* ${content.title}\n\n`;
    previewText += `*Problem:*\n${content.problem}\n\n`;
    previewText += `*Solution:*\n${content.solution}\n\n`;
    previewText += `*Steps:*\n`;

    for (const step of content.steps) {
      previewText += `${step.stepNumber}. ${step.description}\n`;
      if (step.codeSnippet) {
        previewText += `\`\`\`\n${step.codeSnippet}\n\`\`\`\n`;
      }
    }

    if (content.additionalNotes) {
      previewText += `\n*Additional Notes:*\n${content.additionalNotes}\n`;
    }

    previewText += `\n*Tags:* ${content.tags.join(', ')}\n`;
    previewText += `\n*Generated Images:* ${images.length} screenshot mockup(s)\n`;

    await this.sendMessage(channel, threadTs, previewText);

    // Upload images to Slack for preview
    for (const image of images) {
      try {
        await this.app.client.files.uploadV2({
          channel_id: channel,
          thread_ts: threadTs,
          file: image.url,
          title: `Step ${image.stepNumber} - ${image.osType === 'mac' ? 'macOS' : 'Windows'}`,
          initial_comment: `Screenshot mockup for Step ${image.stepNumber} (${image.osType})`
        });
      } catch (error) {
        console.error('Error uploading image preview:', error);
      }
    }

    // Ask for approval
    await this.app.client.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: ':white_check_mark: KBA generated! Please review the content and images above.',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: ':white_check_mark: *KBA generated!* Please review the content and images above.'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Approve & Publish'
              },
              style: 'primary',
              action_id: 'approve_kba',
              value: contextKey
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Request Changes'
              },
              action_id: 'request_changes',
              value: contextKey
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Cancel'
              },
              style: 'danger',
              action_id: 'cancel_kba',
              value: contextKey
            }
          ]
        }
      ]
    });
  }

  /**
   * Handle approval and publish to Confluence
   */
  async approveAndPublish(contextKey: string, userId: string): Promise<void> {
    const context = this.contexts.get(contextKey);
    if (!context || !context.kbaDraft) {
      return;
    }

    const { channel, threadTs, kbaDraft, jiraTicket } = context;

    try {
      await this.sendMessage(
        channel,
        threadTs,
        `:rocket: Publishing KBA to Confluence...`
      );

      const pageUrl = await this.confluenceService.createKBAPage(
        kbaDraft.content,
        kbaDraft.images,
        jiraTicket!.key
      );

      context.stage = 'complete';
      this.contexts.set(contextKey, context);

      await this.sendMessage(
        channel,
        threadTs,
        `:white_check_mark: *KBA successfully published!*\n\n` +
        `View it here: ${pageUrl}\n\n` +
        `Jira Ticket: ${process.env.JIRA_HOST}/browse/${jiraTicket!.key}`
      );

      // Clean up context after a delay
      setTimeout(() => {
        this.contexts.delete(contextKey);
      }, 60000); // 1 minute

    } catch (error: any) {
      console.error('Error publishing KBA:', error);
      await this.sendMessage(
        channel,
        threadTs,
        `:x: Error publishing to Confluence: ${error.message}`
      );
    }
  }

  /**
   * Handle change requests
   */
  async requestChanges(contextKey: string): Promise<void> {
    const context = this.contexts.get(contextKey);
    if (!context) {
      return;
    }

    await this.sendMessage(
      context.channel,
      context.threadTs,
      ':pencil: Please describe what changes you\'d like me to make to the KBA.'
    );

    context.stage = 'asking_questions';
    this.contexts.set(contextKey, context);
  }

  /**
   * Cancel KBA generation
   */
  async cancelKBA(contextKey: string): Promise<void> {
    const context = this.contexts.get(contextKey);
    if (!context) {
      return;
    }

    await this.sendMessage(
      context.channel,
      context.threadTs,
      ':x: KBA generation cancelled.'
    );

    this.contexts.delete(contextKey);
  }

  /**
   * Send a message to Slack
   */
  private async sendMessage(channel: string, threadTs: string, text: string): Promise<void> {
    await this.app.client.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text
    });
  }

  /**
   * Get context by key
   */
  getContext(contextKey: string): ConversationContext | undefined {
    return this.contexts.get(contextKey);
  }
}
