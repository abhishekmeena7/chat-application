// Configuration file for Chat App
// Modify these values to customize your chat application

export const CONFIG = {
  // Server Configuration
  SERVER: {
    URL: 'https://chatapp-1-lnt7.onrender.com',
    RECONNECT_DELAY: 1000,
    RECONNECT_DELAY_MAX: 5000,
    RECONNECT_ATTEMPTS: 5
  },

  // UI Configuration
  UI: {
    // Primary gradient colors
    PRIMARY_COLOR_1: '#667eea',
    PRIMARY_COLOR_2: '#764ba2',

    // Theme
    BACKGROUND_COLOR: '#f8f9fa',
    TEXT_COLOR: '#2c3e50',
    BORDER_COLOR: '#e0e0e0',
    LIGHT_TEXT: '#999',

    // Sidebar
    SIDEBAR_WIDTH: '250px',
    CONTACT_LIST_WIDTH: '320px',
    MEDIA_PANEL_WIDTH: '280px'
  },

  // Chat Configuration
  CHAT: {
    // Message settings
    MAX_MESSAGE_LENGTH: 1000,
    TYPING_TIMEOUT: 3000, // ms before typing indicator disappears

    // Pagination
    MESSAGES_PER_PAGE: 50,
    CONTACTS_PER_PAGE: 20,

    // Auto-scroll
    AUTO_SCROLL_TO_LATEST: true
  },

  // Default User Profile
  DEFAULT_USER: {
    ID: 'user_current',
    NAME: 'Mathew',
    ROLE: 'Designer',
    AVATAR: 'M'
  },

  // Sample Contacts
  SAMPLE_CONTACTS: [
    {
      id: 1,
      name: 'balvinder',
      label: 'test',
      avatar: 'B',
      isOnline: false
    },
    {
      id: 2,
      name: 'User A',
      label: 'friend',
      avatar: 'U',
      isOnline: true
    },
    // Add more sample contacts as needed
  ],

  // Time Format Settings
  TIME_FORMAT: {
    USE_24_HOUR: false, // Set to true for 24-hour format
    SHOW_DATE_SEPARATOR: true, // Show date between old and new messages
    SHOW_TIMESTAMP_EVERY_MESSAGE: false // Show time on every message
  },

  // Feature Flags
  FEATURES: {
    ENABLE_FILE_UPLOAD: true,
    ENABLE_VOICE_MESSAGES: false,
    ENABLE_VIDEO_CALLS: false,
    ENABLE_GROUP_CHATS: false,
    ENABLE_MESSAGE_SEARCH: true,
    ENABLE_MESSAGE_DELETE: true,
    ENABLE_MESSAGE_EDIT: false,
    ENABLE_TYPING_INDICATOR: true,
    ENABLE_READ_RECEIPTS: false,
    ENABLE_EMOJI_PICKER: false
  },

  // Animation Settings
  ANIMATIONS: {
    MESSAGE_SLIDE_DURATION: '0.3s',
    HOVER_TRANSITION: '0.3s',
    SMOOTH_SCROLL: true
  },

  // Notification Settings
  NOTIFICATIONS: {
    ENABLE_SOUND: false,
    ENABLE_DESKTOP: false,
    SOUND_FILE: '/notification.mp3'
  },

  // Storage Settings
  STORAGE: {
    USE_LOCAL_STORAGE: true,
    STORE_MESSAGES: true,
    STORE_CONTACTS: true,
    AUTO_SAVE_INTERVAL: 5000 // ms
  }
};

export default CONFIG;
