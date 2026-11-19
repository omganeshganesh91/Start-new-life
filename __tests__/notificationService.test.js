import * as Notifications from 'expo-notifications';
import {
  cancelMoonNote,
  notifyNightShieldActive,
  scheduleMoonNote,
} from '../src/services/NotificationService';

describe('Moon Note notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  });

  test('schedules a silent nightly reflection before quiet hours', async () => {
    await expect(scheduleMoonNote()).resolves.toBe(true);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: '🌙 Your Moon Note',
          sound: false,
          data: { type: 'moon-note' },
        }),
        trigger: { hour: 21, minute: 30, repeats: true },
      })
    );
  });

  test('does not schedule when notification permission is denied', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

    await expect(scheduleMoonNote()).resolves.toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('keeps the Night Shield alert quiet', async () => {
    await notifyNightShieldActive();

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          data: { type: 'night-shield' },
          sound: false,
          interruptionLevel: 'passive',
        }),
        trigger: null,
      })
    );
  });

  test('cancels only existing Moon Note reminders', async () => {
    Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'moon-note-id', content: { data: { type: 'moon-note' } } },
      { identifier: 'other-id', content: { data: { type: 'daily-motivation' } } },
    ]);

    await cancelMoonNote();

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('moon-note-id');
  });
});
