import Constants from 'expo-constants';

interface Env {
  OPENAI_API_KEY: string;
  GOOGLE_SEARCH_API_KEY: string;
  GOOGLE_SEARCH_ENGINE_ID: string;
  GOOGLE_WEB_CLIENT_ID: string;
  GOOGLE_IOS_CLIENT_ID: string;
}

export const ENV: Env = {
  OPENAI_API_KEY: Constants.expoConfig?.extra?.openaiApiKey,
  GOOGLE_SEARCH_API_KEY: process.env.GOOGLE_SEARCH_API_KEY as string,
  GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID as string,
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID as string,
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID as string,
};

// Validate required environment variables
const requiredVars = [
  'OPENAI_API_KEY',
  'GOOGLE_SEARCH_API_KEY',
  'GOOGLE_SEARCH_ENGINE_ID',
  'GOOGLE_WEB_CLIENT_ID',
  'GOOGLE_IOS_CLIENT_ID'
] as const;

requiredVars.forEach((varName) => {
  if (!ENV[varName as keyof Env]) {
    console.error(`Missing required environment variable: ${varName}`);
  }
});

export default ENV; 