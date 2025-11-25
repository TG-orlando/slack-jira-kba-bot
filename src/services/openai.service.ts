import OpenAI from 'openai';
import { JiraTicket, KBAContent, GeneratedImage } from '../types';

export class OpenAIService {
  private client: OpenAI;
  private model: string;
  private imageModel: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    this.imageModel = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';
  }

  /**
   * Analyze Jira ticket and determine what clarifying questions to ask
   */
  async generateClarifyingQuestions(ticket: JiraTicket): Promise<string[]> {
    const prompt = `You are an expert technical writer creating knowledge base articles (KBAs) for IT support teams.

Analyze this Jira ticket and determine what additional information you need to write a comprehensive troubleshooting guide for Level 2 and Level 3 technicians.

Jira Ticket:
- Key: ${ticket.key}
- Summary: ${ticket.summary}
- Description: ${ticket.description}
- Priority: ${ticket.priority}
- Status: ${ticket.status}
${ticket.comments && ticket.comments.length > 0 ? `\nComments:\n${ticket.comments.map(c => `- ${c.author}: ${c.body}`).join('\n')}` : ''}

Generate 2-4 specific clarifying questions that would help you write a better KBA. Focus on:
- Root cause if not clear
- Exact steps to reproduce if missing
- Which OS/environment this affects (Mac, Windows, both)
- Any prerequisites or permissions needed
- Expected vs actual behavior

Return ONLY a JSON array of question strings, nothing else. Example:
["What were the exact error messages users encountered?", "Did this affect Mac users, Windows users, or both?"]`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content || '{"questions": []}';
    try {
      const parsed = JSON.parse(content);
      return parsed.questions || [];
    } catch {
      return [];
    }
  }

  /**
   * Generate KBA content based on ticket and user answers
   */
  async generateKBAContent(
    ticket: JiraTicket,
    userAnswers: Record<string, string>
  ): Promise<KBAContent> {
    const answersText = Object.entries(userAnswers)
      .map(([q, a]) => `Q: ${q}\nA: ${a}`)
      .join('\n\n');

    const prompt = `You are an expert technical writer creating knowledge base articles (KBAs) for IT support teams.

Create a comprehensive KBA article based on this Jira ticket and additional context.

Jira Ticket:
- Key: ${ticket.key}
- Summary: ${ticket.summary}
- Description: ${ticket.description}
- Priority: ${ticket.priority}
- Status: ${ticket.status}
${ticket.resolution ? `- Resolution: ${ticket.resolution}` : ''}
${ticket.comments && ticket.comments.length > 0 ? `\nComments:\n${ticket.comments.map(c => `- ${c.author}: ${c.body}`).join('\n')}` : ''}

Additional Context from Questions:
${answersText}

Create a KBA with:
1. A clear, searchable title
2. Problem statement (what issue users are experiencing)
3. Solution overview
4. Detailed step-by-step instructions
5. For each step that would benefit from a screenshot:
   - Include an "imagePrompt" field with a detailed DALL-E prompt for generating a UI mockup
   - Specify the OS type (mac, windows, or both)
   - The prompt should describe the exact UI elements, buttons, dialogs, and settings to show
6. Any code snippets that should be included
7. Relevant tags for searchability

Return ONLY valid JSON in this exact format:
{
  "title": "How to resolve X issue",
  "problem": "Users are experiencing...",
  "solution": "This can be resolved by...",
  "steps": [
    {
      "stepNumber": 1,
      "description": "Click on System Preferences",
      "imagePrompt": "A macOS System Preferences window showing the main preference panes grid layout with icons for General, Desktop & Screen Saver, Dock & Menu Bar, etc. The window has the standard macOS gray header with traffic light buttons. Photorealistic UI mockup.",
      "osType": "mac"
    },
    {
      "stepNumber": 2,
      "description": "Navigate to Network settings"
    }
  ],
  "additionalNotes": "Optional notes about edge cases or common issues",
  "tags": ["networking", "mac", "connectivity"]
}`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content || '{}';
    const kba = JSON.parse(content);

    return kba as KBAContent;
  }

  /**
   * Generate images based on the image prompts in KBA steps
   */
  async generateImages(content: KBAContent): Promise<GeneratedImage[]> {
    const images: GeneratedImage[] = [];

    for (const step of content.steps) {
      if (step.imagePrompt && step.osType) {
        try {
          // Generate for the specified OS
          const osTypes = step.osType === 'both' ? ['mac', 'windows'] : [step.osType];

          for (const os of osTypes) {
            const enhancedPrompt = this.enhanceImagePrompt(step.imagePrompt, os);

            const response = await this.client.images.generate({
              model: this.imageModel,
              prompt: enhancedPrompt,
              n: 1,
              size: '1024x1024',
              quality: 'standard',
              style: 'natural'
            });

            if (response.data[0].url) {
              images.push({
                stepNumber: step.stepNumber,
                url: response.data[0].url,
                osType: os as 'mac' | 'windows',
                prompt: enhancedPrompt
              });
            }
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          console.error(`Failed to generate image for step ${step.stepNumber}:`, error.message);
          // Continue with other images even if one fails
        }
      }
    }

    return images;
  }

  /**
   * Enhance image prompt with OS-specific details
   */
  private enhanceImagePrompt(basePrompt: string, osType: 'mac' | 'windows'): string {
    const osStyles = {
      mac: 'macOS style interface with rounded corners, San Francisco font, light gray header with red/yellow/green traffic light buttons on the left, clean modern aesthetic',
      windows: 'Windows 11 style interface with rounded corners, Segoe UI font, white title bar with minimize/maximize/close buttons on the right, modern Fluent Design aesthetic'
    };

    return `${basePrompt}\n\nStyle: ${osStyles[osType]}. Photorealistic computer interface mockup, high quality, clean and professional appearance. No text unless absolutely necessary for UI clarity.`;
  }

  /**
   * Refine KBA content based on user feedback
   */
  async refineKBAContent(
    originalContent: KBAContent,
    feedback: string
  ): Promise<KBAContent> {
    const prompt = `You are refining a KBA article based on user feedback.

Original KBA:
${JSON.stringify(originalContent, null, 2)}

User Feedback:
${feedback}

Update the KBA to address the feedback. Return ONLY the complete updated KBA as valid JSON in the same format as the original.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content) as KBAContent;
  }
}
