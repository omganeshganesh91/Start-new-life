// jest.config.js
module.exports = {
  preset:          'jest-expo',
  testEnvironment: 'node',
  setupFiles:      ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/backend/'],
  moduleNameMapper: {
    // Env vars
    '@env': '<rootDir>/__mocks__/@env.js',

    // Async storage
    '@react-native-async-storage/async-storage':
      '<rootDir>/__mocks__/asyncStorage.js',

    // Firebase — project is Firebase-free; this stub prevents crashes if any
    // missed import slips through during testing
    '@react-native-firebase/(.*)':
      '<rootDir>/__mocks__/firebase.js',

    // ApiService (community wall REST client)
    '.*src/services/ApiService':
      '<rootDir>/__mocks__/ApiService.js',

    // Expo notifications
    'expo-notifications':
      '<rootDir>/__mocks__/expo-notifications.js',

    // Native modules that don't run in Node
    'react-native-encrypted-storage':
      '<rootDir>/__mocks__/encryptedStorage.js',
    'react-native-linear-gradient':
      'react-native-linear-gradient/src/index',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|expo|@expo|expo-modules-core|expo-[a-zA-Z0-9_-]+|moment)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
  ],
};
