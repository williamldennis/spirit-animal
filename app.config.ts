import dotenv from 'dotenv';
dotenv.config();

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
      config: {
        googleSignIn: {
          reservedClientId: process.env.GOOGLE_IOS_CLIENT_ID
        }
      },
      infoPlist: {
        NSContactsUsageDescription: 'Allow Spirit Animal to access your contacts so you can chat with them.',
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              'com.willdennis.spiritanimal',
              `com.googleusercontent.apps.${process.env.GOOGLE_IOS_CLIENT_ID?.split('.')[0]}`
            ]
          }
        ]
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
      eas: {
        projectId: "c13f814a-6013-41f1-966a-827ca2d19d76"
      },
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
      openaiApiKey: process.env.OPENAI_API_KEY,
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
    experiments: {
      tsconfigPaths: true
    },
    jsEngine: "hermes",
    _internal: {
      isDebug: false,
      newArchEnabled: true
    }
  }
}; 