import { logger } from '../../../utils/logger';
import { ENV } from '../../../config/env';

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class WebBrowsingService {
  private apiKey: string;
  private searchEngineId: string;

  constructor() {
    this.apiKey = ENV.GOOGLE_SEARCH_API_KEY || '';
    this.searchEngineId = ENV.GOOGLE_SEARCH_ENGINE_ID || '';
  }

  async search(query: string): Promise<WebSearchResult[]> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${this.searchEngineId}&q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();
      
      return data.items.map((item: any) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet
      }));
    } catch (error) {
      logger.error('WebBrowsingService.search', 'Failed to perform web search', { error });
      throw error;
    }
  }

  async fetchWebPage(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch webpage');
      }

      const html = await response.text();
      
      // Basic HTML to text conversion (you might want to use a proper HTML parser)
      const text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return text;
    } catch (error) {
      logger.error('WebBrowsingService.fetchWebPage', 'Failed to fetch webpage', { error });
      throw error;
    }
  }
}

export const webBrowsingService = new WebBrowsingService(); 