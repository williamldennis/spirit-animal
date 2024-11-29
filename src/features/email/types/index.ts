export interface Email {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  snippet: string;
  date: string;
  isRead: boolean;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  threadId: string;
}

export interface EmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  url: string;
}

export interface EmailCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string;
}

export interface SendEmailParams {
  to: string[];
  subject: string;
  body: string;
  attachments?: File[];
} 