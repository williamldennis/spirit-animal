import Constants from 'expo-constants';

export const ENV = {
  OPENAI_API_KEY: Constants.expoConfig?.extra?.openaiApiKey,
  // Add other environment variables as needed
};

// Validate required environment variables
const requiredVars = ['OPENAI_API_KEY'];

requiredVars.forEach(varName => {
  if (!ENV[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
  }
});

export default ENV; 