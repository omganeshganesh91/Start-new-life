// __mocks__/pushNotification.js
module.exports = {
  createChannel:               jest.fn(),
  configure:                   jest.fn(),
  localNotification:           jest.fn(),
  localNotificationSchedule:   jest.fn(),
  cancelLocalNotifications:    jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
};
