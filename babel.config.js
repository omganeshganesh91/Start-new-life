// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated must be last
      'react-native-reanimated/plugin',
    ],
  };
};
// NOTE: @env / react-native-dotenv removed.
// Use process.env.EXPO_PUBLIC_* instead — works on web, Android, iOS, and Expo Go.
// Set keys in .env file: EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
