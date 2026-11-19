// __mocks__/expo-notifications.js — Mock for expo-notifications in Jest
module.exports = {
  setNotificationHandler:                    jest.fn(),
  getPermissionsAsync:                       jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync:                   jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationChannelAsync:               jest.fn().mockResolvedValue(null),
  scheduleNotificationAsync:                 jest.fn().mockResolvedValue('mock-notification-id'),
  cancelScheduledNotificationAsync:          jest.fn().mockResolvedValue(null),
  cancelAllScheduledNotificationsAsync:      jest.fn().mockResolvedValue(null),
  getAllScheduledNotificationsAsync:          jest.fn().mockResolvedValue([]),
  addNotificationReceivedListener:           jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener:   jest.fn().mockReturnValue({ remove: jest.fn() }),
  AndroidImportance: {
    LOW:     2,
    DEFAULT: 3,
    HIGH:    4,
    MAX:     5,
  },
};
