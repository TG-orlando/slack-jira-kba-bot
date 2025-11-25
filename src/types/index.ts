export interface JiraTicket {
  key: string;
  summary: string;
  description: string;
  issueType: string;
  priority: string;
  status: string;
  assignee?: string;
  reporter?: string;
  created: string;
  updated: string;
  comments?: JiraComment[];
  resolution?: string;
  customFields?: Record<string, any>;
}

export interface JiraComment {
  author: string;
  body: string;
  created: string;
}

export interface KBAContent {
  title: string;
  problem: string;
  solution: string;
  steps: KBAStep[];
  additionalNotes?: string;
  tags: string[];
}

export interface KBAStep {
  stepNumber: number;
  description: string;
  imagePrompt?: string;
  osType?: 'mac' | 'windows' | 'both';
  codeSnippet?: string;
}

export interface GeneratedImage {
  stepNumber: number;
  url: string;
  osType: 'mac' | 'windows';
  prompt: string;
}

export interface KBADraft {
  jiraTicket: JiraTicket;
  content: KBAContent;
  images: GeneratedImage[];
  confluencePageId?: string;
}

export interface ConversationContext {
  threadTs: string;
  channel: string;
  userId: string;
  jiraTicket?: JiraTicket;
  kbaDraft?: KBADraft;
  stage: 'initial' | 'analyzing' | 'asking_questions' | 'generating' | 'review' | 'complete';
  questionsAsked: string[];
  userAnswers: Record<string, string>;
}
