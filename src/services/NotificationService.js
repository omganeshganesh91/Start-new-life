// ─────────────────────────────────────────────────────────────────────────────
// NotificationService.js — Local notifications via expo-notifications
// Firebase Cloud Messaging removed — push delivery handled by backend if needed
// ─────────────────────────────────────────────────────────────────────────────
import * as Notifications from 'expo-notifications';
import { Platform }        from 'react-native';

// ── Default notification handler ──────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge:  false,
  }),
});

// ── Initialize & request permissions ─────────────────────────────────────────
export const initNotifications = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('NotificationService: permission not granted');
    return false;
  }

  // Android: create notification channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sanl-main', {
      name:        'Start A New Life',
      importance:  Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:  '#4A6FDB',
    });

    await Notifications.setNotificationChannelAsync('sanl-motivation', {
      name:        'Daily Motivation',
      importance:  Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [],
      sound:       null,
    });

    await Notifications.setNotificationChannelAsync('sanl-night-note', {
      name:        'Moon Note',
      importance:  Notifications.AndroidImportance.LOW,
      vibrationPattern: [],
      sound:       null,
    });
  }

  return true;
};

// ── Gentle evening reflection, delivered before Night Shield quiet hours ──────
export const scheduleMoonNote = async () => {
  const notificationsEnabled = await initNotifications();
  if (!notificationsEnabled) return false;

  await cancelMoonNote();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌙 Your Moon Note',
      body:  'Before the day ends, name one small thing you did well. Let that be enough.',
      data:  { type: 'moon-note' },
      sound: false,
      ...(Platform.OS === 'android'
        ? {
            channelId: 'sanl-night-note',
            priority: 'low',
            vibrationPattern: [],
          }
        : { interruptionLevel: 'passive' }),
    },
    trigger: {
      hour:    21,
      minute:  30,
      repeats: true,
    },
  });

  return true;
};

export const cancelMoonNote = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.type === 'moon-note') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
};

// ── Schedule daily 9AM motivation notification ────────────────────────────────
export const scheduleDailyMotivation = async (quote = '') => {
  // Cancel any previously scheduled daily motivation
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.type === 'daily-motivation') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✨ Your Daily Strength',
      body:  quote || 'Your daily motivation is ready. Tap to read.',
      data:  { type: 'daily-motivation' },
      sound: false,
      ...(Platform.OS === 'android' ? { channelId: 'sanl-motivation' } : {}),
    },
    trigger: {
      hour:    9,
      minute:  0,
      repeats: true,
    },
  });

  console.log('NotificationService: daily motivation scheduled for 9:00 AM');
};

// ── Streak milestone local notification ───────────────────────────────────────
const MILESTONES = {
  1:  { title: '🌱 Day 1 Complete!',     body: 'You started. That took courage.' },
  3:  { title: '✨ 3 Days Strong!',       body: 'Your brain is already healing.' },
  7:  { title: '🔥 One Week!',            body: 'Dopamine receptors are rebalancing. Keep going.' },
  14: { title: '💪 Two Weeks Clean!',     body: "The fog is lifting. You're doing this." },
  30: { title: '🏆 One Month!',           body: "You've become a different person. Incredible." },
  90: { title: '👑 90 Days — Complete!',  body: 'Full neurological reset achieved. You won.' },
};

export const notifyStreakMilestone = async (streak) => {
  const m = MILESTONES[streak];
  if (!m) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: m.title,
      body:  m.body,
      data:  { type: 'streak-milestone', streak },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'sanl-main' } : {}),
    },
    trigger: null, // immediate
  });
};

// ── Night Shield reminder ─────────────────────────────────────────────────────
export const notifyNightShieldActive = async () => {
  const notificationsEnabled = await initNotifications();
  if (!notificationsEnabled) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌙 Night Shield Active',
      body:  "10PM–6AM: Protected apps are locked. Rest. You've got this.",
      data:  { type: 'night-shield' },
      sound: false,
      ...(Platform.OS === 'android'
        ? {
            channelId: 'sanl-night-note',
            priority: 'low',
            vibrationPattern: [],
          }
        : { interruptionLevel: 'passive' }),
    },
    trigger: null,
  });
};

// ── Daily check-in reminder at 8PM ───────────────────────────────────────────
export const scheduleCheckInReminder = async () => {
  // Cancel existing
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.type === 'checkin-reminder') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📅 Check In Today',
      body:  "Don't forget to mark today as clean. You're doing great.",
      data:  { type: 'checkin-reminder' },
      ...(Platform.OS === 'android' ? { channelId: 'sanl-main' } : {}),
    },
    trigger: {
      hour:    20,
      minute:  0,
      repeats: true,
    },
  });
};

// ── Cancel all notifications ──────────────────────────────────────────────────
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
