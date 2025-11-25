import axios, { AxiosInstance } from 'axios';
import { JiraTicket, JiraComment } from '../types';

export class JiraService {
  private client: AxiosInstance;

  constructor() {
    const auth = Buffer.from(
      `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
    ).toString('base64');

    this.client = axios.create({
      baseURL: `${process.env.JIRA_HOST}/rest/api/3`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Extract Jira ticket key from a URL or plain text
   */
  extractTicketKey(text: string): string | null {
    // Match patterns like PROJ-123 or full URLs
    const patterns = [
      /([A-Z]+-\d+)/,  // Simple key like PROJ-123
      /browse\/([A-Z]+-\d+)/, // URL pattern
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Fetch ticket details from Jira
   */
  async getTicket(ticketKey: string): Promise<JiraTicket> {
    try {
      const response = await this.client.get(`/issue/${ticketKey}`, {
        params: {
          expand: 'renderedFields,names,schema,operations,editmeta,changelog'
        }
      });

      const issue = response.data;
      const fields = issue.fields;

      // Fetch comments separately
      const comments = await this.getComments(ticketKey);

      const ticket: JiraTicket = {
        key: issue.key,
        summary: fields.summary || '',
        description: fields.description?.content
          ? this.extractTextFromADF(fields.description)
          : fields.description || '',
        issueType: fields.issuetype?.name || '',
        priority: fields.priority?.name || '',
        status: fields.status?.name || '',
        assignee: fields.assignee?.displayName,
        reporter: fields.reporter?.displayName,
        created: fields.created,
        updated: fields.updated,
        resolution: fields.resolution?.name,
        comments,
        customFields: this.extractCustomFields(fields)
      };

      return ticket;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`Jira ticket ${ticketKey} not found`);
      }
      throw new Error(`Failed to fetch Jira ticket: ${error.message}`);
    }
  }

  /**
   * Fetch comments for a ticket
   */
  private async getComments(ticketKey: string): Promise<JiraComment[]> {
    try {
      const response = await this.client.get(`/issue/${ticketKey}/comment`);
      const comments = response.data.comments || [];

      return comments.map((comment: any) => ({
        author: comment.author?.displayName || 'Unknown',
        body: comment.body?.content
          ? this.extractTextFromADF(comment.body)
          : comment.body || '',
        created: comment.created
      }));
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      return [];
    }
  }

  /**
   * Extract plain text from Atlassian Document Format (ADF)
   */
  private extractTextFromADF(adf: any): string {
    if (typeof adf === 'string') {
      return adf;
    }

    if (!adf || !adf.content) {
      return '';
    }

    let text = '';

    const traverse = (node: any) => {
      if (node.type === 'text') {
        text += node.text;
      }

      if (node.content) {
        node.content.forEach(traverse);
      }

      // Add spacing for paragraphs
      if (node.type === 'paragraph' || node.type === 'heading') {
        text += '\n';
      }
    };

    traverse(adf);
    return text.trim();
  }

  /**
   * Extract custom fields that might be relevant
   */
  private extractCustomFields(fields: any): Record<string, any> {
    const customFields: Record<string, any> = {};

    // Look for common custom field patterns
    Object.keys(fields).forEach(key => {
      if (key.startsWith('customfield_')) {
        const value = fields[key];
        if (value) {
          customFields[key] = value;
        }
      }
    });

    return customFields;
  }

  /**
   * Validate Jira URL
   */
  isValidJiraUrl(url: string): boolean {
    const jiraHost = process.env.JIRA_HOST || '';
    return url.includes(jiraHost) && url.includes('/browse/');
  }
}
