import Constants from 'expo-constants';

interface Env {
  OPENAI_API_KEY: string;
  GOOGLE_SEARCH_API_KEY: string;
  GOOGLE_SEARCH_ENGINE_ID: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export const ENV: Env = {
  OPENAI_API_KEY: Constants.expoConfig?.extra?.openaiApiKey,
  GOOGLE_SEARCH_API_KEY: process.env.GOOGLE_SEARCH_API_KEY as string,
  GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID as string,
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || '',
};

// Validate required environment variables
const requiredVars = ['OPENAI_API_KEY', 'GOOGLE_SEARCH_API_KEY', 'GOOGLE_SEARCH_ENGINE_ID', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];

requiredVars.forEach(varName => {
  if (!ENV[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
  }
});

export default ENV; 