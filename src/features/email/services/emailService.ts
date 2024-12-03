import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { logger } from '../../../utils/logger';
import { Email, EmailCredentials, SendEmailParams } from '../types';
import { ENV } from '../../../config/env';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

class EmailService {
  private readonly GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify'
  ];

  async connectGmail(userId: string, accessToken: string): Promise<boolean> {
    try {
      logger.info('EmailService.connectGmail', 'Starting Gmail connection');
      
      const credentials: EmailCredentials = {
        accessToken,
        refreshToken: '', // We'll handle refresh tokens later if needed
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
        scope: this.SCOPES.join(' ')
      };

      await this.saveEmailCredentials(userId, credentials);
      return true;
    } catch (error) {
      logger.error('EmailService.connectGmail', 'Connection failed', { error });
      throw error;
    }
  }

  async isGmailConnected(userId: string): Promise<boolean> {
    try {
      const credentials = await this.getEmailCredentials(userId);
      if (!credentials?.accessToken) return false;

      const expiresAt = new Date(credentials.expiresAt);
      return expiresAt > new Date();
    } catch (error) {
      logger.error('EmailService.isGmailConnected', 'Check failed', { error });
      return false;
    }
  }

  async fetchEmails(userId: string): Promise<Email[]> {
    try {
      const credentials = await this.getEmailCredentials(userId);
      if (!credentials?.accessToken) throw new Error('Gmail not connected');

      const response = await fetch(
        `${this.GMAIL_API_BASE}/messages?maxResults=20&labelIds=INBOX`,
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch emails');

      const data = await response.json();
      const emails: Email[] = [];

      // Fetch full details for each email
      for (const message of data.messages) {
        const emailData = await this.fetchEmailDetails(userId, message.id);
        if (emailData) emails.push(emailData);
      }

      return emails;
    } catch (error) {
      logger.error('EmailService.fetchEmails', 'Fetch failed', { error });
      throw error;
    }
  }

  async fetchEmailDetails(userId: string, messageId: string): Promise<Email | null> {
    try {
      const credentials = await this.getEmailCredentials(userId);
      if (!credentials?.accessToken) throw new Error('Gmail not connected');

      const response = await fetch(
        `${this.GMAIL_API_BASE}/messages/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch email details');

      const data = await response.json();
      
      // Parse email data
      const headers = data.payload.headers;
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const to = headers.find((h: any) => h.name === 'To')?.value?.split(',').map((e: string) => e.trim()) || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';
      
      // Get email body
      const body = this.getEmailBody(data.payload);

      return {
        id: data.id,
        threadId: data.threadId,
        from,
        to,
        subject,
        body,
        snippet: data.snippet,
        date,
        isRead: !data.labelIds.includes('UNREAD'),
        hasAttachments: Boolean(data.payload.parts?.some((p: any) => p.filename)),
      };
    } catch (error) {
      logger.error('EmailService.fetchEmailDetails', 'Fetch failed', { error });
      return null;
    }
  }

  private getEmailBody(payload: any): string {
    if (payload.body?.data) {
      return this.decodeBase64Url(payload.body.data);
    }

    if (payload.parts) {
      const textPart = payload.parts.find((part: any) => 
        part.mimeType === 'text/plain' || part.mimeType === 'text/html'
      );
      if (textPart?.body?.data) {
        return this.decodeBase64Url(textPart.body.data);
      }
    }

    return '';
  }

  private decodeBase64Url(base64Url: string): string {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return atob(base64);
  }

  private async saveEmailCredentials(userId: string, credentials: EmailCredentials) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        emailCredentials: credentials
      }, { merge: true });
    } catch (error) {
      logger.error('EmailService.saveEmailCredentials', 'Save failed', { error });
      throw error;
    }
  }

  private async getEmailCredentials(userId: string): Promise<EmailCredentials | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      return userDoc.data()?.emailCredentials || null;
    } catch (error) {
      logger.error('EmailService.getEmailCredentials', 'Fetch failed', { error });
      throw error;
    }
  }

  async sendEmail(userId: string, params: SendEmailParams): Promise<boolean> {
    try {
      const credentials = await this.getEmailCredentials(userId);
      if (!credentials?.accessToken) throw new Error('Gmail not connected');

      const mimeContent = this.createMimeMessage(params);
      const base64EncodedEmail = btoa(mimeContent).replace(/\+/g, '-').replace(/\//g, '_');

      const response = await fetch(
        `${this.GMAIL_API_BASE}/messages/send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw: base64EncodedEmail,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      logger.error('EmailService.sendEmail', 'Send failed', { error });
      throw error;
    }
  }

  private createMimeMessage(params: SendEmailParams): string {
    const { to, subject, body } = params;
    const toHeader = to.join(', ');
    
    return [
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      `To: ${toHeader}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\r\n');
  }

  async archiveEmail(userId: string, emailId: string): Promise<boolean> {
    try {
      const credentials = await this.getEmailCredentials(userId);
      if (!credentials?.accessToken) throw new Error('Gmail not connected');

      const response = await fetch(
        `${this.GMAIL_API_BASE}/messages/${emailId}/modify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            addLabelIds: ['ARCHIVE'],
            removeLabelIds: ['INBOX']
          }),
        }
      );

      return response.ok;
    } catch (error) {
      logger.error('EmailService.archiveEmail', 'Failed to archive email', { error });
      throw error;
    }
  }
}

export const emailService = new EmailService(); 