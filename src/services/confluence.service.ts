import axios, { AxiosInstance } from 'axios';
import { KBAContent, GeneratedImage } from '../types';

export class ConfluenceService {
  private client: AxiosInstance;
  private spaceKey: string;
  private parentPageId: string;

  constructor() {
    const auth = Buffer.from(
      `${process.env.CONFLUENCE_EMAIL}:${process.env.CONFLUENCE_API_TOKEN}`
    ).toString('base64');

    this.client = axios.create({
      baseURL: `${process.env.CONFLUENCE_HOST}/wiki/rest/api`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    this.spaceKey = process.env.CONFLUENCE_SPACE_KEY || 'ORCAS';
    this.parentPageId = process.env.CONFLUENCE_PARENT_PAGE_ID || '';
  }

  /**
   * Create a new Confluence page with the KBA content
   */
  async createKBAPage(
    content: KBAContent,
    images: GeneratedImage[],
    jiraKey: string
  ): Promise<string> {
    const pageContent = this.generateConfluenceHTML(content, images, jiraKey);

    const page = {
      type: 'page',
      title: content.title,
      space: {
        key: this.spaceKey
      },
      body: {
        storage: {
          value: pageContent,
          representation: 'storage'
        }
      },
      metadata: {
        labels: content.tags.map(tag => ({ name: tag }))
      }
    };

    // Add parent page if specified
    if (this.parentPageId) {
      (page as any).ancestors = [{ id: this.parentPageId }];
    }

    try {
      const response = await this.client.post('/content', page);
      const pageId = response.data.id;
      const pageUrl = `${process.env.CONFLUENCE_HOST}/wiki/spaces/${this.spaceKey}/pages/${pageId}`;

      // Upload images as attachments
      await this.uploadImages(pageId, images);

      return pageUrl;
    } catch (error: any) {
      console.error('Failed to create Confluence page:', error.response?.data || error.message);
      throw new Error(`Failed to create Confluence page: ${error.message}`);
    }
  }

  /**
   * Generate Confluence storage format HTML
   */
  private generateConfluenceHTML(
    content: KBAContent,
    images: GeneratedImage[],
    jiraKey: string
  ): string {
    let html = '';

    // Add Jira ticket reference
    html += `<p><strong>Related Jira Ticket:</strong> <a href="${process.env.JIRA_HOST}/browse/${jiraKey}">${jiraKey}</a></p>\n`;

    // Problem section
    html += `<h2>Problem</h2>\n<p>${this.escapeHTML(content.problem)}</p>\n`;

    // Solution section
    html += `<h2>Solution</h2>\n<p>${this.escapeHTML(content.solution)}</p>\n`;

    // Steps section
    html += `<h2>Step-by-Step Instructions</h2>\n`;

    for (const step of content.steps) {
      html += `<h3>Step ${step.stepNumber}</h3>\n`;
      html += `<p>${this.escapeHTML(step.description)}</p>\n`;

      // Add code snippet if present
      if (step.codeSnippet) {
        html += `<ac:structured-macro ac:name="code">`;
        html += `<ac:plain-text-body><![CDATA[${step.codeSnippet}]]></ac:plain-text-body>`;
        html += `</ac:structured-macro>\n`;
      }

      // Add image placeholder (will be replaced after upload)
      const stepImages = images.filter(img => img.stepNumber === step.stepNumber);
      for (const image of stepImages) {
        html += `<p><strong>${image.osType === 'mac' ? 'macOS' : 'Windows'}:</strong></p>\n`;
        html += `<p><ac:image><ri:attachment ri:filename="step-${step.stepNumber}-${image.osType}.png" /></ac:image></p>\n`;
      }
    }

    // Additional notes section
    if (content.additionalNotes) {
      html += `<h2>Additional Notes</h2>\n<p>${this.escapeHTML(content.additionalNotes)}</p>\n`;
    }

    // Tags section
    html += `<p><strong>Tags:</strong> ${content.tags.join(', ')}</p>\n`;

    return html;
  }

  /**
   * Upload images as attachments to the Confluence page
   */
  private async uploadImages(pageId: string, images: GeneratedImage[]): Promise<void> {
    for (const image of images) {
      try {
        // Download the image from OpenAI URL
        const imageResponse = await axios.get(image.url, {
          responseType: 'arraybuffer'
        });

        const imageBuffer = Buffer.from(imageResponse.data);
        const filename = `step-${image.stepNumber}-${image.osType}.png`;

        // Upload to Confluence
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/png' });
        formData.append('file', blob, filename);

        await this.client.post(
          `/content/${pageId}/child/attachment`,
          formData,
          {
            headers: {
              'X-Atlassian-Token': 'no-check',
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        console.log(`Uploaded image: ${filename}`);
      } catch (error: any) {
        console.error(`Failed to upload image for step ${image.stepNumber}:`, error.message);
        // Continue with other images even if one fails
      }
    }
  }

  /**
   * Update an existing Confluence page
   */
  async updateKBAPage(
    pageId: string,
    content: KBAContent,
    images: GeneratedImage[],
    jiraKey: string
  ): Promise<string> {
    try {
      // Get current page version
      const currentPage = await this.client.get(`/content/${pageId}`);
      const currentVersion = currentPage.data.version.number;

      const pageContent = this.generateConfluenceHTML(content, images, jiraKey);

      const updateData = {
        version: {
          number: currentVersion + 1
        },
        title: content.title,
        type: 'page',
        body: {
          storage: {
            value: pageContent,
            representation: 'storage'
          }
        }
      };

      await this.client.put(`/content/${pageId}`, updateData);

      // Upload new images
      await this.uploadImages(pageId, images);

      return `${process.env.CONFLUENCE_HOST}/wiki/spaces/${this.spaceKey}/pages/${pageId}`;
    } catch (error: any) {
      console.error('Failed to update Confluence page:', error.response?.data || error.message);
      throw new Error(`Failed to update Confluence page: ${error.message}`);
    }
  }

  /**
   * Search for existing KBA pages by Jira ticket key
   */
  async findPageByJiraKey(jiraKey: string): Promise<string | null> {
    try {
      const cql = `space="${this.spaceKey}" AND text~"${jiraKey}"`;
      const response = await this.client.get('/content/search', {
        params: { cql, limit: 10 }
      });

      if (response.data.results.length > 0) {
        return response.data.results[0].id;
      }

      return null;
    } catch (error) {
      console.error('Failed to search for existing page:', error);
      return null;
    }
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br/>');
  }

  /**
   * Get page URL by ID
   */
  getPageUrl(pageId: string): string {
    return `${process.env.CONFLUENCE_HOST}/wiki/spaces/${this.spaceKey}/pages/${pageId}`;
  }
}
