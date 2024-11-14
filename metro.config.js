const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = {
  ...config,
  server: {
    port: 8081,
    host: 'localhost'
  },
  watchFolders: [__dirname]
}; 