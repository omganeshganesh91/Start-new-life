// ─────────────────────────────────────────────────────────────────────────────
// __mocks__/ApiService.js — Jest mock for src/services/ApiService.js
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PLEDGES = [
  {
    id:          'mock_pledge_1',
    uid:         'anon_device_abc',
    displayName: 'BraveWarrior42',
    message:     'Day 1. I choose freedom.',
    streak:      1,
    hearts:      3,
    hearted:     false,
    createdAt:   new Date().toISOString(),
  },
  {
    id:          'mock_pledge_2',
    uid:         'anon_device_xyz',
    displayName: 'RisingPhoenix7',
    message:     'Every day clean is a day I chose myself.',
    streak:      7,
    hearts:      12,
    hearted:     true,
    createdAt:   new Date(Date.now() - 3600 * 1000).toISOString(),
  },
];

module.exports = {
  fetchPledges: jest.fn().mockResolvedValue(MOCK_PLEDGES),

  postPledge: jest.fn().mockImplementation(({ message, streak, displayName }) =>
    Promise.resolve({
      id:          'mock_new_pledge',
      uid:         'anon_test_device',
      displayName: displayName || 'TestWarrior',
      message,
      streak:      streak || 0,
      hearts:      0,
      hearted:     false,
      createdAt:   new Date().toISOString(),
    })
  ),

  toggleHeart: jest.fn().mockResolvedValue(true),

  deletePledge: jest.fn().mockResolvedValue(true),

  getAnonymousId: jest.fn().mockResolvedValue('anon_test_device'),
  getOrCreateAnonymousId: jest.fn().mockResolvedValue('anon_test_device'),
  generateAnonymousName: jest.fn().mockReturnValue('MockWarrior123'),

  subscribeToPledges: jest.fn().mockImplementation((onChange) => {
    onChange(MOCK_PLEDGES);
    return jest.fn(); // unsubscribe noop
  }),

  checkBackendHealth: jest.fn().mockResolvedValue(true),

  default: {
    get:    jest.fn().mockResolvedValue({ status: 'ok' }),
    post:   jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  },
};
