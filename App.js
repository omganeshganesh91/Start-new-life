import 'react-native-gesture-handler';
import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { COLORS } from './src/utils/constants';

export default function App() {
  const { width } = useWindowDimensions();

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.viewport} edges={['top', 'bottom']}>
          <View style={[styles.appFrame, { maxWidth: Math.min(width, 720) }]}>
            <StatusBar style="light" backgroundColor={COLORS.background} />
            <AppNavigator />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  appFrame: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.background,
  },
});
