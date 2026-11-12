// ─────────────────────────────────────────────────────────────────────────────
// AppNavigator.js — Bottom tab + stack navigation for Start A New Life
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';

import DashboardScreen     from '../screens/DashboardScreen';
import BlockerScreen       from '../screens/BlockerScreen';
import AppLockScreen       from '../screens/AppLockScreen';
import MotivationScreen    from '../screens/MotivationScreen';
import ProgressScreen      from '../screens/ProgressScreen';
import CommunityWallScreen from '../screens/CommunityWallScreen';
import SetPinScreen        from '../screens/SetPinScreen';
import AppLockGate         from '../screens/AppLockGate';

import { COLORS, FONTS, SPACING } from '../utils/constants';
import { hs, ms, vs } from '../utils/responsive';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Tab Bar Icon ──────────────────────────────────────────────────────────────
const TabIcon = ({ emoji, label, focused }) => (
  <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
    <Text style={styles.tabEmoji}>{emoji}</Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
  </View>
);

// ── Custom Tab Bar ────────────────────────────────────────────────────────────
const CustomTabBar = ({ state, descriptors, navigation }) => (
  <View style={styles.tabBar}>
    {state.routes.map((route, index) => {
      const { options } = descriptors[route.key];
      const isFocused   = state.index === index;

      const onPress = () => {
        const event = navigation.emit({
          type: 'tabPress', target: route.key, canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
      };

      const icons = {
        Dashboard:  { emoji: '🏠', label: 'Home'     },
        Blocker:    { emoji: '🛡️', label: 'Shield'   },
        AppLock:    { emoji: '🔒', label: 'AppLock'  },
        Motivation: { emoji: '✨', label: 'Inspire'  },
        Progress:   { emoji: '📊', label: 'Progress' },
        Community:  { emoji: '🧱', label: 'Wall'     },
      };

      const icon = icons[route.name] || { emoji: '●', label: route.name };

      return (
        <TouchableOpacity
          key={route.key}
          onPress={onPress}
          style={styles.tabItem}
          activeOpacity={0.7}
        >
          <TabIcon emoji={icon.emoji} label={icon.label} focused={isFocused} />
          {isFocused && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      );
    })}
  </View>
);

// ── Main Tabs ─────────────────────────────────────────────────────────────────
const MainTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <CustomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Dashboard"  component={DashboardScreen}    />
    <Tab.Screen name="Blocker"    component={BlockerScreen}       />
    <Tab.Screen name="AppLock"    component={AppLockScreen}       />
    <Tab.Screen name="Motivation" component={MotivationScreen}    />
    <Tab.Screen name="Progress"   component={ProgressScreen}      />
    <Tab.Screen name="Community"  component={CommunityWallScreen} />
  </Tab.Navigator>
);

// ── Root Stack ────────────────────────────────────────────────────────────────
// SetPinScreen and AppLockGate are modal stack screens (no tab bar)
export const AppNavigator = () => (
  <NavigationContainer
    theme={{
      dark: true,
      colors: {
        primary:      COLORS.primary,
        background:   COLORS.background,
        card:         COLORS.surface,
        text:         COLORS.textPrimary,
        border:       COLORS.border,
        notification: COLORS.accent,
      },
    }}
  >
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main tab layout */}
      <Stack.Screen name="Main" component={MainTabs} />

      {/* PIN setup — slides up from AppLock tab */}
      <Stack.Screen
        name="SetPin"
        component={SetPinScreen}
        options={{ presentation: 'modal' }}
      />

      {/* App lock gate — full-screen interstitial when a locked app is opened */}
      <Stack.Screen
        name="AppLockGate"
        component={AppLockGate}
        options={{ presentation: 'fullScreenModal' }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    flexDirection:   'row',
    backgroundColor: COLORS.surface,
    borderTopWidth:  1,
    borderTopColor:  COLORS.border,
    paddingBottom:   vs(8),
    paddingTop:      vs(4),
    elevation:       20,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -4 },
    shadowOpacity:   0.4,
    shadowRadius:    8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex:            1,
    minWidth:        0,
    alignItems:      'center',
    justifyContent:  'center',
    position:        'relative',
    paddingVertical: vs(4),
  },
  tabIcon: {
    alignItems: 'center',
    gap:        2,
  },
  tabIconFocused: {
    transform: [{ scale: 1.05 }],
  },
  tabEmoji: {
    fontSize: ms(20),
  },
  tabLabel: {
    fontSize:   ms(10),
    color:      COLORS.textMuted,
    fontWeight: FONTS.weights.medium,
    marginTop:  2,
  },
  tabLabelFocused: {
    color:      COLORS.primaryLight,
    fontWeight: FONTS.weights.bold,
  },
  activeIndicator: {
    position:        'absolute',
    bottom:          -4,
    width:           hs(24),
    height:          vs(3),
    borderRadius:    2,
    backgroundColor: COLORS.primary,
  },
});
