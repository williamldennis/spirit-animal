import 'dotenv/config';

export default {
  expo: {
    name: 'spirit-animal',
    slug: 'spirit-animal',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.willdennis.spiritanimal',
      infoPlist: {
        NSContactsUsageDescription: 'Allow Spirit Animal to access your contacts so you can chat with them.'
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.willdennis.spiritanimal',
      permissions: ['android.permission.READ_CONTACTS']
    },
    web: {
      favicon: './assets/favicon.png'
    },
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
      googleExpoClientId: process.env.GOOGLE_EXPO_CLIENT_ID,
    },
    plugins: [
      [
        'expo-contacts',
        {
          contactsPermission: 'Allow Spirit Animal to access your contacts.'
        }
      ]
    ],
    scheme: 'com.willdennis.spiritanimal',
  }
}; 